//! Real-PostgreSQL regression for the localized SMS template seed catalog.
//!
//! Applies the baseline DDL plus the complete `standard` seed profile into a
//! throwaway schema, then asserts the operational guarantees the SMS template
//! page relies on: full business coverage, deterministic reserved ids,
//! single-segment bodies, marketing opt-out, and idempotent re-seeding.

use std::str::FromStr;

use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::{Connection, PgConnection, PgPool};

const BASELINE_DDL: &str =
    include_str!("../../../database/ddl/baseline/postgres/0001_messaging_baseline.sql");

const SEED_COMMON_BOOTSTRAP: &str =
    include_str!("../../../database/seeds/common/001_bootstrap.sql");
const SEED_COMMON_EMAIL: &str =
    include_str!("../../../database/seeds/common/002_email_provider_defaults.sql");
const SEED_COMMON_SMS: &str =
    include_str!("../../../database/seeds/common/003_sms_provider_defaults.sql");

const SEED_ZH_TEMPLATES: &str =
    include_str!("../../../database/seeds/locales/zh-CN/001_message_templates.sql");
const SEED_ZH_BINDINGS: &str =
    include_str!("../../../database/seeds/locales/zh-CN/002_template_provider_defaults.sql");
const SEED_EN_TEMPLATES: &str =
    include_str!("../../../database/seeds/locales/en-US/001_message_templates.sql");
const SEED_EN_BINDINGS: &str =
    include_str!("../../../database/seeds/locales/en-US/002_template_provider_defaults.sql");

/// Standard transactional emails a commercial installation must ship with.
const REQUIRED_EMAIL_CODES: &[&str] = &[
    // account and security
    "verification_code",
    "register_verification_code",
    "password_reset",
    "password_reset_success",
    "password_changed",
    "register_welcome",
    "email_verify",
    "security_alert",
    "account_frozen",
    // commercial journeys
    "order_paid",
    "payment_failed",
    "invoice_ready",
    "subscription_expiring",
    "quota_warning",
    "maintenance_notice",
    "partner_approved",
    "marketing_campaign",
];

/// Business areas the SMS catalog must cover for day-to-day operations.
const REQUIRED_CODES: &[&str] = &[
    // identity / verification
    "verification_code",
    "password_reset",
    "security_alert",
    "new_device_login",
    // billing / orders
    "order_paid",
    "payment_failed",
    "recharge_success",
    "arrears_notice",
    "invoice_ready",
    // subscription / membership
    "subscription_expiring",
    "subscription_renewed",
    "membership_expiring",
    // quota / usage
    "quota_warning",
    "quota_exhausted",
    "rate_limit_triggered",
    // operations
    "upstream_failure",
    "node_offline",
    "maintenance_notice",
    // partner
    "partner_approved",
    "partner_commission_settled",
    // marketing
    "marketing_campaign",
];

const MARKETING_CODES: &[&str] = &[
    "marketing_campaign",
    "marketing_promotion",
    "marketing_recall",
    "marketing_new_feature",
];

fn database_url() -> String {
    std::env::var("SDKWORK_MESSAGING_TEST_DATABASE_URL").unwrap_or_else(|_| {
        "postgres://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev".to_owned()
    })
}

fn unique_schema() -> String {
    format!(
        "sdkwork_messaging_sms_seed_{}_{}",
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default(),
        std::process::id(),
    )
}

async fn prepare_pool() -> (PgConnection, PgPool, String) {
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
        .max_connections(2)
        .connect_with(options)
        .await
        .expect("connect schema");
    sqlx::raw_sql(BASELINE_DDL)
        .execute(&pool)
        .await
        .expect("apply baseline");
    (admin, pool, schema)
}

async fn apply_standard_profile(pool: &PgPool) {
    for seed in [
        SEED_COMMON_BOOTSTRAP,
        SEED_COMMON_EMAIL,
        SEED_COMMON_SMS,
        SEED_ZH_TEMPLATES,
        SEED_ZH_BINDINGS,
        SEED_EN_TEMPLATES,
        SEED_EN_BINDINGS,
    ] {
        sqlx::raw_sql(seed)
            .execute(pool)
            .await
            .expect("apply standard seed profile");
    }
}

#[tokio::test]
#[ignore = "requires SDKWORK_MESSAGING_TEST_DATABASE_URL (PostgreSQL)"]
async fn template_seed_profile_covers_every_business_area_and_is_idempotent() {
    let (mut admin, pool, schema) = prepare_pool().await;
    apply_standard_profile(&pool).await;

    // 0. Email templates land active with a subject (providers render locally).
    let (email_total, email_bad): (i64, i64) = sqlx::query_as(
        "SELECT count(*), \
                count(*) FILTER (WHERE status <> 'active' \
                                     OR approval_status <> 'not_applicable' \
                                     OR subject IS NULL) \
         FROM messaging_template WHERE channel = 'email'",
    )
    .fetch_one(&pool)
    .await
    .expect("count email templates");
    assert!(
        email_total >= 30,
        "expected a business-complete email catalog, found {email_total}"
    );
    assert_eq!(
        email_bad, 0,
        "every seeded email template must be active, provider-agnostic and titled"
    );

    // 0b. The standard transactional emails a live install must ship.
    for code in REQUIRED_EMAIL_CODES {
        for uuid_prefix in ["seed-tpl-zh-email-", "seed-tpl-en-email-"] {
            let found: i64 = sqlx::query_scalar(
                "SELECT count(*) FROM messaging_template \
                 WHERE channel = 'email' AND template_code = $1 AND uuid = $2",
            )
            .bind(code)
            .bind(format!("{uuid_prefix}{}", code.replace('_', "-")))
            .fetch_one(&pool)
            .await
            .expect("count required email template");
            assert_eq!(found, 1, "missing required email template `{code}`");
        }
    }

    // 1. SMS templates land as provider-pending drafts ready for activation.
    let (sms_total, draft_total, pending_total): (i64, i64, i64) = sqlx::query_as(
        "SELECT count(*), \
                count(*) FILTER (WHERE status = 'draft'), \
                count(*) FILTER (WHERE approval_status = 'pending') \
         FROM messaging_template WHERE channel = 'sms'",
    )
    .fetch_one(&pool)
    .await
    .expect("count sms templates");
    assert!(
        sms_total >= 60,
        "expected a business-complete SMS catalog, found {sms_total}"
    );
    assert_eq!(
        draft_total, sms_total,
        "every seeded SMS template must start as a draft"
    );
    assert_eq!(
        pending_total, sms_total,
        "every seeded SMS template must await provider approval"
    );

    // 2. Every required business code exists for both active locales.
    for code in REQUIRED_CODES {
        for uuid_prefix in ["seed-tpl-zh-sms-", "seed-tpl-en-sms-"] {
            let found: i64 = sqlx::query_scalar(
                "SELECT count(*) FROM messaging_template \
                 WHERE channel = 'sms' AND template_code = $1 AND uuid = $2 \
                   AND tenant_id = 100001 AND organization_id = 0",
            )
            .bind(code)
            .bind(format!("{uuid_prefix}{}", code.replace('_', "-")))
            .fetch_one(&pool)
            .await
            .expect("count required template");
            assert_eq!(found, 1, "missing required SMS template `{code}` ({uuid_prefix})");
        }
    }

    // 3. Both locales carry the same code set.
    let (zh_count, en_count): (i64, i64) = sqlx::query_as(
        "SELECT count(*) FILTER (WHERE uuid LIKE 'seed-tpl-zh-sms-%'), \
                count(*) FILTER (WHERE uuid LIKE 'seed-tpl-en-sms-%') \
         FROM messaging_template WHERE channel = 'sms'",
    )
    .fetch_one(&pool)
    .await
    .expect("count per locale");
    assert_eq!(zh_count, en_count, "active locales must carry the same SMS catalog");

    // 4. Marketing templates carry an opt-out instruction; others never do.
    let marketing_without_opt_out: Vec<String> = sqlx::query_scalar(
        "SELECT template_code FROM messaging_template \
         WHERE channel = 'sms' AND template_code = ANY($1) \
           AND content !~ '([Rr]eply STOP|回 T 退订)'",
    )
    .bind(MARKETING_CODES)
    .fetch_all(&pool)
    .await
    .expect("check marketing opt-out");
    assert!(
        marketing_without_opt_out.is_empty(),
        "marketing templates missing opt-out: {marketing_without_opt_out:?}"
    );
    let transactional_with_opt_out: Vec<String> = sqlx::query_scalar(
        "SELECT template_code FROM messaging_template \
         WHERE channel = 'sms' AND NOT (template_code = ANY($1)) \
           AND content ~ '([Rr]eply STOP|回 T 退订)'",
    )
    .bind(MARKETING_CODES)
    .fetch_all(&pool)
    .await
    .expect("check transactional opt-out");
    assert!(
        transactional_with_opt_out.is_empty(),
        "transactional templates must not carry opt-out: {transactional_with_opt_out:?}"
    );

    // 5. Every SMS body fits one UCS-2 segment (70 chars) before substitution.
    let long_bodies: Vec<(String, i32)> = sqlx::query_as(
        "SELECT template_code, char_length(content) \
         FROM messaging_template WHERE channel = 'sms' AND char_length(content) > 70",
    )
    .fetch_all(&pool)
    .await
    .expect("check sms length");
    assert!(
        long_bodies.is_empty(),
        "SMS bodies exceeding one segment: {long_bodies:?}"
    );

    // 6. declared variables match the placeholders in the content.
    let mismatched: Vec<String> = sqlx::query_scalar(
        "SELECT template_code FROM messaging_template t \
         WHERE t.channel = 'sms' \
           AND (SELECT count(*) FROM jsonb_array_elements_text(t.variables_json)) \
               <> (SELECT count(DISTINCT m[1]) FROM regexp_matches(t.content, '\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}', 'g') AS m)",
    )
    .fetch_all(&pool)
    .await
    .expect("check declared variables");
    assert!(
        mismatched.is_empty(),
        "SMS templates whose variables_json disagrees with content: {mismatched:?}"
    );

    // 7. Every template has a provider binding, and SMS bindings await ids.
    let (templates_without_binding, sms_bindings_pending): (i64, i64) = sqlx::query_as(
        "SELECT count(*) FILTER (WHERE NOT EXISTS ( \
                    SELECT 1 FROM messaging_template_provider p WHERE p.template_id = t.id)), \
                count(*) FILTER (WHERE t.channel = 'sms' AND EXISTS ( \
                    SELECT 1 FROM messaging_template_provider p \
                    WHERE p.template_id = t.id AND p.sync_status = 'pending_approval')) \
         FROM messaging_template t WHERE t.deleted_at IS NULL",
    )
    .fetch_one(&pool)
    .await
    .expect("check provider bindings");
    assert_eq!(templates_without_binding, 0, "every seeded template needs a provider binding");
    assert_eq!(
        sms_bindings_pending, sms_total,
        "every SMS template must await its provider template id"
    );

    // 8. Re-applying the profile is a no-op (seed idempotency).
    let before: i64 = sqlx::query_scalar("SELECT count(*) FROM messaging_template")
        .fetch_one(&pool)
        .await
        .expect("count before reseed");
    apply_standard_profile(&pool).await;
    let after: i64 = sqlx::query_scalar("SELECT count(*) FROM messaging_template")
        .fetch_one(&pool)
        .await
        .expect("count after reseed");
    assert_eq!(before, after, "re-running the seed must not duplicate rows");

    sqlx::raw_sql(sqlx::AssertSqlSafe(format!("DROP SCHEMA {schema} CASCADE")))
        .execute(&mut admin)
        .await
        .expect("drop throwaway schema");
}
