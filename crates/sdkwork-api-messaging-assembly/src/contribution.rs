//! Backend API contribution for gateways that own a single Web Framework layer.

pub use sdkwork_web_bootstrap::ApiAssemblyContribution;

use std::sync::Arc;

use sdkwork_database_sqlx::DatabasePool;
use sdkwork_routes_messaging_backend_api::{
    gateway_mount, gateway_route_manifest, MessageIdGenerator, MessagingAdminStore,
};

/// Allocates the process-shared platform snowflake generator (§6.1/DB049)
/// and falls back to the documented local generator when the node registry
/// is unavailable, so bootstrapping never hard-fails on ID infrastructure.
async fn allocate_admin_store(
    pool: DatabasePool,
) -> Result<Arc<dyn MessagingAdminStore + Send + Sync>, String> {
    // PostgreSQL-only by DATABASE_SPEC (authoritative-server persistence);
    // a sqlite-enabled build of this workspace fails to compile here by design.
    let DatabasePool::Postgres(pool, context) = pool;

    let wrapped_pool = DatabasePool::Postgres(pool.clone(), context.clone());
    let generator: Arc<dyn MessageIdGenerator> =
        match sdkwork_database_id::SnowflakeNodeAllocator::allocate_process_generator(
            &wrapped_pool,
            &sdkwork_database_id::NodeAllocatorConfig::from_service_name("messaging"),
        )
        .await
        {
            Ok((generator, _lease)) => Arc::new(
                sdkwork_routes_messaging_backend_api::PlatformSnowflakeIdGenerator::new(generator),
            ),
            Err(error) => {
                eprintln!(
                    "messaging: platform ID node allocation unavailable ({error}); \
                     using the local monotonic generator fallback"
                );
                Arc::new(sdkwork_routes_messaging_backend_api::LocalMonotonicIdGenerator::new())
            }
        };

    Ok(Arc::new(
        sdkwork_routes_messaging_backend_api::PostgresMessagingAdminStore::with_id_generator(
            pool.clone(),
            generator,
        ),
    ))
}

/// Builds the unwrapped Messaging Backend API for a gateway that owns the
/// single Web Framework layer. The backing database pool is resolved from the
/// `SDKWORK_DATABASE_*`/`MESSAGING_*` environment contract.
pub async fn assemble_backend_api_contribution() -> Result<ApiAssemblyContribution, String> {
    let host = sdkwork_messaging_database_host::bootstrap_messaging_database_from_env()
        .await
        .map_err(|error| format!("bootstrap messaging database failed: {error}"))?;
    let pool = host.pool();

    let admin_store = allocate_admin_store(pool.clone()).await?;
    let router = gateway_mount(admin_store);
    let route_manifest = gateway_route_manifest();
    ApiAssemblyContribution::from_manifest(
        "sdkwork-messaging",
        "SDKWork Messaging Backend API",
        router,
        route_manifest,
        Vec::new(),
        crate::bootstrap::readiness_check(pool),
    )
}
