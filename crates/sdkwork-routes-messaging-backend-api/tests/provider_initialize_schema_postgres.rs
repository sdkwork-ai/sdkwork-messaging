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
