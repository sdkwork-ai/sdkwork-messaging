//! Application API assembly bootstrap for sdkwork-messaging.

use std::sync::Arc;

use sdkwork_database_sqlx::DatabasePool;
use sdkwork_routes_messaging_backend_api::{
    gateway_mount, gateway_route_manifest, wrap_router_with_web_framework_from_env,
    MessageIdGenerator, MessagingAdminStore,
};
use sdkwork_web_bootstrap::{
    ApiAssemblyContribution, PgPoolReadinessCheck, ReadinessCheck, WebModule,
};
use sdkwork_web_core::HttpRouteManifest;

/// Indivisible host-neutral API assembly contribution (web-bootstrap contract,
/// API_ASSEMBLY_SPEC.md section 4).
pub type ApiAssembly = ApiAssemblyContribution;

pub(crate) fn readiness_check(pool: &DatabasePool) -> Arc<dyn ReadinessCheck> {
    // PostgreSQL-only by DATABASE_SPEC; see allocate_admin_store.
    let DatabasePool::Postgres(pool, _) = pool;
    Arc::new(PgPoolReadinessCheck::new(pool.clone()))
}

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

pub async fn assemble_business_routes() -> Result<ApiAssembly, String> {
    let host = sdkwork_messaging_database_host::bootstrap_messaging_database_from_env()
        .await
        .map_err(|error| format!("bootstrap messaging database failed: {error}"))?;
    let pool = host.pool();

    let admin_store = allocate_admin_store(pool.clone()).await?;

    let router = wrap_router_with_web_framework_from_env(gateway_mount(admin_store)).await;
    let routes = gateway_route_manifest().routes().to_vec();

    ApiAssemblyContribution::from_manifest(
        "sdkwork-messaging",
        "SDKWork Messaging API",
        router,
        HttpRouteManifest::from_owned_routes(routes),
        Vec::new(),
        readiness_check(pool),
    )
}

pub async fn assemble_api_router() -> Result<ApiAssembly, String> {
    assemble_business_routes().await
}

/// Canonical Web Module definition for this application
/// (API_ASSEMBLY_SPEC §4.1.1): the complete HTTP surface — every route,
/// manifest, and OpenAPI document of this owner — as one installable module.
pub async fn web_module() -> Result<WebModule, String> {
    Ok(WebModule::from_contribution(assemble_api_router().await?))
}
