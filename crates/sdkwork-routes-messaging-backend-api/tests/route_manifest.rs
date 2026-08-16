use sdkwork_routes_messaging_backend_api::{
    gateway_route_manifest, route_definitions,
};
use sdkwork_web_contract::HttpMethod;
use sdkwork_web_core::RouteAuth;

#[test]
fn route_manifest_declares_messaging_backend_routes() {
    let manifest = gateway_route_manifest();
    let routes = route_definitions();

    assert_eq!(manifest.routes().len(), routes.len());
    assert_eq!(routes.len(), 17);

    for route in routes {
        assert_eq!(route.auth, RouteAuth::DualToken, "{} must require dual-token auth", route.operation_id);
        assert!(
            route.path.starts_with("/backend/v3/api/messaging/"),
            "{} must live under the messaging backend prefix",
            route.path
        );
        assert!(
            route.required_permission.is_some(),
            "{} must declare a required permission",
            route.operation_id
        );
        if matches!(route.method, HttpMethod::Post | HttpMethod::Put | HttpMethod::Delete) {
            assert!(route.idempotent, "{} must be idempotent", route.operation_id);
        }
    }

    let operation_ids: Vec<&str> = routes.iter().map(|route| route.operation_id).collect();
    for expected in [
        "messaging.notifications.list",
        "messaging.notifications.create",
        "messaging.announcements.list",
        "messaging.announcements.publish",
        "messaging.pushMessages.list",
        "messaging.pushMessages.send",
        "messaging.outboundMessages.list",
        "messaging.outboundMessages.send",
        "messaging.verificationPolicies.list",
        "messaging.verificationPolicies.update",
        "messaging.channels.retrieve",
        "messaging.channels.update",
        "messaging.templates.list",
        "messaging.templates.create",
        "messaging.templates.retrieve",
        "messaging.templates.update",
        "messaging.templates.delete",
    ] {
        assert!(
            operation_ids.contains(&expected),
            "manifest must contain `{expected}`"
        );
    }
}

#[test]
fn route_manifest_validates_auth_for_backend_surface() {
    let manifest = gateway_route_manifest();
    manifest
        .validate_route_auth_for_surfaces(&sdkwork_web_core::WebRequestContextProfile::default())
        .expect("messaging backend routes must pass surface auth validation");
}
