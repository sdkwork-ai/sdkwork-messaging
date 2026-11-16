//! HTTP-level regression for the notification record/dashboard routes.
//!
//! Store-level tests cannot catch route-path, query-extractor, envelope, or
//! middleware-context mistakes, so this test drives the real axum router with a
//! real PostgreSQL store.

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
        "sdkwork_messaging_http_{}_{}",
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

fn request_context(path: &str) -> WebRequestContext {
    let principal = WebRequestPrincipal::builder()
        .tenant_id("100001")
        .organization_id(Some("0".to_owned()))
        .user_id("9001")
        .app_id("cloud-router")
        .build();
    WebRequestContext {
        request_id: ServerRequestId("http-regression-request".to_owned()),
        api_surface: WebApiSurface::BackendApi,
        auth_mode: WebAuthMode::DualToken,
        transport: WebTransportFacts {
            path: path.to_owned(),
            method: "GET".to_owned(),
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

async fn get_json(
    router: axum::Router,
    path: &str,
) -> (StatusCode, serde_json::Value, axum::http::HeaderMap) {
    let mut request = Request::builder()
        .uri(path)
        .method("GET")
        .body(Body::empty())
        .expect("build request");
    request.extensions_mut().insert(request_context(path));
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
async fn send_record_and_dashboard_routes_return_the_contract_envelope() {
    use sdkwork_routes_messaging_backend_api::ports::SendOutboundMessageCommand;

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
    let now = chrono::Utc::now();

    let email = store
        .send_outbound_message(
            &subject,
            &SendOutboundMessageCommand {
                channel: "email".to_owned(),
                target: "user@example.com".to_owned(),
                subject: Some("Verification code".to_owned()),
                body: "<p>Your code is 123456</p>".to_owned(),
                payload: None,
                scenario: Some("verification_code".to_owned()),
                template_code: Some("verification_code".to_owned()),
            },
            "http-email-1",
        )
        .await
        .expect("create email record");
    let sms = store
        .send_outbound_message(
            &subject,
            &SendOutboundMessageCommand {
                channel: "sms".to_owned(),
                target: "+8613800000000".to_owned(),
                subject: None,
                body: "Campaign".to_owned(),
                payload: None,
                scenario: Some("marketing".to_owned()),
                template_code: None,
            },
            "http-sms-1",
        )
        .await
        .expect("create sms record");
    sqlx::query(
        "INSERT INTO messaging_outbound_delivery \
         (id, uuid, tenant_id, organization_id, outbound_message_id, channel, provider, \
          provider_message_id, status, sent_at, delivered_at, created_at) \
         VALUES (920000000001, 'http-delivery-email', $1, $2, $3, 'email', 'enterprise_mail', \
                 'exmail-http', 'delivered', $4, $4, $4)",
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(email.id.parse::<i64>().unwrap())
    .bind(now - chrono::Duration::minutes(2))
    .execute(&pool)
    .await
    .expect("insert email attempt");
    sqlx::query(
        "INSERT INTO messaging_outbound_delivery \
         (id, uuid, tenant_id, organization_id, outbound_message_id, channel, provider, \
          status, error_code, error_message, failed_at, created_at) \
         VALUES (920000000002, 'http-delivery-sms', $1, $2, $3, 'sms', 'tencent', \
                 'failed', 'SMS_1001', 'template not approved', $4, $4)",
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(sms.id.parse::<i64>().unwrap())
    .bind(now - chrono::Duration::minutes(1))
    .execute(&pool)
    .await
    .expect("insert sms attempt");
    sqlx::query("UPDATE messaging_outbound_message SET status = 'delivered' WHERE id = $1")
        .bind(email.id.parse::<i64>().unwrap())
        .execute(&pool)
        .await
        .expect("advance email status");
    sqlx::query("UPDATE messaging_outbound_message SET status = 'failed' WHERE id = $1")
        .bind(sms.id.parse::<i64>().unwrap())
        .execute(&pool)
        .await
        .expect("advance sms status");

    let router = admin_messaging_router_with_store(store.clone());

    let (status, body, _headers) = get_json(
        router.clone(),
        "/backend/v3/api/messaging/email/send_records?status=delivered&page=1&page_size=20",
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["code"], 0);
    assert!(body["traceId"].is_string());
    assert_eq!(body["data"]["items"][0]["provider"], "enterprise_mail");
    assert_eq!(body["data"]["items"][0]["scenario"], "verification_code");
    assert_eq!(
        body["data"]["items"][0]["bodyPreview"],
        "Your code is 123456"
    );
    assert_eq!(body["data"]["pageInfo"]["totalItems"], "1");

    let (status, body, _) = get_json(
        router.clone(),
        &format!("/backend/v3/api/messaging/email/send_records/{}", email.id),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["code"], 0);
    assert_eq!(body["data"]["item"]["id"], email.id);
    assert_eq!(
        body["data"]["item"]["attempts"][0]["provider"],
        "enterprise_mail"
    );
    assert_eq!(body["data"]["item"]["body"], "<p>Your code is 123456</p>");
    assert_eq!(body["data"]["item"]["bodyText"], "Your code is 123456");

    let (status, body, _) = get_json(
        router.clone(),
        "/backend/v3/api/messaging/sms/send_records?status=failed",
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["data"]["items"][0]["provider"], "tencent");
    assert_eq!(body["data"]["items"][0]["errorCode"], "SMS_1001");

    let (status, body, _headers) = get_json(
        router.clone(),
        "/backend/v3/api/messaging/dashboard?range=7",
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["code"], 0);
    assert_eq!(body["data"]["item"]["rangeDays"], 7);
    assert_eq!(body["data"]["item"]["totals"]["total"], 2);
    assert_eq!(body["data"]["item"]["totals"]["delivered"], 1);
    assert_eq!(body["data"]["item"]["totals"]["failed"], 1);
    assert_eq!(body["data"]["item"]["trend"].as_array().unwrap().len(), 7);

    let (status, body, headers) = get_json(
        router.clone(),
        "/backend/v3/api/messaging/email/send_records?from=not-a-date",
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(
        headers.get(header::CONTENT_TYPE).unwrap(),
        "application/problem+json"
    );
    assert_eq!(body["code"], 40003);

    let (status, body, headers) = get_json(
        router.clone(),
        "/backend/v3/api/messaging/dashboard?range=0",
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(
        headers.get(header::CONTENT_TYPE).unwrap(),
        "application/problem+json"
    );
    assert_eq!(body["code"], 40003);

    let (status, body, _) = get_json(
        router.clone(),
        "/backend/v3/api/messaging/sms/send_records?status=bogus",
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["code"], 40003);

    let (status, body, headers) = get_json(
        router.clone(),
        "/backend/v3/api/messaging/email/send_records?page=abc",
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(
        headers.get(header::CONTENT_TYPE).unwrap(),
        "application/problem+json"
    );
    assert_eq!(body["code"], 40003);

    let (status, body, _) = get_json(
        router.clone(),
        "/backend/v3/api/messaging/dashboard?range=abc",
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["code"], 40003);

    let (status, _, _) = get_json(
        router.clone(),
        &format!("/backend/v3/api/messaging/sms/send_records/{}", email.id),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    // Missing authenticated context is a ProblemDetail response, not a bare
    // JSON error.
    let request = Request::builder()
        .uri("/backend/v3/api/messaging/email/send_records")
        .method("GET")
        .body(Body::empty())
        .expect("build unauthenticated request");
    let response = router
        .clone()
        .oneshot(request)
        .await
        .expect("unauthenticated response");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(
        response.headers().get(header::CONTENT_TYPE).unwrap(),
        "application/problem+json"
    );

    pool.close().await;
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!("DROP SCHEMA {schema} CASCADE")))
        .execute(&mut admin)
        .await
        .expect("drop throwaway schema");
}
