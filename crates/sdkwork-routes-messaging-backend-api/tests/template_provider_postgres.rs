//! Real-PostgreSQL regression for template -> provider bindings and send-time
//! provider template resolution.

use std::str::FromStr;

use sdkwork_routes_messaging_backend_api::ports::{
    CreateTemplateCommand, SendOutboundMessageCommand, SyncTemplateProvidersCommand,
    UpdateTemplateProviderCommand,
};
use sdkwork_routes_messaging_backend_api::{
    MessagingAdminStore, MessagingAdminSubject, PostgresMessagingAdminStore, StoreError,
};
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::{Connection, PgConnection};

const BASELINE_DDL: &str =
    include_str!("../../../database/ddl/baseline/postgres/0001_messaging_baseline.sql");

fn database_url() -> String {
    std::env::var("SDKWORK_MESSAGING_TEST_DATABASE_URL").unwrap_or_else(|_| {
        "postgres://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev".to_owned()
    })
}

fn unique_schema() -> String {
    format!(
        "sdkwork_messaging_template_provider_{}_{}",
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

#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn template_provider_bindings_sync_and_resolve_for_the_selected_provider() {
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
    let store = PostgresMessagingAdminStore::new(pool.clone());
    let subject = subject();

    let email = store
        .create_template(
            &subject,
            &CreateTemplateCommand {
                channel: "email".to_owned(),
                template_code: "order_paid".to_owned(),
                name: "Order paid".to_owned(),
                subject: Some("Order {{orderId}} paid".to_owned()),
                content: "<p>Order {{orderId}} paid.</p>".to_owned(),
                variables: None,
                approval_status: None,
                approval_note: None,
                status: Some("active".to_owned()),
            },
            "tpl-email-1",
        )
        .await
        .expect("create email template");
    let email_sync = store
        .sync_template_providers(
            &subject,
            email.id.parse::<i64>().unwrap(),
            &SyncTemplateProvidersCommand::default(),
            "tpl-email-sync-1",
        )
        .await
        .expect("sync email providers");
    assert_eq!(email_sync.items.len(), 13);
    assert_eq!(email_sync.pending_approval, 0);
    assert_eq!(email_sync.synced, 13);
    assert_eq!(email_sync.items[0].provider, "enterprise_mail");
    let email_ids: std::collections::BTreeSet<_> = email_sync
        .items
        .iter()
        .map(|item| item.provider_template_id.clone().unwrap_or_default())
        .collect();
    assert_eq!(
        email_ids.len(),
        13,
        "each email provider gets its own reference"
    );
    assert!(email_sync
        .items
        .iter()
        .all(|item| item.sync_status == "synced"));

    // Repeating the sync must not overwrite an operator-entered id.
    store
        .update_template_provider(
            &subject,
            email.id.parse::<i64>().unwrap(),
            "gmail",
            &UpdateTemplateProviderCommand {
                provider_template_id: Some("gmail-prod-template".to_owned()),
                provider_template_name: None,
                sync_status: None,
            },
            "tpl-email-update-1",
        )
        .await
        .expect("record gmail id");
    let resynced = store
        .sync_template_providers(
            &subject,
            email.id.parse::<i64>().unwrap(),
            &SyncTemplateProvidersCommand::default(),
            "tpl-email-sync-2",
        )
        .await
        .expect("resync email providers");
    let gmail = resynced
        .items
        .iter()
        .find(|item| item.provider == "gmail")
        .expect("gmail binding");
    assert_eq!(
        gmail.provider_template_id.as_deref(),
        Some("gmail-prod-template")
    );

    let sms = store
        .create_template(
            &subject,
            &CreateTemplateCommand {
                channel: "sms".to_owned(),
                template_code: "order_paid".to_owned(),
                name: "Order paid SMS".to_owned(),
                subject: None,
                content: "Order {{orderId}} paid.".to_owned(),
                variables: None,
                approval_status: Some("pending".to_owned()),
                approval_note: None,
                status: Some("active".to_owned()),
            },
            "tpl-sms-1",
        )
        .await
        .expect("create sms template");
    let sms_sync = store
        .sync_template_providers(
            &subject,
            sms.id.parse::<i64>().unwrap(),
            &SyncTemplateProvidersCommand::default(),
            "tpl-sms-sync-1",
        )
        .await
        .expect("sync sms providers");
    assert_eq!(sms_sync.items.len(), 8);
    assert_eq!(sms_sync.pending_approval, 8);
    assert!(sms_sync
        .items
        .iter()
        .all(|item| item.sync_status == "pending_approval" && item.provider_template_id.is_none()));

    assert!(matches!(
        store
            .resolve_template_for_provider(&subject, "sms", "order_paid", "tencent")
            .await,
        Err(StoreError::Invalid(_))
    ));

    let tencent = store
        .update_template_provider(
            &subject,
            sms.id.parse::<i64>().unwrap(),
            "tencent",
            &UpdateTemplateProviderCommand {
                provider_template_id: Some("1234567".to_owned()),
                provider_template_name: Some("Order paid".to_owned()),
                sync_status: None,
            },
            "tpl-sms-update-1",
        )
        .await
        .expect("record tencent template id");
    assert_eq!(tencent.sync_status, "synced");
    let (_, resolved) = store
        .resolve_template_for_provider(&subject, "sms", "order_paid", "tencent")
        .await
        .expect("resolve tencent template");
    assert_eq!(resolved.provider_template_id.as_deref(), Some("1234567"));

    let sent = store
        .send_outbound_message(
            &subject,
            &SendOutboundMessageCommand {
                channel: "sms".to_owned(),
                target: "+8613800000000".to_owned(),
                subject: None,
                body: String::new(),
                payload: None,
                scenario: Some("system_notification".to_owned()),
                template_code: Some("order_paid".to_owned()),
                provider: Some("tencent".to_owned()),
            },
            "tpl-sms-send-1",
        )
        .await
        .expect("send with provider template");
    let payload: serde_json::Value =
        sqlx::query_scalar("SELECT payload_json FROM messaging_outbound_message WHERE id = $1")
            .bind(sent.id.parse::<i64>().unwrap())
            .fetch_one(&pool)
            .await
            .expect("read sent payload");
    assert_eq!(payload["provider"], "tencent");
    assert_eq!(payload["templateCode"], "order_paid");
    assert_eq!(payload["providerTemplateId"], "1234567");
    let stored_body: String =
        sqlx::query_scalar("SELECT body FROM messaging_outbound_message WHERE id = $1")
            .bind(sent.id.parse::<i64>().unwrap())
            .fetch_one(&pool)
            .await
            .expect("read sent body");
    assert_eq!(
        stored_body, "Order {{orderId}} paid.",
        "an empty command body must be filled from the registered template"
    );

    assert!(matches!(
        store
            .send_outbound_message(
                &subject,
                &SendOutboundMessageCommand {
                    channel: "sms".to_owned(),
                    target: "+8613800000000".to_owned(),
                    subject: None,
                    body: "Order 43 paid.".to_owned(),
                    payload: None,
                    scenario: None,
                    template_code: Some("order_paid".to_owned()),
                    provider: Some("aliyun".to_owned()),
                },
                "tpl-sms-send-2",
            )
            .await,
        Err(StoreError::Invalid(_))
    ));

    pool.close().await;
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!("DROP SCHEMA {schema} CASCADE")))
        .execute(&mut admin)
        .await
        .expect("drop throwaway schema");
}
