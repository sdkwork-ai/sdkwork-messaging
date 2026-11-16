//! Schema-scoped PostgreSQL regression for the one-click provider initialize
//! command.
//!
//! `admin_store_postgres.rs` creates a throwaway **database**, which requires
//! the `CREATEDB` privilege. Managed development databases usually grant only
//! `CREATE` on the database, so this test converges the same assertions inside a
//! throwaway **schema** instead. It is the runnable form of the initialization
//! regression on this workstation and in restricted environments.
//!
//! Run:
//! `SDKWORK_MESSAGING_TEST_DATABASE_URL=postgres://user:pass@127.0.0.1:5432/db \
//!  cargo test -p sdkwork-routes-messaging-backend-api \
//!  --test provider_initialize_schema_postgres -- --ignored --nocapture`

use std::str::FromStr;
use std::sync::Arc;

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
        "sdkwork_messaging_init_{}_{}_{}",
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default(),
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.subsec_nanos())
            .unwrap_or_default(),
    )
}

fn subject() -> MessagingAdminSubject {
    MessagingAdminSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: Some(9001),
    }
}

async fn create_schema(admin: &mut PgConnection, schema: &str) {
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!("CREATE SCHEMA {schema}")))
        .execute(&mut *admin)
        .await
        .expect("create throwaway schema");
}

async fn drop_schema(admin: &mut PgConnection, schema: &str) {
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!("DROP SCHEMA {schema} CASCADE")))
        .execute(&mut *admin)
        .await
        .expect("drop throwaway schema");
}

#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn provider_initialize_is_complete_idempotent_and_non_destructive() {
    let database_url = database_url();
    let mut admin = PgConnection::connect(&database_url)
        .await
        .expect("connect integration database");
    let schema = unique_schema();
    create_schema(&mut admin, &schema).await;

    // Every pooled connection must resolve unqualified baseline tables in the
    // throwaway schema.
    let options = PgConnectOptions::from_str(&database_url)
        .expect("parse integration database URL")
        .options([("search_path", schema.as_str())]);
    let pool = PgPoolOptions::new()
        .max_connections(4)
        .connect_with(options)
        .await
        .expect("connect throwaway schema");
    sqlx::raw_sql(BASELINE_DDL)
        .execute(&pool)
        .await
        .expect("apply baseline DDL");

    let store = Arc::new(PostgresMessagingAdminStore::new(pool.clone()));
    let subject = subject();

    // --- email: default provider converges account + sender + four rules
    let enterprise = store
        .initialize_email_provider(&subject, "enterprise_mail")
        .await
        .expect("initialize enterprise mailbox");
    assert!(enterprise.created_account);
    assert_eq!(enterprise.rules_ensured, 4);

    let accounts = store
        .list_email_accounts(&subject, 1, 20)
        .await
        .expect("list email accounts");
    assert_eq!(accounts.total_items, 1);
    assert_eq!(accounts.items[0].provider, "enterprise_mail");
    assert!(accounts.items[0].enabled);
    assert!(accounts.items[0].receive_enabled);
    assert_eq!(accounts.items[0].config["host"], "smtp.exmail.qq.com");

    let senders = store
        .list_email_senders(&subject, None, 1, 20)
        .await
        .expect("list email senders");
    assert_eq!(senders.total_items, 1);
    assert_eq!(senders.items[0].from_address, "no-reply@birdcoder.com");
    assert!(senders.items[0].enabled);
    let enterprise_sender_id = senders.items[0].id.clone();

    let rules = store
        .list_email_send_rules(&subject)
        .await
        .expect("list email rules");
    assert_eq!(rules.len(), 4);
    for rule in &rules {
        assert!(rule.enabled);
        assert_eq!(rule.chain.len(), 1);
        assert_eq!(rule.chain[0].sender_id, enterprise_sender_id);
    }

    // --- idempotent: no new rows, no version bump
    let first_version = accounts.items[0].version.clone();
    let second = store
        .initialize_email_provider(&subject, "enterprise_mail")
        .await
        .expect("re-initialize enterprise mailbox");
    assert!(!second.created_account);
    let accounts = store
        .list_email_accounts(&subject, 1, 20)
        .await
        .expect("list email accounts");
    assert_eq!(accounts.total_items, 1);
    assert_eq!(accounts.items[0].version, first_version);

    // --- non-destructive: operator keys and values survive
    sqlx::query(
        "UPDATE messaging_email_account SET config_json = config_json || \
         '{\"host\":\"smtp.operator.example\",\"customFlag\":\"keep\"}'::jsonb",
    )
    .execute(&pool)
    .await
    .expect("apply operator edit");
    store
        .initialize_email_provider(&subject, "enterprise_mail")
        .await
        .expect("initialize after operator edit");
    let accounts = store
        .list_email_accounts(&subject, 1, 20)
        .await
        .expect("list email accounts");
    assert_eq!(accounts.items[0].config["host"], "smtp.operator.example");
    assert_eq!(accounts.items[0].config["customFlag"], "keep");

    // --- second provider appends after the default in canonical order
    store
        .initialize_email_provider(&subject, "gmail")
        .await
        .expect("initialize gmail");
    let senders = store
        .list_email_senders(&subject, None, 1, 50)
        .await
        .expect("list email senders");
    assert_eq!(senders.total_items, 2);
    let gmail_sender_id = senders
        .items
        .iter()
        .find(|sender| sender.account_name == "Gmail")
        .expect("gmail sender")
        .id
        .clone();
    let rules = store
        .list_email_send_rules(&subject)
        .await
        .expect("list email rules");
    for rule in &rules {
        assert_eq!(rule.chain.len(), 2);
        assert_eq!(rule.chain[0].sender_id, enterprise_sender_id);
        assert_eq!(rule.chain[1].sender_id, gmail_sender_id);
    }

    // Per-step enablement round-trips without removing the step from the chain.
    let default_rule = rules
        .iter()
        .find(|rule| rule.scenario == "default")
        .expect("default rule");
    let updated_rule = store
        .update_email_send_rule(
            &subject,
            "default",
            &sdkwork_routes_messaging_backend_api::ports::UpdateEmailSendRuleCommand {
                steps: vec![
                    sdkwork_routes_messaging_backend_api::ports::EmailSendRuleStepCommand {
                        sender_id: enterprise_sender_id.clone(),
                        enabled: true,
                    },
                    sdkwork_routes_messaging_backend_api::ports::EmailSendRuleStepCommand {
                        sender_id: gmail_sender_id.clone(),
                        enabled: false,
                    },
                ],
                enabled: true,
                expected_version: default_rule.version.clone(),
            },
            "it-rule-key",
        )
        .await
        .expect("update rule with a disabled step");
    assert_eq!(updated_rule.chain.len(), 2);
    assert!(updated_rule.chain[0].step_enabled);
    assert!(!updated_rule.chain[1].step_enabled);
    assert!(
        !updated_rule.chain[1].identity_enabled,
        "the gmail identity stays disabled by its provider preset"
    );

    // An enabled rule with zero enabled steps is rejected.
    let invalid = store
        .update_email_send_rule(
            &subject,
            "default",
            &sdkwork_routes_messaging_backend_api::ports::UpdateEmailSendRuleCommand {
                steps: vec![
                    sdkwork_routes_messaging_backend_api::ports::EmailSendRuleStepCommand {
                        sender_id: enterprise_sender_id.clone(),
                        enabled: false,
                    },
                ],
                enabled: true,
                expected_version: updated_rule.version.clone(),
            },
            "it-rule-key",
        )
        .await;
    assert!(matches!(invalid, Err(StoreError::Invalid(_))));

    // --- unknown provider is rejected, not created
    assert!(matches!(
        store.initialize_email_provider(&subject, "exchange").await,
        Err(StoreError::Invalid(_))
    ));

    // --- sms: Tencent Cloud default converges account + signature + four rules
    let tencent = store
        .initialize_sms_provider(&subject, "tencent")
        .await
        .expect("initialize tencent sms");
    assert!(tencent.created_account);
    let sms_accounts = store
        .list_sms_accounts(&subject, 1, 20)
        .await
        .expect("list sms accounts");
    assert_eq!(sms_accounts.total_items, 1);
    assert_eq!(sms_accounts.items[0].provider, "tencent");
    assert_eq!(
        sms_accounts.items[0].config["endpoint"],
        "https://sms.tencentcloudapi.com"
    );
    assert!(sms_accounts.items[0].enabled);

    let signatures = store
        .list_sms_signatures(&subject, None, 1, 20)
        .await
        .expect("list sms signatures");
    assert_eq!(signatures.total_items, 1);
    assert_eq!(signatures.items[0].sign_name, "BirdCoder");
    let sms_rules = store
        .list_sms_send_rules(&subject)
        .await
        .expect("list sms rules");
    assert_eq!(sms_rules.len(), 4);
    for rule in &sms_rules {
        assert!(rule.enabled);
        assert_eq!(rule.chain.len(), 1);
        assert_eq!(rule.chain[0].signature_id, signatures.items[0].id);
    }
    assert!(matches!(
        store.initialize_sms_provider(&subject, "exchange").await,
        Err(StoreError::Invalid(_))
    ));

    // --- cleanup
    pool.close().await;
    drop_schema(&mut admin, &schema).await;

    // Sanity: the throwaway schema is gone.
    let remaining: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM information_schema.schemata WHERE schema_name = $1",
    )
    .bind(&schema)
    .fetch_one(&mut admin)
    .await
    .expect("inspect schema registry");
    assert_eq!(remaining, 0);
}

/// Send records and the notification dashboard aggregate real outbound messages
/// and delivery attempts, including scenario/provider grouping, filters, and
/// detail timelines.
#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn send_records_and_dashboard_aggregate_real_deliveries() {
    use chrono::Utc;
    use sdkwork_routes_messaging_backend_api::ports::{SendOutboundMessageCommand, SendRecordFilter};

    let database_url = database_url();
    let mut admin = PgConnection::connect(&database_url)
        .await
        .expect("connect integration database");
    let schema = unique_schema();
    create_schema(&mut admin, &schema).await;
    let options = PgConnectOptions::from_str(&database_url)
        .expect("parse integration database URL")
        .options([("search_path", schema.as_str())]);
    let pool = PgPoolOptions::new()
        .max_connections(4)
        .connect_with(options)
        .await
        .expect("connect throwaway schema");
    sqlx::raw_sql(BASELINE_DDL)
        .execute(&pool)
        .await
        .expect("apply baseline DDL");
    let store = Arc::new(PostgresMessagingAdminStore::new(pool.clone()));
    let subject = subject();
    let now = Utc::now();

    let email_delivered = store
        .send_outbound_message(
            &subject,
            &SendOutboundMessageCommand {
                channel: "email".to_owned(),
                target: "user@example.com".to_owned(),
                subject: Some("Your verification code".to_owned()),
                body: "Your code is 123456".to_owned(),
                payload: None,
                scenario: Some("verification_code".to_owned()),
                template_code: Some("verification_code".to_owned()),
            },
            "record-email-1",
        )
        .await
        .expect("send email record");
    let email_pending = store
        .send_outbound_message(
            &subject,
            &SendOutboundMessageCommand {
                channel: "email".to_owned(),
                target: "ops@example.com".to_owned(),
                subject: Some("Weekly report".to_owned()),
                body: "Report attached".to_owned(),
                payload: None,
                scenario: None,
                template_code: None,
            },
            "record-email-2",
        )
        .await
        .expect("send pending email record");
    let sms_failed = store
        .send_outbound_message(
            &subject,
            &SendOutboundMessageCommand {
                channel: "sms".to_owned(),
                target: "+8613800000000".to_owned(),
                subject: None,
                body: "Autumn campaign".to_owned(),
                payload: None,
                scenario: Some("marketing".to_owned()),
                template_code: None,
            },
            "record-sms-1",
        )
        .await
        .expect("send sms record");

    sqlx::query(
        "INSERT INTO messaging_outbound_delivery \
         (id, uuid, tenant_id, organization_id, outbound_message_id, channel, provider, \
          provider_message_id, status, sent_at, delivered_at, created_at) \
         VALUES (910000000001, 'it-delivery-email-1', $1, $2, $3, 'email', 'enterprise_mail', \
                 'exmail-1', 'delivered', $4, $4, $4)",
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(email_delivered.id.parse::<i64>().unwrap())
    .bind(now - chrono::Duration::minutes(5))
    .execute(&pool)
    .await
    .expect("insert delivered email attempt");
    sqlx::query(
        "INSERT INTO messaging_outbound_delivery \
         (id, uuid, tenant_id, organization_id, outbound_message_id, channel, provider, \
          status, error_code, error_message, failed_at, created_at) \
         VALUES (910000000002, 'it-delivery-sms-1', $1, $2, $3, 'sms', 'tencent', \
                 'failed', 'SMS_1001', 'template not approved', $4, $4)",
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(sms_failed.id.parse::<i64>().unwrap())
    .bind(now - chrono::Duration::minutes(3))
    .execute(&pool)
    .await
    .expect("insert failed sms attempt");

    // The delivery worker advances the outbound message status when an attempt
    // reaches a terminal state; the record/dashboard surfaces read that status.
    sqlx::query("UPDATE messaging_outbound_message SET status = 'delivered' WHERE id = $1")
        .bind(email_delivered.id.parse::<i64>().unwrap())
        .execute(&pool)
        .await
        .expect("advance email status");
    sqlx::query("UPDATE messaging_outbound_message SET status = 'failed' WHERE id = $1")
        .bind(sms_failed.id.parse::<i64>().unwrap())
        .execute(&pool)
        .await
        .expect("advance sms status");

    let filter = SendRecordFilter {
        status: None,
        q: None,
        from: None,
        to: None,
        page: 1,
        page_size: 20,
    };
    let email_records = store
        .list_send_records(&subject, "email", &filter)
        .await
        .expect("list email records");
    assert_eq!(email_records.total_items, 2);
    assert_eq!(email_records.items.len(), 2);

    let delivered_filter = SendRecordFilter {
        status: Some("delivered".to_owned()),
        ..filter.clone()
    };
    let delivered = store
        .list_send_records(&subject, "email", &delivered_filter)
        .await
        .expect("filter delivered email records");
    assert_eq!(delivered.total_items, 1);
    let delivered_item = &delivered.items[0];
    assert_eq!(delivered_item.id, email_delivered.id);
    assert_eq!(delivered_item.scenario, "verification_code");
    assert_eq!(delivered_item.template_code.as_deref(), Some("verification_code"));
    assert_eq!(delivered_item.provider.as_deref(), Some("enterprise_mail"));
    assert_eq!(delivered_item.attempt_count, 1);
    assert!(delivered_item.delivered_at.is_some());

    let keyword_filter = SendRecordFilter {
        q: Some("verification".to_owned()),
        ..filter.clone()
    };
    let by_keyword = store
        .list_send_records(&subject, "email", &keyword_filter)
        .await
        .expect("keyword filter");
    assert_eq!(by_keyword.total_items, 1);
    assert_eq!(by_keyword.items[0].id, email_delivered.id);

    let detail = store
        .retrieve_send_record(
            &subject,
            "email",
            email_delivered.id.parse::<i64>().unwrap(),
        )
        .await
        .expect("retrieve email record detail");
    assert_eq!(detail.attempts.len(), 1);
    assert_eq!(detail.attempts[0].provider.as_deref(), Some("enterprise_mail"));
    assert_eq!(detail.attempts[0].status, "delivered");
    assert!(matches!(
        store
            .retrieve_send_record(&subject, "sms", email_delivered.id.parse::<i64>().unwrap())
            .await,
        Err(StoreError::NotFound(_))
    ));

    let sms_records = store
        .list_send_records(&subject, "sms", &filter)
        .await
        .expect("list sms records");
    assert_eq!(sms_records.total_items, 1);
    assert_eq!(sms_records.items[0].status, "failed");
    assert_eq!(sms_records.items[0].scenario, "marketing");
    assert_eq!(sms_records.items[0].error_code.as_deref(), Some("SMS_1001"));

    let dashboard = store
        .notification_dashboard(&subject, 7, now + chrono::Duration::seconds(5))
        .await
        .expect("notification dashboard");
    assert_eq!(dashboard.range_days, 7);
    assert_eq!(dashboard.trend.len(), 7);
    assert_eq!(dashboard.totals.total, 3);
    assert_eq!(dashboard.totals.email, 2);
    assert_eq!(dashboard.totals.sms, 1);
    assert_eq!(dashboard.totals.delivered, 1);
    assert_eq!(dashboard.totals.failed, 1);
    assert_eq!(dashboard.totals.pending, 1);
    assert!((dashboard.totals.success_rate - 0.5).abs() < f64::EPSILON);
    assert_eq!(
        dashboard
            .by_channel
            .iter()
            .find(|row| row.channel == "email")
            .expect("email channel row")
            .total,
        2
    );
    assert!(dashboard
        .by_scenario
        .iter()
        .any(|row| row.scenario == "verification_code" && row.channel == "email"));
    assert!(dashboard
        .by_scenario
        .iter()
        .any(|row| row.scenario == "marketing" && row.channel == "sms"));
    assert!(dashboard
        .by_provider
        .iter()
        .any(|row| row.provider == "enterprise_mail" && row.total == 1));
    assert!(dashboard
        .by_provider
        .iter()
        .any(|row| row.provider == "tencent" && row.failed == 1));
    assert_eq!(dashboard.recent_failures.len(), 1);
    assert_eq!(dashboard.recent_failures[0].id, sms_failed.id);
    let today = dashboard.trend.last().expect("today bucket");
    assert_eq!(today.email, 2);
    assert_eq!(today.sms, 1);

    // Keep the compiler honest about the unused pending record id.
    assert!(!email_pending.id.is_empty());

    pool.close().await;
    drop_schema(&mut admin, &schema).await;
}
