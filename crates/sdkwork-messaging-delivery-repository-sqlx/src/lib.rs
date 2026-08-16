mod bootstrap;

pub use bootstrap::{
    bootstrap_messaging_database, bootstrap_messaging_database_from_env,
    connect_and_bootstrap_messaging_database_from_env, connect_messaging_database_pool_from_env,
    MessagingDatabaseHost, MessagingDatabasePool,
};

pub const MESSAGING_STORAGE_MIGRATION: &str = "0001_messaging_storage.sql";

const MESSAGING_INITIAL_MIGRATION_SQL: &str =
    include_str!("../migrations/0001_messaging_storage.sql");

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MessagingRepositoryBinding {
    pub domain: &'static str,
    pub repository_name: &'static str,
    pub tables: Vec<&'static str>,
    pub requires_transaction: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MessagingStorageCapabilityManifest {
    pub name: &'static str,
    pub schema_version: &'static str,
    pub tables: Vec<&'static str>,
    pub notification_tables: Vec<&'static str>,
    pub announcement_tables: Vec<&'static str>,
    pub push_tables: Vec<&'static str>,
    pub outbound_tables: Vec<&'static str>,
    pub verification_tables: Vec<&'static str>,
    pub channel_tables: Vec<&'static str>,
    pub template_tables: Vec<&'static str>,
    pub migrations: Vec<&'static str>,
    pub repository_bindings: Vec<MessagingRepositoryBinding>,
}

pub fn messaging_notification_tables() -> Vec<&'static str> {
    vec!["messaging_notification", "messaging_notification_recipient"]
}

pub fn messaging_announcement_tables() -> Vec<&'static str> {
    vec![
        "messaging_announcement",
        "messaging_announcement_audience",
        "messaging_announcement_receipt",
    ]
}

pub fn messaging_push_tables() -> Vec<&'static str> {
    vec![
        "messaging_push_device",
        "messaging_push_message",
        "messaging_push_delivery",
    ]
}

pub fn messaging_outbound_tables() -> Vec<&'static str> {
    vec!["messaging_outbound_message", "messaging_outbound_delivery"]
}

pub fn messaging_verification_tables() -> Vec<&'static str> {
    vec![
        "messaging_verification_policy",
        "messaging_verification_challenge",
        "messaging_verification_attempt",
    ]
}

pub fn messaging_channel_tables() -> Vec<&'static str> {
    vec!["messaging_channel"]
}

pub fn messaging_template_tables() -> Vec<&'static str> {
    vec!["messaging_template"]
}

pub fn messaging_storage_tables() -> Vec<&'static str> {
    let mut tables = messaging_notification_tables();
    tables.extend(messaging_announcement_tables());
    tables.extend(messaging_push_tables());
    tables.extend(messaging_outbound_tables());
    tables.extend(messaging_verification_tables());
    tables.extend(messaging_channel_tables());
    tables.extend(messaging_template_tables());
    tables
}

pub fn is_messaging_storage_table(table: &str) -> bool {
    messaging_storage_tables().contains(&table)
}

pub fn messaging_initial_migration_sql() -> &'static str {
    MESSAGING_INITIAL_MIGRATION_SQL
}

pub fn messaging_storage_capability_manifest() -> MessagingStorageCapabilityManifest {
    MessagingStorageCapabilityManifest {
        name: "messaging-storage",
        schema_version: "2026-06-06",
        tables: messaging_storage_tables(),
        notification_tables: messaging_notification_tables(),
        announcement_tables: messaging_announcement_tables(),
        push_tables: messaging_push_tables(),
        outbound_tables: messaging_outbound_tables(),
        verification_tables: messaging_verification_tables(),
        channel_tables: messaging_channel_tables(),
        template_tables: messaging_template_tables(),
        migrations: vec![MESSAGING_STORAGE_MIGRATION],
        repository_bindings: vec![
            MessagingRepositoryBinding {
                domain: "messaging",
                repository_name: "MessagingNotificationRepository",
                tables: messaging_notification_tables(),
                requires_transaction: true,
            },
            MessagingRepositoryBinding {
                domain: "messaging",
                repository_name: "MessagingAnnouncementRepository",
                tables: messaging_announcement_tables(),
                requires_transaction: true,
            },
            MessagingRepositoryBinding {
                domain: "messaging",
                repository_name: "MessagingPushRepository",
                tables: messaging_push_tables(),
                requires_transaction: true,
            },
            MessagingRepositoryBinding {
                domain: "messaging",
                repository_name: "MessagingOutboundRepository",
                tables: messaging_outbound_tables(),
                requires_transaction: true,
            },
            MessagingRepositoryBinding {
                domain: "messaging",
                repository_name: "MessagingVerificationRepository",
                tables: messaging_verification_tables(),
                requires_transaction: true,
            },
            MessagingRepositoryBinding {
                domain: "messaging",
                repository_name: "MessagingChannelRepository",
                tables: messaging_channel_tables(),
                requires_transaction: true,
            },
            MessagingRepositoryBinding {
                domain: "messaging",
                repository_name: "MessagingTemplateRepository",
                tables: messaging_template_tables(),
                requires_transaction: true,
            },
        ],
    }
}
