//! Backend API contribution for gateways that own a single Web Framework layer.

pub use sdkwork_web_bootstrap::ApiAssemblyContribution;

use std::sync::Arc;

use sdkwork_routes_messaging_backend_api::{
    gateway_route_manifest, gateway_mount, MessagingAdminStore, PostgresMessagingAdminStore,
};
use sdkwork_database_sqlx::DatabasePool;

/// Builds the unwrapped Messaging Backend API for a gateway that owns the
/// single Web Framework layer. The backing database pool is resolved from the
/// `SDKWORK_DATABASE_*`/`MESSAGING_*` environment contract.
pub async fn assemble_backend_api_contribution() -> Result<ApiAssemblyContribution, String> {
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
