//! HTTP-level regression for the send-rule configuration routes.
//!
//! This covers the wire contract the admin console uses: step fields include
//! account/credential visibility, the step-based update command parses, and an
//! enabled rule with no active step is rejected as a ProblemDetail.

use std::str::FromStr;
use std::sync::Arc;

use axum::body::{to_bytes, Body};
use axum::http::{header, Request, StatusCode};
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
        "sdkwork_messaging_rules_http_{}_{}",
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
        request_id: ServerRequestId("rules-http-request".to_owned()),
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
) -> (StatusCode, serde_json::Value, axum::http::HeaderMap) {
    let mut builder = Request::builder()
        .uri(path)
        .method(method)
        .header(header::CONTENT_TYPE, "application/json");
    if method != "GET" {
        builder = builder.header("Idempotency-Key", "rules-http-key-0001");
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
    let headers = response.headers().clone();
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    let value = serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null);
    (status, value, headers)
}

#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn send_rule_routes_expose_operational_step_state_and_validate_chains() {
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
    let subject = subject();
    store
        .initialize_email_provider(&subject, "enterprise_mail")
        .await
        .expect("initialize enterprise mailbox");
    let router = admin_messaging_router_with_store(store.clone());

    let (status, body, _) = call(
        router.clone(),
        "GET",
        "/backend/v3/api/messaging/email/send_rules",
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["code"], 0);
    let items = body["data"]["items"].as_array().expect("rule items");
    assert_eq!(items.len(), 4);
    let default_rule = items
        .iter()
        .find(|item| item["scenario"] == "default")
        .expect("default rule");
    let step = &default_rule["chain"][0];
    assert_eq!(step["accountEnabled"], true);
    assert_eq!(step["hasSecret"], false);
    assert_eq!(step["identityEnabled"], true);
    assert_eq!(step["stepEnabled"], true);
    let sender_id = step["senderId"].as_str().expect("sender id").to_owned();
    let version = default_rule["version"]
        .as_str()
        .expect("version")
        .to_owned();

    let (status, body, _) = call(
        router.clone(),
        "PUT",
        "/backend/v3/api/messaging/email/send_rules/default",
        Some(serde_json::json!({
            "steps": [{ "senderId": sender_id, "enabled": false }],
            "enabled": false,
            "expectedVersion": version,
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["code"], 0);
    assert_eq!(body["data"]["item"]["enabled"], false);
    assert_eq!(body["data"]["item"]["chain"][0]["stepEnabled"], false);

    // The version advanced by the previous update; reload it.
    let (_, body, _) = call(
        router.clone(),
        "GET",
        "/backend/v3/api/messaging/email/send_rules",
        None,
    )
    .await;
    let default_rule = body["data"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|item| item["scenario"] == "default")
        .unwrap();
    let version = default_rule["version"].as_str().unwrap().to_owned();

    // Enabling a rule whose only step is disabled must fail with ProblemDetail.
    let (status, body, headers) = call(
        router.clone(),
        "PUT",
        "/backend/v3/api/messaging/email/send_rules/default",
        Some(serde_json::json!({
            "steps": [{ "senderId": sender_id, "enabled": false }],
            "enabled": true,
            "expectedVersion": version,
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(
        headers.get(header::CONTENT_TYPE).unwrap(),
        "application/problem+json"
    );
    assert_eq!(body["code"], 40003);

    pool.close().await;
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!("DROP SCHEMA {schema} CASCADE")))
        .execute(&mut admin)
        .await
        .expect("drop throwaway schema");
}
