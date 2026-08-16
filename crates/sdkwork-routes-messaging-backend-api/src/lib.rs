//! Route crate for messaging backend API (`sdkwork-routes-messaging-backend-api`).

pub mod application;
pub mod http_route_manifest;
pub mod infrastructure;
pub mod paths;
pub mod ports;
pub mod routes;
pub mod web_bootstrap;

pub use http_route_manifest::{backend_route_manifest, route_definitions};
pub use infrastructure::postgres::admin_store::{
    MessagingRuntimeIdGenerator, PostgresMessagingAdminStore,
};
pub use ports::{MessagingAdminStore, MessagingAdminSubject, StoreError};
pub use routes::admin_messaging_router_with_store;
pub use web_bootstrap::{
    messaging_backend_api_prefixes, messaging_backend_api_public_path_prefixes,
    wrap_router_with_web_framework, wrap_router_with_web_framework_from_env,
};

use std::sync::Arc;

use sdkwork_web_core::HttpRouteManifest;

pub fn gateway_route_manifest() -> HttpRouteManifest {
    backend_route_manifest()
}

pub fn gateway_mount(store: Arc<dyn MessagingAdminStore + Send + Sync>) -> axum::Router {
    admin_messaging_router_with_store(store)
}
