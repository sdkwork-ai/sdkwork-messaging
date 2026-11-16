use std::path::PathBuf;
use std::sync::Arc;

use sdkwork_database_config::DatabaseConfig;
use sdkwork_database_lifecycle::{lifecycle_options_from_env, LifecycleOrchestrator};
use sdkwork_database_spi::{DatabaseAssetProvider, DatabaseManifest, DefaultDatabaseModule};
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool};

pub struct MessagingDatabaseHost {
    pool: DatabasePool,
    module: Arc<DefaultDatabaseModule>,
}

impl MessagingDatabaseHost {
    pub fn pool(&self) -> &DatabasePool {
        &self.pool
    }

    pub fn module(&self) -> Arc<DefaultDatabaseModule> {
        self.module.clone()
    }
}

pub async fn bootstrap_messaging_database(
    pool: DatabasePool,
) -> Result<MessagingDatabaseHost, String> {
    let app_root = resolve_app_root();
    let module = Arc::new(
        DefaultDatabaseModule::from_app_root(&app_root)
            .map_err(|error| format!("load messaging database module failed: {error}"))?,
    );
    let manifest = DatabaseManifest::from_file(module.manifest_path())
        .map_err(|error| format!("read messaging database manifest failed: {error}"))?;
    let options = lifecycle_options_from_env("MESSAGING", &manifest);
    let orchestrator = LifecycleOrchestrator::new(pool.clone(), module.clone())
        .with_applied_by("sdkwork-messaging");

    orchestrator
        .init()
        .await
        .map_err(|error| format!("messaging database init failed: {error}"))?;

    if options.auto_migrate {
        orchestrator
            .migrate()
            .await
            .map_err(|error| format!("messaging database migrate failed: {error}"))?;
    }

    if options.seed_on_boot {
        orchestrator
            .seed(&options.seed_locale, &options.seed_profile)
            .await
            .map_err(|error| format!("messaging database seed failed: {error}"))?;
    }

    Ok(MessagingDatabaseHost { pool, module })
}

pub async fn bootstrap_messaging_database_from_env() -> Result<MessagingDatabaseHost, String> {
    let _ = dotenvy::dotenv();
    let config = DatabaseConfig::from_env("MESSAGING")
        .map_err(|error| format!("read messaging database config failed: {error}"))?;
    let pool = create_pool_from_config(config)
        .await
        .map_err(|error| format!("create messaging database pool failed: {error}"))?;
    bootstrap_messaging_database(pool).await
}

/// Resolves the Messaging application root that owns `database/`.
///
/// `SDKWORK_MESSAGING_APP_ROOT` wins because packaged hosts stage the module
/// under `<install root>/database-modules/sdkwork-messaging/database`; the
/// crate's own repository root is the development fallback.
pub fn resolve_app_root() -> PathBuf {
    std::env::var("SDKWORK_MESSAGING_APP_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../..")
                .canonicalize()
                .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
        })
}

/// Loads the canonical Messaging database module from the resolved app root.
///
/// Mirrors the entrypoint every other `*-database-host` crate exposes so a
/// composing host (for example the CloudRouter installer, which mounts the
/// messaging backend surface) can register Messaging into its own lifecycle
/// registry and apply the exact same baseline, migrations, and seed set on an
/// explicit install/upgrade. Registering it is what makes the email/SMS
/// provider, sender/signature, rule, and template seeds land during a packaged
/// deployment instead of only at a development gateway boot.
pub fn database_module() -> Result<DefaultDatabaseModule, String> {
    DefaultDatabaseModule::from_app_root(&resolve_app_root())
        .map_err(|error| format!("load messaging database module failed: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    const SEED_MANIFEST: &str = include_str!("../../../database/seeds/seed.manifest.json");
    const EMAIL_SEED: &str =
        include_str!("../../../database/seeds/common/002_email_provider_defaults.sql");
    const SMS_SEED: &str =
        include_str!("../../../database/seeds/common/003_sms_provider_defaults.sql");
    const ZH_TEMPLATES: &str =
        include_str!("../../../database/seeds/locales/zh-CN/001_message_templates.sql");
    const EN_TEMPLATES: &str =
        include_str!("../../../database/seeds/locales/en-US/001_message_templates.sql");

    /// The standard profile backs every explicit install/upgrade; provider,
    /// identity, rule, and template seeds have to be registered there or
    /// `/admin/notify/email` and `/admin/notify/sms` open empty on a database
    /// that reports itself installed.
    #[test]
    fn standard_profile_ships_every_notification_initialization_seed() {
        for needle in [
            "001_bootstrap.sql",
            "002_email_provider_defaults.sql",
            "003_sms_provider_defaults.sql",
        ] {
            assert!(
                SEED_MANIFEST.contains(needle),
                "the standard seed profile must register {needle}"
            );
        }
        for locale in ["zh-CN", "en-US"] {
            assert!(
                SEED_MANIFEST.contains(&format!("locales/{locale}/001_message_templates.sql")),
                "the standard seed profile must register the {locale} template seed"
            );
        }
    }

    /// The installation defaults are contractual: Tencent Enterprise Mail is the
    /// active email provider and Tencent Cloud SMS is the active SMS provider,
    /// with their sender/signature and every scenario rule enabled so only the
    /// operator credential is missing after deployment.
    #[test]
    fn installation_defaults_are_tencent_enterprise_mail_and_tencent_cloud_sms() {
        assert!(
            EMAIL_SEED.contains("'enterprise_mail'"),
            "the enterprise mailbox provider must be seeded"
        );
        assert!(
            EMAIL_SEED.contains("smtp.exmail.qq.com"),
            "the enterprise mailbox SMTP endpoint must be preset"
        );
        assert!(
            EMAIL_SEED.contains("no-reply@birdcoder.com"),
            "the enterprise mailbox login must stay in the email seed"
        );
        assert!(
            SMS_SEED.contains("'tencent'") && SMS_SEED.contains("sms.tencentcloudapi.com"),
            "the Tencent Cloud SMS provider and endpoint must be seeded"
        );
        assert!(
            SMS_SEED.contains("ap-guangzhou"),
            "the Tencent Cloud SMS region must be seeded"
        );

        // Email: 13 provider accounts + 13 senders + 4 scenario rules.
        assert_eq!(
            EMAIL_SEED.matches("seed-messaging-email-account-").count(),
            13,
            "one email account row per supported provider"
        );
        assert_eq!(
            EMAIL_SEED.matches("seed-messaging-email-sender-").count(),
            13,
            "one sender identity per email provider account"
        );
        assert_eq!(
            EMAIL_SEED.matches("seed-messaging-email-rule-").count(),
            4,
            "one email routing rule per scenario"
        );
        // SMS: 8 provider accounts + 8 signatures + 4 scenario rules.
        assert_eq!(
            SMS_SEED.matches("seed-messaging-sms-account-").count(),
            8,
            "one sms account row per supported provider"
        );
        assert_eq!(
            SMS_SEED.matches("seed-messaging-sms-signature-").count(),
            8,
            "one signature identity per sms provider account"
        );
        assert_eq!(
            SMS_SEED.matches("seed-messaging-sms-rule-").count(),
            4,
            "one sms routing rule per scenario"
        );
    }

    /// Both active locales ship the full ten-email/ten-sms template set.
    #[test]
    fn every_active_locale_ships_the_full_template_set() {
        for (locale, prefix, sql) in [
            ("zh-CN", "seed-tpl-zh-", ZH_TEMPLATES),
            ("en-US", "seed-tpl-en-", EN_TEMPLATES),
        ] {
            assert_eq!(
                sql.matches(&format!("{prefix}email-")).count(),
                10,
                "{locale} must seed ten email templates"
            );
            assert_eq!(
                sql.matches(&format!("{prefix}sms-")).count(),
                10,
                "{locale} must seed ten sms templates"
            );
            assert_eq!(
                sql.matches(&format!("{prefix}email-")).count()
                    + sql.matches(&format!("{prefix}sms-")).count(),
                20,
                "{locale} must seed the full twenty-template set"
            );
        }
    }

    #[test]
    fn database_module_loads_the_repository_manifest() {
        let module = database_module().expect("load the Messaging database module");
        assert_eq!(module.manifest().module_id, "messaging");
    }
}
