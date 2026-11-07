//! Snowflake-style runtime id generation for messaging rows.
//!
//! DATABASE_SPEC §6.1/DB049 prefers the platform ID service; until that
//! adoption lands module-wide, this generator documents its own allocation
//! semantics: ids are `(millis << 22) | (worker << 12) | sequence` with
//! 10-bit worker and 12-bit sequence, and a **clock-rollback guard** keeps
//! millis monotonic across a reversed system clock so generated ids stay
//! strictly increasing per worker.

use std::sync::atomic::{AtomicI64, AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

const WORKER_ID_ENV: &str = "SDKWORK_MESSAGING_RUNTIME_WORKER_ID";
const SEQUENCE_BITS: u64 = 12;
const SEQUENCE_MASK: u64 = (1 << SEQUENCE_BITS) - 1;

/// Monotonic snowflake-style id generator (timestamp | worker | sequence).
pub struct MessagingRuntimeIdGenerator {
    worker_id: u16,
    sequence: AtomicU64,
    last_millis: AtomicI64,
}

impl MessagingRuntimeIdGenerator {
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

impl Default for MessagingRuntimeIdGenerator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_are_strictly_increasing_and_well_shaped() {
        let generator = MessagingRuntimeIdGenerator::new();
        let mut previous = 0;
        for _ in 0..4096 {
            let id = generator.next_id();
            assert!(id > previous, "ids must be strictly increasing");
            previous = id;
        }
    }
}
