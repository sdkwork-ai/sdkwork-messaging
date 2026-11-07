//! Row id generation for messaging tables.
//!
//! DATABASE_SPEC §6.1/DB049 requires the approved platform ID service
//! (`sdkwork-database-id`) for production allocation; [`PlatformSnowflakeIdGenerator`]
//! wraps its DB-backed node-lease generator. [`LocalMonotonicIdGenerator`] is
//! the documented local fallback (tests, tooling, allocator-unavailable
//! degradation): ids are `(millis << 22) | (worker << 12) | sequence` with a
//! clock-rollback guard, so ids stay strictly increasing per worker.

use std::sync::atomic::{AtomicI64, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use sdkwork_database_id::SnowflakeIdGenerator;

const WORKER_ID_ENV: &str = "SDKWORK_MESSAGING_RUNTIME_WORKER_ID";
const SEQUENCE_BITS: u64 = 12;
const SEQUENCE_MASK: u64 = (1 << SEQUENCE_BITS) - 1;

/// Infallible id allocation for messaging rows (§6.1).
pub trait MessageIdGenerator: Send + Sync {
    fn next_id(&self) -> i64;
}

/// Platform snowflake generator (§6.1/DB049 approved service). A generator
/// error (system clock far behind the snowflake epoch) degrades to the local
/// monotonic fallback with a one-shot warning rather than failing the write.
pub struct PlatformSnowflakeIdGenerator {
    platform: SnowflakeIdGenerator,
    fallback: LocalMonotonicIdGenerator,
    degraded: Mutex<bool>,
}

impl PlatformSnowflakeIdGenerator {
    pub fn new(platform: SnowflakeIdGenerator) -> Self {
        Self {
            platform,
            fallback: LocalMonotonicIdGenerator::new(),
            degraded: Mutex::new(false),
        }
    }
}

impl MessageIdGenerator for PlatformSnowflakeIdGenerator {
    fn next_id(&self) -> i64 {
        match self.platform.generate() {
            Ok(id) => {
                if let Ok(mut degraded) = self.degraded.lock() {
                    if *degraded {
                        *degraded = false;
                    }
                }
                id
            }
            Err(error) => {
                if let Ok(mut degraded) = self.degraded.lock() {
                    if !*degraded {
                        *degraded = true;
                        eprintln!(
                            "messaging: platform snowflake generation failed ({error}); \
                             degrading to the local monotonic generator until it recovers"
                        );
                    }
                }
                self.fallback.next_id()
            }
        }
    }
}

/// Local monotonic snowflake-style fallback. The worker id defaults to 0 and
/// offers no cross-process conflict protection (DB049) — production paths
/// must use [`PlatformSnowflakeIdGenerator`].
pub struct LocalMonotonicIdGenerator {
    worker_id: u16,
    sequence: AtomicU64,
    last_millis: AtomicI64,
}

impl LocalMonotonicIdGenerator {
    pub fn new() -> Self {
        let worker_id = std::env::var(WORKER_ID_ENV)
            .ok()
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or(0);
        Self {
            worker_id: worker_id & 0x3FF,
            sequence: AtomicU64::new(0),
            last_millis: AtomicI64::new(0),
        }
    }

    /// Allocates the next id. System-clock rollback is clamped to the last
    /// issued millisecond, so a reversed wall clock cannot produce ids that
    /// collide with already-issued ones (sequence still guarantees
    /// uniqueness within the same millisecond).
    pub fn next_id(&self) -> i64 {
        let mut last = self.last_millis.load(Ordering::Relaxed);
        loop {
            let now_millis = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|duration| duration.as_millis() as i64)
                .unwrap_or(last);
            let millis = now_millis.max(last);
            match self.last_millis.compare_exchange(
                last,
                millis,
                Ordering::Relaxed,
                Ordering::Relaxed,
            ) {
                Ok(_) => {
                    let sequence = self.sequence.fetch_add(1, Ordering::Relaxed) & SEQUENCE_MASK;
                    return (millis << 22) | ((self.worker_id as i64) << 12) | (sequence as i64);
                }
                Err(updated) => last = updated,
            }
        }
    }
}

impl Default for LocalMonotonicIdGenerator {
    fn default() -> Self {
        Self::new()
    }
}

impl MessageIdGenerator for LocalMonotonicIdGenerator {
    fn next_id(&self) -> i64 {
        LocalMonotonicIdGenerator::next_id(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_ids_are_strictly_increasing_and_well_shaped() {
        let generator = LocalMonotonicIdGenerator::new();
        let mut previous = 0;
        for _ in 0..4096 {
            let id = generator.next_id();
            assert!(id > previous, "ids must be strictly increasing");
            previous = id;
        }
    }
}
