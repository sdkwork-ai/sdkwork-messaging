//! Application API assembly bootstrap for sdkwork-messaging.

use std::sync::Arc;

use sdkwork_database_sqlx::DatabasePool;
use sdkwork_routes_messaging_backend_api::{
    gateway_route_manifest, gateway_mount, wrap_router_with_web_framework_from_env,
    MessagingAdminStore, PostgresMessagingAdminStore,
};
use sdkwork_web_bootstrap::{ApiAssemblyContribution, PgPoolReadinessCheck, ReadinessCheck, WebModule};
use sdkwork_web_core::HttpRouteManifest;

/// Indivisible host-neutral API assembly contribution (web-bootstrap contract,
/// API_ASSEMBLY_SPEC.md section 4).
pub type ApiAssembly = ApiAssemblyContribution;

pub(crate) fn readiness_check(pool: &DatabasePool) -> Arc<dyn ReadinessCheck> {
    match pool {
        DatabasePool::Postgres(pool, _) => Arc::new(PgPoolReadinessCheck::new(pool.clone())),
        _ => unreachable!(
            "messaging server assembly requires a PostgreSQL pool (DATABASE_SPEC: authoritative-server persistence is PostgreSQL only)"
        ),
    }
}

pub async fn assemble_business_routes() -> Result<ApiAssembly, String> {
    let host = sdkwork_messaging_database_host::bootstrap_messaging_database_from_env()
        .await
        .map_err(|error| format!("bootstrap messaging database failed: {error}"))?;
    let pool = host.pool();

    let admin_store: Arc<dyn MessagingAdminStore + Send + Sync> = match pool {
        DatabasePool::Postgres(pool, _) => Arc::new(PostgresMessagingAdminStore::new(pool.clone())),
        _ => unreachable!(
            "messaging server assembly requires a PostgreSQL pool (DATABASE_SPEC: authoritative-server persistence is PostgreSQL only)"
        ),
    };

    let router = wrap_router_with_web_framework_from_env(gateway_mount(admin_store)).await;
    let routes = gateway_route_manifest()
        .routes()
        .to_vec();

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
