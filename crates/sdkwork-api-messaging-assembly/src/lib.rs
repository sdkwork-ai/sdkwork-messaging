//! Application API assembly for sdkwork-messaging.
//! Application bootstrap lives in `bootstrap.rs`; route inventory is in `assembly-manifest.json`.
// SDKWORK-ASSEMBLY-LIB-CUSTOM

mod bootstrap;
mod contribution;
mod generated;

pub use bootstrap::{assemble_api_router, ApiAssembly, assemble_business_routes, web_module};
pub use contribution::assemble_backend_api_contribution;

/// Runs messaging-owned database lifecycle before dependent assemblies load.
pub async fn bootstrap_database_from_env() -> Result<(), String> {
    sdkwork_messaging_database_host::bootstrap_messaging_database_from_env()
        .await
        .map(|_| ())
}

pub fn assembly_route_count() -> usize {
    generated::ROUTE_CRATE_COUNT
}