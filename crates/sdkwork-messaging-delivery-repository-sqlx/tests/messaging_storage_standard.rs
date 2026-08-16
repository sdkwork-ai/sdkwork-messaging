use sdkwork_messaging_delivery_repository_sqlx::{
    messaging_announcement_tables, messaging_channel_tables, messaging_initial_migration_sql,
    messaging_notification_tables, messaging_outbound_tables, messaging_push_tables,
    messaging_storage_capability_manifest, messaging_template_tables, messaging_verification_tables,
};

#[test]
fn splits_messaging_tables_by_product_capability() {
    assert_eq!(
        messaging_notification_tables(),
        vec!["messaging_notification", "messaging_notification_recipient"],
    );
    assert_eq!(
        messaging_announcement_tables(),
        vec![
            "messaging_announcement",
            "messaging_announcement_audience",
            "messaging_announcement_receipt",
        ],
    );
    assert_eq!(
        messaging_push_tables(),
        vec![
            "messaging_push_device",
            "messaging_push_message",
            "messaging_push_delivery",
        ],
    );
    assert_eq!(
        messaging_outbound_tables(),
        vec!["messaging_outbound_message", "messaging_outbound_delivery"],
    );
    assert_eq!(
        messaging_verification_tables(),
        vec![
            "messaging_verification_policy",
            "messaging_verification_challenge",
            "messaging_verification_attempt",
        ],
    );
    assert_eq!(messaging_channel_tables(), vec!["messaging_channel"]);
    assert_eq!(messaging_template_tables(), vec!["messaging_template"]);
}

#[test]
fn initial_migration_declares_app_sms_email_and_verification_tables() {
    let sql = messaging_initial_migration_sql();

    for expected in [
        "CREATE TABLE IF NOT EXISTS messaging_notification",
        "CREATE TABLE IF NOT EXISTS messaging_notification_recipient",
        "CREATE TABLE IF NOT EXISTS messaging_announcement",
        "CREATE TABLE IF NOT EXISTS messaging_announcement_audience",
        "CREATE TABLE IF NOT EXISTS messaging_announcement_receipt",
        "CREATE TABLE IF NOT EXISTS messaging_push_device",
        "CREATE TABLE IF NOT EXISTS messaging_push_message",
        "CREATE TABLE IF NOT EXISTS messaging_push_delivery",
        "CREATE TABLE IF NOT EXISTS messaging_outbound_message",
        "CREATE TABLE IF NOT EXISTS messaging_outbound_delivery",
        "CREATE TABLE IF NOT EXISTS messaging_verification_policy",
        "CREATE TABLE IF NOT EXISTS messaging_verification_challenge",
        "CREATE TABLE IF NOT EXISTS messaging_verification_attempt",
        "tenant_id BIGINT NOT NULL DEFAULT 0",
        "organization_id BIGINT NOT NULL DEFAULT 0",
        "created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
        "updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP",
        "CREATE INDEX IF NOT EXISTS idx_messaging_notification_recipient_inbox",
        "CREATE INDEX IF NOT EXISTS idx_messaging_announcement_audience_publish",
        "CREATE INDEX IF NOT EXISTS idx_messaging_push_delivery_message_status",
        "CREATE INDEX IF NOT EXISTS idx_messaging_outbound_delivery_message_status",
        "CREATE INDEX IF NOT EXISTS idx_messaging_verification_challenge_scene_target",
        "CREATE INDEX IF NOT EXISTS idx_messaging_verification_challenge_expiry",
    ] {
        assert!(
            sql.contains(expected),
            "messaging migration must contain `{expected}`",
        );
    }

    for forbidden in [
        "chat_session",
        "provider_capability",
        "sender_identity",
        "template",
        "route_rule",
        "suppression",
        "rate_limit",
    ] {
        assert!(
            !sql.contains(forbidden),
            "messaging migration must not retain old capability `{forbidden}`",
        );
    }
}

#[test]
fn initial_migration_tracks_idempotent_payload_and_verification_lifecycle() {
    let sql = messaging_initial_migration_sql();

    for expected in [
        "payload_hash VARCHAR(128) NOT NULL",
        "CONSTRAINT uk_messaging_notification_idempotency UNIQUE (tenant_id, organization_id, idempotency_key)",
        "CONSTRAINT uk_messaging_announcement_idempotency UNIQUE (tenant_id, organization_id, idempotency_key)",
        "CONSTRAINT uk_messaging_verification_challenge_idempotency UNIQUE (tenant_id, organization_id, idempotency_key)",
        "CONSTRAINT uk_messaging_verification_attempt_idempotency UNIQUE (tenant_id, organization_id, challenge_id, idempotency_key)",
        "attempt_count INTEGER NOT NULL DEFAULT 0",
        "verified_at TIMESTAMPTZ",
        "locked_at TIMESTAMPTZ",
        "expired_at TIMESTAMPTZ",
        "CONSTRAINT ck_messaging_verification_attempt_count_non_negative CHECK (attempt_count >= 0)",
    ] {
        assert!(
            sql.contains(expected),
            "messaging migration must contain `{expected}`",
        );
    }
}

#[test]
fn initial_migration_enforces_referential_integrity_between_messaging_tables() {
    let sql = messaging_initial_migration_sql();

    for expected in [
        "CONSTRAINT fk_messaging_notification_recipient_notification FOREIGN KEY (notification_id) REFERENCES messaging_notification(id)",
        "CONSTRAINT fk_messaging_announcement_audience_announcement FOREIGN KEY (announcement_id) REFERENCES messaging_announcement(id)",
        "CONSTRAINT fk_messaging_announcement_receipt_announcement FOREIGN KEY (announcement_id) REFERENCES messaging_announcement(id)",
        "CONSTRAINT fk_messaging_push_delivery_message FOREIGN KEY (push_message_id) REFERENCES messaging_push_message(id)",
        "CONSTRAINT fk_messaging_push_delivery_device FOREIGN KEY (push_device_id) REFERENCES messaging_push_device(id)",
        "CONSTRAINT fk_messaging_outbound_delivery_message FOREIGN KEY (outbound_message_id) REFERENCES messaging_outbound_message(id)",
        "CONSTRAINT fk_messaging_verification_challenge_policy FOREIGN KEY (tenant_id, organization_id, scene_code, channel) REFERENCES messaging_verification_policy(tenant_id, organization_id, scene_code, channel)",
        "CONSTRAINT fk_messaging_verification_challenge_outbound_message FOREIGN KEY (outbound_message_id) REFERENCES messaging_outbound_message(id)",
        "CONSTRAINT fk_messaging_verification_attempt_challenge FOREIGN KEY (challenge_id) REFERENCES messaging_verification_challenge(id)",
    ] {
        assert!(
            sql.contains(expected),
            "messaging migration must contain `{expected}`",
        );
    }
}

#[test]
fn initial_migration_enforces_messaging_domain_invariants() {
    let sql = messaging_initial_migration_sql();

    for expected in [
        "CONSTRAINT ck_messaging_notification_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))",
        "CONSTRAINT ck_messaging_notification_recipient_status CHECK (status IN ('unread', 'read', 'archived'))",
        "CONSTRAINT ck_messaging_announcement_status CHECK (status IN ('draft', 'scheduled', 'published', 'expired', 'cancelled'))",
        "CONSTRAINT ck_messaging_announcement_window CHECK (expire_at IS NULL OR publish_at IS NULL OR expire_at > publish_at)",
        "CONSTRAINT ck_messaging_announcement_audience_kind CHECK (audience_kind IN ('all_users', 'tenant', 'organization', 'role', 'user_segment', 'explicit_users'))",
        "CONSTRAINT ck_messaging_push_device_platform CHECK (platform IN ('ios', 'android', 'web'))",
        "CONSTRAINT ck_messaging_push_message_badge_non_negative CHECK (badge IS NULL OR badge >= 0)",
        "CONSTRAINT ck_messaging_push_message_status CHECK (status IN ('accepted', 'queued', 'sent', 'delivered', 'failed', 'opened', 'cancelled', 'expired'))",
        "CONSTRAINT ck_messaging_push_delivery_status CHECK (status IN ('accepted', 'queued', 'sent', 'delivered', 'failed', 'opened', 'cancelled', 'expired'))",
        "CONSTRAINT ck_messaging_outbound_message_channel CHECK (channel IN ('sms', 'email'))",
        "CONSTRAINT ck_messaging_outbound_message_status CHECK (status IN ('accepted', 'queued', 'sent', 'delivered', 'failed', 'opened', 'cancelled', 'expired'))",
        "CONSTRAINT ck_messaging_outbound_delivery_channel CHECK (channel IN ('sms', 'email'))",
        "CONSTRAINT ck_messaging_outbound_delivery_status CHECK (status IN ('accepted', 'queued', 'sent', 'delivered', 'failed', 'opened', 'cancelled', 'expired'))",
        "CONSTRAINT ck_messaging_verification_policy_channel CHECK (channel IN ('sms', 'email'))",
        "CONSTRAINT ck_messaging_verification_policy_ttl_positive CHECK (ttl_seconds > 0)",
        "CONSTRAINT ck_messaging_verification_policy_max_attempts_positive CHECK (max_attempts > 0)",
        "CONSTRAINT ck_messaging_verification_challenge_channel CHECK (channel IN ('sms', 'email'))",
        "CONSTRAINT ck_messaging_verification_challenge_status CHECK (status IN ('pending', 'verified', 'failed', 'locked', 'expired'))",
        "CONSTRAINT ck_messaging_verification_challenge_terminal_timestamps CHECK (",
    ] {
        assert!(
            sql.contains(expected),
            "messaging migration must contain `{expected}`",
        );
    }
}

#[test]
fn manifest_declares_messaging_storage_contract() {
    let manifest = messaging_storage_capability_manifest();

    assert_eq!(manifest.name, "messaging-storage");
    assert_eq!(manifest.schema_version, "2026-06-06");
    assert_eq!(manifest.migrations, vec!["0001_messaging_storage.sql"]);
    assert_eq!(
        manifest.notification_tables,
        messaging_notification_tables()
    );
    assert_eq!(
        manifest.announcement_tables,
        messaging_announcement_tables()
    );
    assert_eq!(manifest.push_tables, messaging_push_tables());
    assert_eq!(manifest.outbound_tables, messaging_outbound_tables());
    assert_eq!(
        manifest.verification_tables,
        messaging_verification_tables()
    );
    assert_eq!(manifest.channel_tables, messaging_channel_tables());
    assert_eq!(manifest.template_tables, messaging_template_tables());
    assert!(manifest
        .repository_bindings
        .iter()
        .any(|binding| binding.repository_name == "MessagingNotificationRepository"));
    assert!(manifest
        .repository_bindings
        .iter()
        .any(|binding| binding.repository_name == "MessagingAnnouncementRepository"));
    assert!(manifest
        .repository_bindings
        .iter()
        .any(|binding| binding.repository_name == "MessagingPushRepository"));
    assert!(manifest
        .repository_bindings
        .iter()
        .any(|binding| binding.repository_name == "MessagingOutboundRepository"));
    assert!(manifest
        .repository_bindings
        .iter()
        .any(|binding| binding.repository_name == "MessagingVerificationRepository"));
    assert!(manifest
        .repository_bindings
        .iter()
        .any(|binding| binding.repository_name == "MessagingChannelRepository"));
    assert!(manifest
        .repository_bindings
        .iter()
        .any(|binding| binding.repository_name == "MessagingTemplateRepository"));
}
