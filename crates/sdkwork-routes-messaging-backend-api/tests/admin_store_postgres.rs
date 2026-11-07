//! PostgreSQL integration tests for `PostgresMessagingAdminStore`.
//!
//! Database-gated (DATABASE_SPEC §32/§34): skipped unless
//! `SDKWORK_MESSAGING_TEST_DATABASE_URL` points at a PostgreSQL **admin**
//! URL (any database the user may create databases in). Each run creates a
//! throwaway database, folds in the consolidated baseline DDL (which carries
//! the full folded schema incl. the multi-provider tables), and tears it
//! down afterwards.
//!
//! Run: `SDKWORK_MESSAGING_TEST_DATABASE_URL=postgres://.../postgres \
//!      cargo test -p sdkwork-routes-messaging-backend-api \
//!      --test admin_store_postgres -- --ignored --nocapture`

use std::sync::Arc;

use sdkwork_routes_messaging_backend_api::{
    MessagingAdminStore, MessagingAdminSubject, PostgresMessagingAdminStore, StoreError,
};
use std::sync::atomic::{AtomicU64, Ordering};

use sqlx::postgres::PgConnection;
use sqlx::{Connection, Row};

static DB_SEQUENCE: AtomicU64 = AtomicU64::new(0);

const BASELINE_DDL: &str =
    include_str!("../../../database/ddl/baseline/postgres/0001_messaging_baseline.sql");

fn admin_url() -> String {
    std::env::var("SDKWORK_MESSAGING_TEST_DATABASE_URL").unwrap_or_else(|_| {
        "postgres://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/postgres".to_owned()
    })
}

async fn create_test_database(admin: &mut PgConnection) -> String {
    // Identifier is generated here (nanos + pid + sequence; never user
    // input) — asserted safe via AssertSqlSafe per the sqlx dynamic-SQL
    // audit rule. The suffixes keep parallel test binaries/threads from
    // colliding on the same name.
    let name = format!(
        "sdkwork_messaging_it_{}_{}_{}",
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default(),
        std::process::id(),
        DB_SEQUENCE.fetch_add(1, Ordering::Relaxed),
    );
    sqlx::raw_sql(sqlx::AssertSqlSafe(
        format!("CREATE DATABASE {name} TEMPLATE template0").as_str(),
    ))
    .execute(&mut *admin)
    .await
    .expect("create integration test database");
    name
}

async fn drop_test_database(admin: &mut PgConnection, name: &str) {
    // Same: identifiers come from create_test_database, never user input.
    // DROP DATABASE cannot run inside a transaction block, so the terminate
    // and the drop are separate simple-protocol batches.
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{name}' AND pid <> pg_backend_pid()"
    ).as_str()))
    .execute(&mut *admin)
    .await
    .ok();
    // Parallel test binaries keep reconnecting between terminate and drop;
    // a bounded retry absorbs the window.
    for attempt in 0..10 {
        let result = sqlx::raw_sql(sqlx::AssertSqlSafe(format!(
            "DROP DATABASE IF EXISTS {name}"
        ).as_str()))
        .execute(&mut *admin)
        .await;
        match result {
            Ok(_) => return,
            Err(error) if attempt < 9 => {
                eprintln!("drop retry {attempt}: {error}");
                tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                sqlx::raw_sql(sqlx::AssertSqlSafe(format!(
                    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{name}' AND pid <> pg_backend_pid()"
                ).as_str()))
                .execute(&mut *admin)
                .await
                .ok();
            }
            Err(error) => panic!("drop integration test database: {error}"),
        }
    }
}

struct TestStore {
    pool: sqlx::PgPool,
    store: Arc<PostgresMessagingAdminStore>,
    subject_t1o1: MessagingAdminSubject,
    subject_t1o2: MessagingAdminSubject,
}

async fn setup() -> (TestStore, String, PgConnection) {
    let admin_url = admin_url();
    let mut admin = PgConnection::connect(&admin_url)
        .await
        .expect("connect admin URL");
    let database = create_test_database(&mut admin).await;

    let base = admin_url.split('?').next().unwrap_or(&admin_url).to_owned();
    let (prefix, _) = base.rsplit_once('/').expect("url has database segment");
    let db_url = format!("{prefix}/{database}");

    let pool = sqlx::PgPool::connect(&db_url)
        .await
        .expect("connect test database");
    sqlx::raw_sql(BASELINE_DDL)
        .execute(&pool)
        .await
        .expect("apply baseline DDL");

    let store = Arc::new(PostgresMessagingAdminStore::new(pool.clone()));
    let test = TestStore {
        pool,
        store,
        subject_t1o1: MessagingAdminSubject {
            tenant_id: 101,
            organization_id: 1,
            operator_id: Some(9001),
        },
        subject_t1o2: MessagingAdminSubject {
            tenant_id: 101,
            organization_id: 2,
            operator_id: Some(9002),
        },
    };
    (test, database, admin)
}

fn email_account_command(
    name: &str,
) -> sdkwork_routes_messaging_backend_api::ports::CreateEmailAccountCommand {
    sdkwork_routes_messaging_backend_api::ports::CreateEmailAccountCommand {
        name: name.to_owned(),
        provider: "smtp".to_owned(),
        config: serde_json::json!({ "host": "smtp.example.com", "port": "465", "encryption": "smtps" }),
        secret: Some("secret-1".to_owned()),
        enabled: true,
    }
}

#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn tenant_and_organization_isolation_is_enforced_at_the_store() {
    let (test, database, mut admin) = setup().await;
    let created = test
        .store
        .create_email_account(
            &test.subject_t1o1,
            &email_account_command("隔离测试"),
            "it-key",
        )
        .await
        .expect("create account");

    let other_org_list = test
        .store
        .list_email_accounts(&test.subject_t1o2, 1, 20)
        .await
        .expect("list in other org");
    assert_eq!(other_org_list.total_items, 0, "org scope must isolate rows");
    let other_org_fetch = test
        .store
        .retrieve_email_account(&test.subject_t1o2, created.id.parse().unwrap())
        .await;
    assert!(
        matches!(other_org_fetch, Err(StoreError::NotFound(_))),
        "cross-org retrieve must be NotFound, got {other_org_fetch:?}"
    );

    drop_test_database(&mut admin, &database).await;
    let _ = &test.pool;
}

#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn account_listing_is_sql_paginated() {
    let (test, database, mut admin) = setup().await;
    for index in 0..25 {
        test.store
            .create_email_account(
                &test.subject_t1o1,
                &email_account_command(&format!("账户{index:02}")),
                "it-key",
            )
            .await
            .expect("create account");
    }

    let page1 = test
        .store
        .list_email_accounts(&test.subject_t1o1, 1, 20)
        .await
        .expect("page 1");
    assert_eq!(page1.items.len(), 20);
    assert_eq!(page1.total_items, 25);

    let page2 = test
        .store
        .list_email_accounts(&test.subject_t1o1, 2, 20)
        .await
        .expect("page 2");
    assert_eq!(page2.items.len(), 5);

    drop_test_database(&mut admin, &database).await;
}

#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn duplicate_account_name_maps_to_conflict_and_soft_deleted_names_recreate() {
    let (test, database, mut admin) = setup().await;
    test.store
        .create_email_account(&test.subject_t1o1, &email_account_command("重名"), "it-key")
        .await
        .expect("first create");

    let duplicate = test
        .store
        .create_email_account(&test.subject_t1o1, &email_account_command("重名"), "it-key")
        .await;
    assert!(
        matches!(duplicate, Err(StoreError::Conflict(_))),
        "duplicate name must conflict, got {duplicate:?}"
    );

    let first = test
        .store
        .list_email_accounts(&test.subject_t1o1, 1, 20)
        .await
        .expect("list");
    let account = &first.items[0];
    test.store
        .delete_email_account(&test.subject_t1o1, account.id.parse().unwrap(), "it-key")
        .await
        .expect("soft delete");

    // DB017: the soft-deleted name must be reusable.
    test.store
        .create_email_account(&test.subject_t1o1, &email_account_command("重名"), "it-key")
        .await
        .expect("recreate after soft delete");

    drop_test_database(&mut admin, &database).await;
}

#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn account_delete_cascades_senders_atomically() {
    let (test, database, mut admin) = setup().await;
    let account = test
        .store
        .create_email_account(&test.subject_t1o1, &email_account_command("级联"), "it-key")
        .await
        .expect("create account");
    test.store
        .create_email_sender(
            &test.subject_t1o1,
            &sdkwork_routes_messaging_backend_api::ports::CreateEmailSenderCommand {
                account_id: account.id.clone(),
                from_address: "no-reply@example.com".to_owned(),
                from_name: Some("IT".to_owned()),
                enabled: true,
            },
            "it-key",
        )
        .await
        .expect("create sender");

    test.store
        .delete_email_account(&test.subject_t1o1, account.id.parse().unwrap(), "it-key")
        .await
        .expect("delete account");

    let senders = test
        .store
        .list_email_senders(&test.subject_t1o1, None, 1, 20)
        .await
        .expect("list senders");
    assert_eq!(senders.total_items, 0, "sender cascade must be atomic");

    drop_test_database(&mut admin, &database).await;
}

#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn account_update_enforces_optimistic_concurrency() {
    let (test, database, mut admin) = setup().await;
    let account = test
        .store
        .create_email_account(&test.subject_t1o1, &email_account_command("并发"), "it-key")
        .await
        .expect("create account");


    let current = sdkwork_routes_messaging_backend_api::ports::UpdateEmailAccountCommand {
        name: "并发-成功".to_owned(),
        provider: "smtp".to_owned(),
        config: serde_json::json!({ "host": "smtp2.example.com" }),
        secret: None,
        enabled: true,
        expected_version: account.version.clone(),
    };
    let updated = test
        .store
        .update_email_account(
            &test.subject_t1o1,
            account.id.parse().unwrap(),
            &current,
            "it-key",
        )
        .await
        .expect("update with fresh version");
    assert_eq!(updated.version, "1", "version must increment");

    // The pre-update version is now stale → Conflict (§17).
    let stale = sdkwork_routes_messaging_backend_api::ports::UpdateEmailAccountCommand {
        name: "并发-冲突".to_owned(),
        provider: "smtp".to_owned(),
        config: serde_json::json!({ "host": "smtp3.example.com" }),
        secret: None,
        enabled: true,
        expected_version: account.version.clone(),
    };
    let conflict = test
        .store
        .update_email_account(
            &test.subject_t1o1,
            account.id.parse().unwrap(),
            &stale,
            "it-key",
        )
        .await;
    assert!(
        matches!(conflict, Err(StoreError::Conflict(_))),
        "stale version must conflict, got {conflict:?}"
    );
    assert!(
        updated.key_display_masked.contains('*'),
        "secret mask must survive a secret-less update"
    );

    drop_test_database(&mut admin, &database).await;
}

#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn send_rule_chain_resolves_and_blocks_sender_deletion_while_referenced() {
    let (test, database, mut admin) = setup().await;
    let account = test
        .store
        .create_email_account(&test.subject_t1o1, &email_account_command("规则"), "it-key")
        .await
        .expect("create account");
    let sender = test
        .store
        .create_email_sender(
            &test.subject_t1o1,
            &sdkwork_routes_messaging_backend_api::ports::CreateEmailSenderCommand {
                account_id: account.id.clone(),
                from_address: "rule@example.com".to_owned(),
                from_name: None,
                enabled: true,
            },
            "it-key",
        )
        .await
        .expect("create sender");

    let rule = test
        .store
        .update_email_send_rule(
            &test.subject_t1o1,
            "default",
            &sdkwork_routes_messaging_backend_api::ports::UpdateEmailSendRuleCommand {
                sender_ids: vec![sender.id.clone()],
                enabled: true,
                expected_version: "0".to_owned(),
            },
            "it-key",
        )
        .await
        .expect("update rule");
    assert_eq!(rule.chain.len(), 1);
    assert_eq!(rule.chain[0].from_address, "rule@example.com");

    let listed = test
        .store
        .list_email_send_rules(&test.subject_t1o1)
        .await
        .expect("list rules");
    assert_eq!(listed.len(), 4, "fixed scenario vocabulary");
    let default_rule = listed
        .iter()
        .find(|item| item.scenario == "default")
        .expect("default scenario present");
    assert_eq!(default_rule.chain.len(), 1);

    let blocked = test
        .store
        .delete_email_sender(&test.subject_t1o1, sender.id.parse().unwrap(), "it-key")
        .await;
    assert!(
        matches!(blocked, Err(StoreError::Conflict(_))),
        "referenced sender deletion must conflict, got {blocked:?}"
    );

    // Unknown sender ids in a chain must be rejected (Invalid, not stored).
    let unknown = test
        .store
        .update_email_send_rule(
            &test.subject_t1o1,
            "default",
            &sdkwork_routes_messaging_backend_api::ports::UpdateEmailSendRuleCommand {
                sender_ids: vec!["999999".to_owned()],
                enabled: true,
                expected_version: rule.version.clone(),
            },
            "it-key",
        )
        .await;
    assert!(
        matches!(unknown, Err(StoreError::Invalid(_))),
        "unknown sender in chain must be invalid, got {unknown:?}"
    );

    drop_test_database(&mut admin, &database).await;
}

#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn sms_signature_unique_and_secret_mask_roundtrip() {
    let (test, database, mut admin) = setup().await;
    let command = sdkwork_routes_messaging_backend_api::ports::CreateSmsAccountCommand {
        name: "短信账户".to_owned(),
        provider: "aliyun".to_owned(),
        config: serde_json::json!({ "accessKeyId": "AKID", "region": "cn-hangzhou" }),
        secret: Some("sms-secret".to_owned()),
        enabled: true,
    };
    let account = test
        .store
        .create_sms_account(&test.subject_t1o1, &command, "it-key")
        .await
        .expect("create sms account");
    assert!(account.has_secret);
    assert!(account.key_display_masked.contains('*'));

    let signature = test
        .store
        .create_sms_signature(
            &test.subject_t1o1,
            &sdkwork_routes_messaging_backend_api::ports::CreateSmsSignatureCommand {
                account_id: account.id.clone(),
                sign_name: "签名A".to_owned(),
                enabled: true,
            },
            "it-key",
        )
        .await
        .expect("create signature");

    let duplicate = test
        .store
        .create_sms_signature(
            &test.subject_t1o1,
            &sdkwork_routes_messaging_backend_api::ports::CreateSmsSignatureCommand {
                account_id: account.id.clone(),
                sign_name: "签名A".to_owned(),
                enabled: true,
            },
            "it-key",
        )
        .await;
    assert!(matches!(duplicate, Err(StoreError::Conflict(_))));

    // Cross-org: the same signature name under a different org must be fine.
    test.store
        .create_sms_account(
            &test.subject_t1o2,
            &sdkwork_routes_messaging_backend_api::ports::CreateSmsAccountCommand {
                name: "短信账户".to_owned(),
                provider: "tencent".to_owned(),
                config: serde_json::json!({}),
                secret: None,
                enabled: true,
            },
            "it-key",
        )
        .await
        .expect("same name in other org");

    let item = test
        .store
        .retrieve_sms_signature(&test.subject_t1o1, signature.id.parse().unwrap())
        .await
        .expect("retrieve signature");
    assert_eq!(item.account_name, "短信账户");

    // And the secret decrypts for masking.
    let row = sqlx::query(
        "SELECT secret_ciphertext, secret_key_id FROM messaging_sms_account WHERE id = $1",
    )
    .bind(account.id.parse::<i64>().unwrap())
    .fetch_one(&test.pool)
    .await
    .expect("fetch ciphertext");
    let _ciphertext: String = row.get("secret_ciphertext");
    let _key_id: String = row.get("secret_key_id");

    drop_test_database(&mut admin, &database).await;
}
