//! HTTP-level regression for template provider binding routes.

use std::str::FromStr;
use std::sync::Arc;

use axum::body::{to_bytes, Body};
use axum::http::{header, Request, StatusCode};
use sdkwork_routes_messaging_backend_api::ports::CreateTemplateCommand;
use sdkwork_routes_messaging_backend_api::{
    admin_messaging_router_with_store, MessagingAdminStore, MessagingAdminSubject,
    PostgresMessagingAdminStore,
};
use sdkwork_web_core::{
    ServerRequestId, WebApiSurface, WebAuthMode, WebRequestContext, WebRequestPrincipal,
    WebTransportFacts,
};
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::{Connection, PgConnection};
use tower::ServiceExt;

const BASELINE_DDL: &str =
    include_str!("../../../database/ddl/baseline/postgres/0001_messaging_baseline.sql");

fn database_url() -> String {
    std::env::var("SDKWORK_MESSAGING_TEST_DATABASE_URL").unwrap_or_else(|_| {
        "postgres://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev".to_owned()
    })
}

fn unique_schema() -> String {
    format!(
        "sdkwork_messaging_template_provider_http_{}_{}",
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default(),
        std::process::id(),
    )
}

fn subject() -> MessagingAdminSubject {
    MessagingAdminSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: Some(9001),
    }
}

fn request_context(path: &str, method: &str) -> WebRequestContext {
    let principal = WebRequestPrincipal::builder()
        .tenant_id("100001")
        .organization_id(Some("0".to_owned()))
        .user_id("9001")
        .app_id("cloud-router")
        .build();
    WebRequestContext {
        request_id: ServerRequestId("template-provider-http".to_owned()),
        api_surface: WebApiSurface::BackendApi,
        auth_mode: WebAuthMode::DualToken,
        transport: WebTransportFacts {
            path: path.to_owned(),
            method: method.to_owned(),
            auth_token_present: true,
            access_token_present: true,
            api_key_present: false,
            ingress_token_present: false,
            oauth_bearer_present: false,
            agent_token_present: false,
        },
        principal: Some(principal),
        locale: None,
        client_kind: None,
        operation: None,
        trace_id: None,
        idempotency_key: None,
    }
}

async fn call(
    router: axum::Router,
    method: &str,
    path: &str,
    body: Option<serde_json::Value>,
) -> (StatusCode, serde_json::Value) {
    let mut builder = Request::builder()
        .uri(path)
        .method(method)
        .header(header::CONTENT_TYPE, "application/json");
    if method != "GET" {
        builder = builder.header("Idempotency-Key", "tpl-provider-http-key-1");
    }
    let body = body
        .map(|value| Body::from(value.to_string()))
        .unwrap_or_else(Body::empty);
    let mut request = builder.body(body).expect("build request");
    request
        .extensions_mut()
        .insert(request_context(path, method));
    let response = router.oneshot(request).await.expect("route response");
    let status = response.status();
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    (
        status,
        serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null),
    )
}

#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn template_provider_routes_sync_and_update_bindings() {
    let database_url = database_url();
    let mut admin = PgConnection::connect(&database_url)
        .await
        .expect("connect integration database");
    let schema = unique_schema();
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!("CREATE SCHEMA {schema}")))
        .execute(&mut admin)
        .await
        .expect("create throwaway schema");
    let options = PgConnectOptions::from_str(&database_url)
        .expect("parse database URL")
        .options([("search_path", schema.as_str())]);
    let pool = PgPoolOptions::new()
        .max_connections(4)
        .connect_with(options)
        .await
        .expect("connect schema");
    sqlx::raw_sql(BASELINE_DDL)
        .execute(&pool)
        .await
        .expect("apply baseline");
    let store = Arc::new(PostgresMessagingAdminStore::new(pool.clone()));
    let template = store
        .create_template(
            &subject(),
            &CreateTemplateCommand {
                channel: "sms".to_owned(),
                template_code: "order_paid".to_owned(),
                name: "Order paid".to_owned(),
                subject: None,
                content: "Order {{orderId}} paid.".to_owned(),
                variables: None,
                approval_status: Some("pending".to_owned()),
                approval_note: None,
                status: Some("active".to_owned()),
            },
            "tpl-provider-http-create",
        )
        .await
        .expect("create template");
    let router = admin_messaging_router_with_store(store);

    let (status, body) = call(
        router.clone(),
        "GET",
        &format!(
            "/backend/v3/api/messaging/templates/{}/providers",
            template.id
        ),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["code"], 0);
    assert_eq!(body["data"]["items"].as_array().unwrap().len(), 0);

    let (status, body) = call(
        router.clone(),
        "POST",
        &format!(
            "/backend/v3/api/messaging/templates/{}/providers/sync",
            template.id
        ),
        Some(serde_json::json!({})),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body:?}");
    assert_eq!(body["code"], 0);
    assert_eq!(body["data"]["item"]["pendingApproval"], 8);
    assert_eq!(body["data"]["item"]["items"].as_array().unwrap().len(), 8);

    let (status, body) = call(
        router.clone(),
        "PUT",
        &format!(
            "/backend/v3/api/messaging/templates/{}/providers/tencent",
            template.id
        ),
        Some(serde_json::json!({ "providerTemplateId": "1234567" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body:?}");
    assert_eq!(body["data"]["item"]["provider"], "tencent");
    assert_eq!(body["data"]["item"]["providerTemplateId"], "1234567");
    assert_eq!(body["data"]["item"]["syncStatus"], "synced");

    let (status, body) = call(
        router.clone(),
        "GET",
        &format!(
            "/backend/v3/api/messaging/templates/{}/providers",
            template.id
        ),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["data"]["items"].as_array().unwrap().len(), 8);
    assert_eq!(body["data"]["items"][0]["provider"], "tencent");

    pool.close().await;
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!("DROP SCHEMA {schema} CASCADE")))
        .execute(&mut admin)
        .await
        .expect("drop throwaway schema");
}
