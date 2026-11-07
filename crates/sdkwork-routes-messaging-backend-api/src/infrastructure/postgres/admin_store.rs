//! PostgreSQL implementation of [`MessagingAdminStore`].

use std::collections::HashMap;
use std::sync::Arc;

use chrono::Utc;
use sdkwork_messaging_delivery_service::EncodedMessagingSecret;
use sdkwork_utils_rust::{sha256_hash, uuid};
use sqlx::{PgPool, Row};

use crate::application::messaging_secret_codec::{
    AesGcmMessagingSecretCodec, MessagingSecretCodec, MessagingSecretContext,
};
use crate::infrastructure::runtime_id::MessagingRuntimeIdGenerator;
use crate::ports::{
    mask_secret, mask_target, AnnouncementItem, CreateEmailAccountCommand,
    CreateEmailSenderCommand, CreateNotificationCommand, CreateSmsAccountCommand,
    CreateSmsSignatureCommand, CreateTemplateCommand, EmailAccountItem, EmailSendRuleItem,
    EmailSendRuleStep, EmailSenderItem, MessagingAdminStore, MessagingAdminSubject, MessagingPage,
    NotificationItem, OutboundMessageItem, PublishAnnouncementCommand, PushMessageItem,
    SendOutboundMessageCommand, SendPushMessageCommand, SmsAccountItem, SmsSendRuleItem,
    SmsSendRuleStep, SmsSignatureItem, StoreError, TemplateItem, UpdateEmailAccountCommand,
    UpdateEmailSendRuleCommand, UpdateEmailSenderCommand, UpdateSmsAccountCommand,
    UpdateSmsSendRuleCommand, UpdateSmsSignatureCommand, UpdateTemplateCommand,
    UpdateVerificationPolicyCommand, VerificationPolicyItem, SEND_RULE_SCENARIOS,
};

pub struct PostgresMessagingAdminStore {
    pool: PgPool,
    id_generator: Arc<MessagingRuntimeIdGenerator>,
    secret_codec: Arc<dyn MessagingSecretCodec + Send + Sync>,
}

impl PostgresMessagingAdminStore {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            id_generator: Arc::new(MessagingRuntimeIdGenerator::new()),
            secret_codec: Arc::new(AesGcmMessagingSecretCodec::from_env()),
        }
    }

    pub fn with_codec(
        pool: PgPool,
        secret_codec: Arc<dyn MessagingSecretCodec + Send + Sync>,
    ) -> Self {
        Self {
            pool,
            id_generator: Arc::new(MessagingRuntimeIdGenerator::new()),
            secret_codec,
        }
    }

    fn next_id(&self) -> i64 {
        self.id_generator.next_id()
    }

    fn channel_secret_context(
        &self,
        subject: &MessagingAdminSubject,
        channel: &str,
    ) -> MessagingSecretContext {
        MessagingSecretContext {
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            channel: channel.to_owned(),
        }
    }

    fn mask_from_fingerprint(&self, fingerprint: &str) -> String {
        if fingerprint.len() <= 12 {
            "********".to_owned()
        } else {
            format!("********{}", &fingerprint[fingerprint.len() - 6..])
        }
    }

    async fn email_account_item(
        &self,
        subject: &MessagingAdminSubject,
        row: sqlx::postgres::PgRow,
    ) -> Result<EmailAccountItem, StoreError> {
        let key_id: Option<String> = row.get("secret_key_id");
        let ciphertext: Option<String> = row.get("secret_ciphertext");
        let fingerprint: Option<String> = row.get("secret_fingerprint");
        let key_display_masked = self
            .resolve_channel_mask(
                subject,
                "email",
                key_id.as_deref(),
                ciphertext.as_deref(),
                fingerprint.as_deref(),
            )
            .await;
        Ok(EmailAccountItem {
            id: row.get::<i64, _>("id").to_string(),
            name: row.get("name"),
            provider: row.get("provider"),
            config: row.get("config_json"),
            has_secret: fingerprint.is_some(),
            key_display_masked,
            enabled: row.get("enabled"),
            version: row.get::<i64, _>("version").to_string(),
            created_at: rfc3339(row.get("created_at")),
            updated_at: rfc3339(row.get("updated_at")),
        })
    }
    async fn sms_account_item(
        &self,
        subject: &MessagingAdminSubject,
        row: sqlx::postgres::PgRow,
    ) -> Result<SmsAccountItem, StoreError> {
        let key_id: Option<String> = row.get("secret_key_id");
        let ciphertext: Option<String> = row.get("secret_ciphertext");
        let fingerprint: Option<String> = row.get("secret_fingerprint");
        let key_display_masked = self
            .resolve_channel_mask(
                subject,
                "sms",
                key_id.as_deref(),
                ciphertext.as_deref(),
                fingerprint.as_deref(),
            )
            .await;
        Ok(SmsAccountItem {
            id: row.get::<i64, _>("id").to_string(),
            name: row.get("name"),
            provider: row.get("provider"),
            config: row.get("config_json"),
            has_secret: fingerprint.is_some(),
            key_display_masked,
            enabled: row.get("enabled"),
            version: row.get::<i64, _>("version").to_string(),
            created_at: rfc3339(row.get("created_at")),
            updated_at: rfc3339(row.get("updated_at")),
        })
    }

    fn encode_channel_secret(
        &self,
        subject: &MessagingAdminSubject,
        channel: &str,
        secret: Option<&String>,
    ) -> Result<Option<EncodedMessagingSecret>, StoreError> {
        match secret {
            Some(secret) if secret.trim().is_empty() => Ok(None),
            Some(secret) => {
                let context = self.channel_secret_context(subject, channel);
                self.secret_codec
                    .encode(&context, secret)
                    .map(Some)
                    .map_err(StoreError::Invalid)
            }
            None => Ok(None),
        }
    }

    /// Classifies a failed conditional update (§17): version mismatch on a
    /// live row is a conflict; a missing/soft-deleted row is not-found.
    /// `table` only ever receives this module's own table-name constants.
    async fn version_conflict_or_missing(
        &self,
        table: &str,
        id: i64,
        subject: &MessagingAdminSubject,
        label: &str,
    ) -> StoreError {
        // Table is matched against a static whitelist, keeping every SQL
        // string here a compile-time constant (no dynamic SQL audit needed).
        let sql: &str = match table {
            "messaging_email_account" => {
                "SELECT 1 FROM messaging_email_account WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL"
            }
            "messaging_email_sender" => {
                "SELECT 1 FROM messaging_email_sender WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL"
            }
            "messaging_sms_account" => {
                "SELECT 1 FROM messaging_sms_account WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL"
            }
            "messaging_sms_signature" => {
                "SELECT 1 FROM messaging_sms_signature WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL"
            }
            other => return StoreError::Unavailable(format!("unknown table `{other}`")),
        };
        match sqlx::query(sql)
            .bind(id)
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .fetch_optional(&self.pool)
            .await
        {
            Ok(Some(_)) => StoreError::Conflict(format!(
                "{label} was modified concurrently; reload and retry"
            )),
            Ok(None) => StoreError::NotFound(format!("{label} not found")),
            Err(error) => StoreError::Unavailable(error.to_string()),
        }
    }

    async fn resolve_channel_mask(
        &self,
        subject: &MessagingAdminSubject,
        channel: &str,
        key_id: Option<&str>,
        ciphertext: Option<&str>,
        fingerprint: Option<&str>,
    ) -> String {
        let context = self.channel_secret_context(subject, channel);
        match (key_id, ciphertext) {
            (Some(key_id), Some(ciphertext)) => {
                match self.secret_codec.decode(&context, key_id, ciphertext) {
                    Ok(plaintext) => mask_secret(&plaintext),
                    Err(_) => fingerprint
                        .map(|value| self.mask_from_fingerprint(value))
                        .unwrap_or_else(|| "********".to_owned()),
                }
            }
            _ => "********".to_owned(),
        }
    }

    async fn load_email_sender(
        &self,
        subject: &MessagingAdminSubject,
        sender_id: i64,
    ) -> Result<EmailSenderItem, StoreError> {
        let row = sqlx::query(
            "SELECT s.id, s.account_id, a.name AS account_name, s.from_address, s.from_name, s.enabled, s.version, s.created_at, s.updated_at \
             FROM messaging_email_sender s \
             JOIN messaging_email_account a ON a.id = s.account_id \
             WHERE s.id = $1 AND s.tenant_id = $2 AND s.organization_id = $3 AND s.deleted_at IS NULL",
        )
        .bind(sender_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?
        .ok_or_else(|| StoreError::NotFound("email sender not found".to_owned()))?;
        email_sender_item_from_row(row).map_err(|error| StoreError::Unavailable(error.to_string()))
    }

    /// Resolves stored sender-id chains into routing steps in chain order.
    /// Senders that disappeared (soft-deleted) are pruned from the view.
    async fn resolve_email_chain(
        &self,
        subject: &MessagingAdminSubject,
        sender_ids: &[String],
    ) -> Result<Vec<EmailSendRuleStep>, StoreError> {
        if sender_ids.is_empty() {
            return Ok(Vec::new());
        }
        let mut parsed = Vec::with_capacity(sender_ids.len());
        for raw in sender_ids {
            parsed.push(parse_scope_id(raw, "senderId")?);
        }
        let rows = sqlx::query(
            "SELECT s.id, s.account_id, a.name AS account_name, s.from_address, s.from_name, s.enabled \
             FROM messaging_email_sender s \
             JOIN messaging_email_account a ON a.id = s.account_id \
             WHERE s.tenant_id = $1 AND s.organization_id = $2 AND s.id = ANY($3) AND s.deleted_at IS NULL",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(&parsed)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        let mut by_id: HashMap<i64, sqlx::postgres::PgRow> = rows
            .into_iter()
            .map(|row| (row.get::<i64, _>("id"), row))
            .collect();
        let mut chain = Vec::with_capacity(parsed.len());
        for id in parsed {
            if let Some(row) = by_id.remove(&id) {
                chain.push(EmailSendRuleStep {
                    sender_id: id.to_string(),
                    account_id: row.get::<i64, _>("account_id").to_string(),
                    account_name: row.get("account_name"),
                    from_address: row.get("from_address"),
                    from_name: row.get("from_name"),
                    enabled: row.get("enabled"),
                });
            }
        }
        Ok(chain)
    }
    async fn load_sms_signature(
        &self,
        subject: &MessagingAdminSubject,
        signature_id: i64,
    ) -> Result<SmsSignatureItem, StoreError> {
        let row = sqlx::query(
            "SELECT s.id, s.account_id, a.name AS account_name, s.sign_name, s.enabled, s.version, s.created_at, s.updated_at \
             FROM messaging_sms_signature s \
             JOIN messaging_sms_account a ON a.id = s.account_id \
             WHERE s.id = $1 AND s.tenant_id = $2 AND s.organization_id = $3 AND s.deleted_at IS NULL",
        )
        .bind(signature_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?
        .ok_or_else(|| StoreError::NotFound("sms signature not found".to_owned()))?;
        sms_signature_item_from_row(row).map_err(|error| StoreError::Unavailable(error.to_string()))
    }

    async fn resolve_sms_chain(
        &self,
        subject: &MessagingAdminSubject,
        signature_ids: &[String],
    ) -> Result<Vec<SmsSendRuleStep>, StoreError> {
        if signature_ids.is_empty() {
            return Ok(Vec::new());
        }
        let mut parsed = Vec::with_capacity(signature_ids.len());
        for raw in signature_ids {
            parsed.push(parse_scope_id(raw, "senderId")?);
        }
        let rows = sqlx::query(
            "SELECT s.id, s.account_id, a.name AS account_name, s.sign_name, s.enabled \
             FROM messaging_sms_signature s \
             JOIN messaging_sms_account a ON a.id = s.account_id \
             WHERE s.tenant_id = $1 AND s.organization_id = $2 AND s.id = ANY($3) AND s.deleted_at IS NULL",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(&parsed)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        let mut by_id: HashMap<i64, sqlx::postgres::PgRow> = rows
            .into_iter()
            .map(|row| (row.get::<i64, _>("id"), row))
            .collect();
        let mut chain = Vec::with_capacity(parsed.len());
        for id in parsed {
            if let Some(row) = by_id.remove(&id) {
                chain.push(SmsSendRuleStep {
                    signature_id: id.to_string(),
                    account_id: row.get::<i64, _>("account_id").to_string(),
                    account_name: row.get("account_name"),
                    sign_name: row.get("sign_name"),
                    enabled: row.get("enabled"),
                });
            }
        }
        Ok(chain)
    }
}

fn rfc3339(value: chrono::DateTime<Utc>) -> String {
    value.to_rfc3339()
}

fn is_unique_violation(error: &sqlx::Error) -> bool {
    matches!(error, sqlx::Error::Database(db_error) if db_error.code().as_deref() == Some("23505"))
}

/// Parses a wire-level resource id into a positive numeric id.
fn parse_scope_id(raw: &str, field: &str) -> Result<i64, StoreError> {
    raw.trim()
        .parse::<i64>()
        .ok()
        .filter(|value| *value > 0)
        .ok_or_else(|| StoreError::Invalid(format!("{field} must be a positive numeric id")))
}

/// Normalizes an optional single-line text field: blank becomes `None`.
fn trim_optional(value: &Option<String>) -> Option<String> {
    value
        .as_deref()
        .map(str::trim)
        .filter(|trimmed| !trimmed.is_empty())
        .map(str::to_owned)
}

/// Parses the wire-level optimistic concurrency guard (DATABASE_SPEC §17).
fn parse_expected_version(raw: &str) -> Result<i64, StoreError> {
    raw.trim()
        .parse::<i64>()
        .ok()
        .filter(|value| *value >= 0)
        .ok_or_else(|| {
            StoreError::Invalid("expectedVersion must be a non-negative numeric version".to_owned())
        })
}

#[async_trait::async_trait]
impl MessagingAdminStore for PostgresMessagingAdminStore {
    // ------------------------------------------------------------ notifications

    async fn list_notifications(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<NotificationItem>, StoreError> {
        let offset = (page - 1) * page_size;
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_notification \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let rows = sqlx::query(
            "SELECT n.id, n.title, n.body, n.category, n.priority, n.action_url, n.payload_json, n.created_at, \
                    (SELECT MIN(r.status) FROM messaging_notification_recipient r \
                     WHERE r.notification_id = n.id AND r.tenant_id = n.tenant_id AND r.organization_id = n.organization_id) AS recipient_status, \
                    (SELECT MIN(r.read_at) FROM messaging_notification_recipient r \
                     WHERE r.notification_id = n.id AND r.tenant_id = n.tenant_id AND r.organization_id = n.organization_id) AS read_at \
             FROM messaging_notification n \
             WHERE n.tenant_id = $1 AND n.organization_id = $2 AND n.deleted_at IS NULL \
             ORDER BY n.created_at DESC \
             LIMIT $3 OFFSET $4",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let items = rows
            .into_iter()
            .map(|row| NotificationItem {
                id: row.get::<i64, _>("id").to_string(),
                title: row.get("title"),
                body: row.get("body"),
                category: row.get("category"),
                priority: row.get("priority"),
                status: row
                    .get::<Option<String>, _>("recipient_status")
                    .unwrap_or_else(|| "unread".to_owned()),
                action_url: row.get("action_url"),
                metadata: row.get("payload_json"),
                created_at: rfc3339(row.get("created_at")),
                read_at: row
                    .get::<Option<chrono::DateTime<Utc>>, _>("read_at")
                    .map(rfc3339),
            })
            .collect();

        Ok(MessagingPage {
            items,
            page,
            page_size,
            total_items: total,
        })
    }

    async fn create_notification(
        &self,
        subject: &MessagingAdminSubject,
        command: &CreateNotificationCommand,
        idempotency_key: &str,
    ) -> Result<NotificationItem, StoreError> {
        if command.recipient_user_ids.is_empty() {
            return Err(StoreError::Invalid(
                "recipientUserIds must not be empty".to_owned(),
            ));
        }
        let id = self.next_id();
        let notification_uuid = uuid();
        let payload_json = command
            .metadata
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));
        let result = sqlx::query(
            "INSERT INTO messaging_notification \
             (id, uuid, tenant_id, organization_id, notification_key, category, priority, title, body, action_url, payload_json, idempotency_key, payload_hash, created_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)",
        )
        .bind(id)
        .bind(&notification_uuid)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(format!("ntf-{notification_uuid}"))
        .bind(command.category.clone().unwrap_or_else(|| "general".to_owned()))
        .bind(command.priority.clone().unwrap_or_else(|| "normal".to_owned()))
        .bind(&command.title)
        .bind(&command.body)
        .bind(&command.action_url)
        .bind(&payload_json)
        .bind(idempotency_key)
        .bind(sha256_hash(command.body.as_bytes()))
        .bind(subject.operator_id)
        .execute(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict("notification with this idempotency key already exists".to_owned())
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?;
        if result.rows_affected() == 0 {
            return Err(StoreError::Unavailable(
                "notification insert returned no rows".to_owned(),
            ));
        }

        for user_id in &command.recipient_user_ids {
            sqlx::query(
                "INSERT INTO messaging_notification_recipient \
                 (id, uuid, tenant_id, organization_id, notification_id, recipient_user_id, recipient_type, status) \
                 VALUES ($1, $2, $3, $4, $5, $6, 'user', 'unread')",
            )
            .bind(self.next_id())
            .bind(uuid())
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(id)
            .bind(user_id)
            .execute(&self.pool)
            .await
            .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        }

        Ok(NotificationItem {
            id: id.to_string(),
            title: command.title.clone(),
            body: command.body.clone(),
            category: command
                .category
                .clone()
                .unwrap_or_else(|| "general".to_owned()),
            priority: command
                .priority
                .clone()
                .unwrap_or_else(|| "normal".to_owned()),
            status: "unread".to_owned(),
            action_url: command.action_url.clone(),
            metadata: payload_json,
            created_at: rfc3339(Utc::now()),
            read_at: None,
        })
    }

    // ------------------------------------------------------------ announcements

    async fn list_announcements(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<AnnouncementItem>, StoreError> {
        let offset = (page - 1) * page_size;
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_announcement \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let rows = sqlx::query(
            "SELECT id, title, body, severity, status, require_ack, publish_at, expire_at, payload_json, created_at, \
                    (SELECT MIN(r.acknowledged_at) FROM messaging_announcement_receipt r \
                     WHERE r.announcement_id = messaging_announcement.id AND r.tenant_id = messaging_announcement.tenant_id AND r.organization_id = messaging_announcement.organization_id) AS acknowledged_at \
             FROM messaging_announcement \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL \
             ORDER BY created_at DESC \
             LIMIT $3 OFFSET $4",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let items = rows
            .into_iter()
            .map(|row| AnnouncementItem {
                id: row.get::<i64, _>("id").to_string(),
                title: row.get("title"),
                body: row.get("body"),
                severity: row.get("severity"),
                status: row.get("status"),
                require_ack: row.get("require_ack"),
                publish_at: row
                    .get::<Option<chrono::DateTime<Utc>>, _>("publish_at")
                    .map(rfc3339),
                expire_at: row
                    .get::<Option<chrono::DateTime<Utc>>, _>("expire_at")
                    .map(rfc3339),
                acknowledged_at: row
                    .get::<Option<chrono::DateTime<Utc>>, _>("acknowledged_at")
                    .map(rfc3339),
                metadata: row.get("payload_json"),
                created_at: rfc3339(row.get("created_at")),
            })
            .collect();

        Ok(MessagingPage {
            items,
            page,
            page_size,
            total_items: total,
        })
    }

    async fn publish_announcement(
        &self,
        subject: &MessagingAdminSubject,
        command: &PublishAnnouncementCommand,
        idempotency_key: &str,
    ) -> Result<AnnouncementItem, StoreError> {
        if command.audiences.is_empty() {
            return Err(StoreError::Invalid(
                "audiences must not be empty".to_owned(),
            ));
        }
        let id = self.next_id();
        let announcement_uuid = uuid();
        let publish_at = command
            .publish_at
            .as_deref()
            .map(chrono::DateTime::parse_from_rfc3339)
            .transpose()
            .map_err(|error| {
                StoreError::Invalid(format!("publishAt is not a valid date-time: {error}"))
            })?
            .map(|value| value.with_timezone(&Utc));
        let expire_at = command
            .expire_at
            .as_deref()
            .map(chrono::DateTime::parse_from_rfc3339)
            .transpose()
            .map_err(|error| {
                StoreError::Invalid(format!("expireAt is not a valid date-time: {error}"))
            })?
            .map(|value| value.with_timezone(&Utc));
        if let (Some(publish_at), Some(expire_at)) = (&publish_at, &expire_at) {
            if expire_at <= publish_at {
                return Err(StoreError::Invalid(
                    "expireAt must be after publishAt".to_owned(),
                ));
            }
        }
        let now = Utc::now();
        let status = match &publish_at {
            Some(publish_at) if *publish_at > now => "scheduled",
            _ => "published",
        };
        let payload_json = command
            .metadata
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));

        let result = sqlx::query(
            "INSERT INTO messaging_announcement \
             (id, uuid, tenant_id, organization_id, announcement_key, title, body, severity, status, publish_at, expire_at, require_ack, payload_json, idempotency_key, payload_hash, created_by, published_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)",
        )
        .bind(id)
        .bind(&announcement_uuid)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(format!("ann-{announcement_uuid}"))
        .bind(&command.title)
        .bind(&command.body)
        .bind(command.severity.clone().unwrap_or_else(|| "info".to_owned()))
        .bind(status)
        .bind(publish_at)
        .bind(expire_at)
        .bind(command.require_ack.unwrap_or(false))
        .bind(&payload_json)
        .bind(idempotency_key)
        .bind(sha256_hash(command.body.as_bytes()))
        .bind(subject.operator_id)
        .bind(subject.operator_id)
        .execute(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict("announcement with this idempotency key already exists".to_owned())
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?;
        if result.rows_affected() == 0 {
            return Err(StoreError::Unavailable(
                "announcement insert returned no rows".to_owned(),
            ));
        }

        for audience in &command.audiences {
            sqlx::query(
                "INSERT INTO messaging_announcement_audience \
                 (id, uuid, tenant_id, organization_id, announcement_id, audience_kind, audience_value) \
                 VALUES ($1, $2, $3, $4, $5, $6, $7)",
            )
            .bind(self.next_id())
            .bind(uuid())
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(id)
            .bind(&audience.kind)
            .bind(audience.value.clone().unwrap_or_else(|| "*".to_owned()))
            .execute(&self.pool)
            .await
            .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        }

        Ok(AnnouncementItem {
            id: id.to_string(),
            title: command.title.clone(),
            body: command.body.clone(),
            severity: command
                .severity
                .clone()
                .unwrap_or_else(|| "info".to_owned()),
            status: status.to_owned(),
            require_ack: command.require_ack.unwrap_or(false),
            publish_at: publish_at.map(rfc3339),
            expire_at: expire_at.map(rfc3339),
            acknowledged_at: None,
            metadata: payload_json,
            created_at: rfc3339(now),
        })
    }

    // ------------------------------------------------------------ push messages

    async fn list_push_messages(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<PushMessageItem>, StoreError> {
        let offset = (page - 1) * page_size;
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_push_message \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let rows = sqlx::query(
            "SELECT id, title, body, status, badge, collapse_key, data_json, scheduled_at, created_at \
             FROM messaging_push_message \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL \
             ORDER BY created_at DESC \
             LIMIT $3 OFFSET $4",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let items = rows
            .into_iter()
            .map(|row| PushMessageItem {
                id: row.get::<i64, _>("id").to_string(),
                title: row.get("title"),
                body: row.get("body"),
                status: row.get("status"),
                badge: row.get("badge"),
                collapse_key: row.get("collapse_key"),
                data: row.get("data_json"),
                scheduled_at: row
                    .get::<Option<chrono::DateTime<Utc>>, _>("scheduled_at")
                    .map(rfc3339),
                created_at: rfc3339(row.get("created_at")),
            })
            .collect();

        Ok(MessagingPage {
            items,
            page,
            page_size,
            total_items: total,
        })
    }

    async fn send_push_message(
        &self,
        subject: &MessagingAdminSubject,
        command: &SendPushMessageCommand,
        idempotency_key: &str,
    ) -> Result<PushMessageItem, StoreError> {
        if command.recipient_user_ids.is_empty() {
            return Err(StoreError::Invalid(
                "recipientUserIds must not be empty".to_owned(),
            ));
        }
        if command.badge.is_some_and(|badge| badge < 0) {
            return Err(StoreError::Invalid("badge must not be negative".to_owned()));
        }
        let id = self.next_id();
        let push_uuid = uuid();
        let data_json = command
            .data
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));
        let scheduled_at = command
            .scheduled_at
            .as_deref()
            .map(chrono::DateTime::parse_from_rfc3339)
            .transpose()
            .map_err(|error| {
                StoreError::Invalid(format!("scheduledAt is not a valid date-time: {error}"))
            })?
            .map(|value| value.with_timezone(&Utc));

        let result = sqlx::query(
            "INSERT INTO messaging_push_message \
             (id, uuid, tenant_id, organization_id, push_key, title, body, badge, collapse_key, data_json, idempotency_key, payload_hash, status, scheduled_at, created_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'accepted', $13, $14)",
        )
        .bind(id)
        .bind(&push_uuid)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(format!("push-{push_uuid}"))
        .bind(&command.title)
        .bind(&command.body)
        .bind(command.badge)
        .bind(&command.collapse_key)
        .bind(&data_json)
        .bind(idempotency_key)
        .bind(sha256_hash(command.body.as_bytes()))
        .bind(scheduled_at)
        .bind(subject.operator_id)
        .execute(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict("push message with this idempotency key already exists".to_owned())
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?;
        if result.rows_affected() == 0 {
            return Err(StoreError::Unavailable(
                "push message insert returned no rows".to_owned(),
            ));
        }

        Ok(PushMessageItem {
            id: id.to_string(),
            title: command.title.clone(),
            body: command.body.clone(),
            status: "accepted".to_owned(),
            badge: command.badge,
            collapse_key: command.collapse_key.clone(),
            data: data_json,
            scheduled_at: scheduled_at.map(rfc3339),
            created_at: rfc3339(Utc::now()),
        })
    }

    // -------------------------------------------------------- outbound messages

    async fn list_outbound_messages(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<OutboundMessageItem>, StoreError> {
        let offset = (page - 1) * page_size;
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_outbound_message \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let rows = sqlx::query(
            "SELECT id, channel, target_masked, subject, body, status, created_at \
             FROM messaging_outbound_message \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL \
             ORDER BY created_at DESC \
             LIMIT $3 OFFSET $4",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let items = rows
            .into_iter()
            .map(|row| OutboundMessageItem {
                id: row.get::<i64, _>("id").to_string(),
                channel: row.get("channel"),
                target_masked: row.get("target_masked"),
                subject: row.get("subject"),
                body: row.get("body"),
                status: row.get("status"),
                created_at: rfc3339(row.get("created_at")),
            })
            .collect();

        Ok(MessagingPage {
            items,
            page,
            page_size,
            total_items: total,
        })
    }

    async fn send_outbound_message(
        &self,
        subject: &MessagingAdminSubject,
        command: &SendOutboundMessageCommand,
        idempotency_key: &str,
    ) -> Result<OutboundMessageItem, StoreError> {
        crate::ports::parse_channel(&command.channel).map_err(StoreError::Invalid)?;
        if command.target.trim().is_empty() {
            return Err(StoreError::Invalid("target must not be empty".to_owned()));
        }
        let id = self.next_id();
        let message_uuid = uuid();
        let payload_json = command
            .payload
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));
        let target_hash = sha256_hash(command.target.trim().as_bytes());
        let target_masked = mask_target(command.target.trim());

        let result = sqlx::query(
            "INSERT INTO messaging_outbound_message \
             (id, uuid, tenant_id, organization_id, message_key, channel, target_hash, target_masked, subject, body, payload_json, idempotency_key, payload_hash, status, created_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'accepted', $14)",
        )
        .bind(id)
        .bind(&message_uuid)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(format!("out-{message_uuid}"))
        .bind(&command.channel)
        .bind(&target_hash)
        .bind(&target_masked)
        .bind(&command.subject)
        .bind(&command.body)
        .bind(&payload_json)
        .bind(idempotency_key)
        .bind(sha256_hash(command.body.as_bytes()))
        .bind(subject.operator_id)
        .execute(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict("outbound message with this idempotency key already exists".to_owned())
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?;
        if result.rows_affected() == 0 {
            return Err(StoreError::Unavailable(
                "outbound message insert returned no rows".to_owned(),
            ));
        }

        Ok(OutboundMessageItem {
            id: id.to_string(),
            channel: command.channel.clone(),
            target_masked,
            subject: command.subject.clone(),
            body: command.body.clone(),
            status: "accepted".to_owned(),
            created_at: rfc3339(Utc::now()),
        })
    }

    // ----------------------------------------------------- verification policies

    async fn list_verification_policies(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<VerificationPolicyItem>, StoreError> {
        let offset = (page - 1) * page_size;
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_verification_policy \
             WHERE tenant_id = $1 AND organization_id = $2",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let rows = sqlx::query(
            "SELECT id, scene_code, channel, ttl_seconds, max_attempts, message_subject, message_body_pattern, enabled \
             FROM messaging_verification_policy \
             WHERE tenant_id = $1 AND organization_id = $2 \
             ORDER BY created_at DESC \
             LIMIT $3 OFFSET $4",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let items = rows
            .into_iter()
            .map(|row| VerificationPolicyItem {
                id: row.get::<i64, _>("id").to_string(),
                scene_code: row.get("scene_code"),
                channel: row.get("channel"),
                ttl_seconds: row.get("ttl_seconds"),
                max_attempts: row.get("max_attempts"),
                message_subject: row.get("message_subject"),
                message_body_pattern: row.get("message_body_pattern"),
                enabled: row.get("enabled"),
            })
            .collect();

        Ok(MessagingPage {
            items,
            page,
            page_size,
            total_items: total,
        })
    }

    async fn update_verification_policy(
        &self,
        subject: &MessagingAdminSubject,
        policy_id: i64,
        command: &UpdateVerificationPolicyCommand,
        _idempotency_key: &str,
    ) -> Result<VerificationPolicyItem, StoreError> {
        if let Some(ttl) = command.ttl_seconds {
            if ttl <= 0 {
                return Err(StoreError::Invalid(
                    "ttlSeconds must be positive".to_owned(),
                ));
            }
        }
        if let Some(attempts) = command.max_attempts {
            if attempts <= 0 {
                return Err(StoreError::Invalid(
                    "maxAttempts must be positive".to_owned(),
                ));
            }
        }
        if let Some(pattern) = &command.message_body_pattern {
            if pattern.trim().is_empty() {
                return Err(StoreError::Invalid(
                    "messageBodyPattern must not be empty".to_owned(),
                ));
            }
        }
        let row = sqlx::query(
            "UPDATE messaging_verification_policy SET \
                ttl_seconds = COALESCE($3, ttl_seconds), \
                max_attempts = COALESCE($4, max_attempts), \
                message_subject = $5, \
                message_body_pattern = COALESCE($6, message_body_pattern), \
                enabled = COALESCE($7, enabled), \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE id = $1 AND tenant_id = $2 \
             RETURNING id, scene_code, channel, ttl_seconds, max_attempts, message_subject, message_body_pattern, enabled",
        )
        .bind(policy_id)
        .bind(subject.tenant_id)
        .bind(command.ttl_seconds)
        .bind(command.max_attempts)
        .bind(&command.message_subject)
        .bind(&command.message_body_pattern)
        .bind(command.enabled)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?
        .ok_or_else(|| StoreError::NotFound("verification policy not found".to_owned()))?;

        Ok(VerificationPolicyItem {
            id: row.get::<i64, _>("id").to_string(),
            scene_code: row.get("scene_code"),
            channel: row.get("channel"),
            ttl_seconds: row.get("ttl_seconds"),
            max_attempts: row.get("max_attempts"),
            message_subject: row.get("message_subject"),
            message_body_pattern: row.get("message_body_pattern"),
            enabled: row.get("enabled"),
        })
    }

    // ---------------------------------------------------------- email accounts

    async fn list_email_accounts(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<EmailAccountItem>, StoreError> {
        let offset = (page - 1) * page_size;
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_email_account \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let rows = sqlx::query(
            "SELECT id, name, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_at, updated_at, version \
             FROM messaging_email_account \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL \
             ORDER BY updated_at DESC, id DESC \
             LIMIT $3 OFFSET $4",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let mut items = Vec::with_capacity(rows.len());
        for row in rows {
            items.push(self.email_account_item(subject, row).await?);
        }
        Ok(MessagingPage {
            items,
            page,
            page_size,
            total_items: total,
        })
    }

    async fn create_email_account(
        &self,
        subject: &MessagingAdminSubject,
        command: &CreateEmailAccountCommand,
        _idempotency_key: &str,
    ) -> Result<EmailAccountItem, StoreError> {
        let name = command.name.trim();
        if name.is_empty() {
            return Err(StoreError::Invalid("name must not be empty".to_owned()));
        }
        if name.chars().count() > 128 {
            return Err(StoreError::Invalid(
                "name must be at most 128 characters".to_owned(),
            ));
        }
        let provider =
            crate::ports::parse_email_provider(&command.provider).map_err(StoreError::Invalid)?;
        let encoded = self.encode_channel_secret(subject, "email", command.secret.as_ref())?;

        let row = sqlx::query(
            "INSERT INTO messaging_email_account \
             (id, uuid, tenant_id, organization_id, name, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) \
             RETURNING id, name, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_at, updated_at",
        )
        .bind(self.next_id())
        .bind(uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(name)
        .bind(provider)
        .bind(&command.config)
        .bind(encoded.as_ref().map(|value| value.ciphertext.as_str()))
        .bind(encoded.as_ref().map(|value| value.key_id.as_str()))
        .bind(encoded.as_ref().map(|value| value.fingerprint.as_str()))
        .bind(command.enabled)
        .bind(subject.operator_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict("email account name already exists".to_owned())
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?;

        let mut item = self.email_account_item(subject, row).await?;
        if encoded.is_some() {
            item.has_secret = true;
            item.key_display_masked = mask_secret(command.secret.as_deref().unwrap_or(""));
        }
        Ok(item)
    }

    async fn retrieve_email_account(
        &self,
        subject: &MessagingAdminSubject,
        account_id: i64,
    ) -> Result<EmailAccountItem, StoreError> {
        let row = sqlx::query(
            "SELECT id, name, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_at, updated_at, version \
             FROM messaging_email_account \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        )
        .bind(account_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?
        .ok_or_else(|| StoreError::NotFound("email account not found".to_owned()))?;
        self.email_account_item(subject, row).await
    }

    async fn update_email_account(
        &self,
        subject: &MessagingAdminSubject,
        account_id: i64,
        command: &UpdateEmailAccountCommand,
        _idempotency_key: &str,
    ) -> Result<EmailAccountItem, StoreError> {
        let name = command.name.trim();
        if name.is_empty() {
            return Err(StoreError::Invalid("name must not be empty".to_owned()));
        }
        if name.chars().count() > 128 {
            return Err(StoreError::Invalid(
                "name must be at most 128 characters".to_owned(),
            ));
        }
        let provider =
            crate::ports::parse_email_provider(&command.provider).map_err(StoreError::Invalid)?;
        let encoded = self.encode_channel_secret(subject, "email", command.secret.as_ref())?;

        let row = sqlx::query(
            "UPDATE messaging_email_account SET \
                name = $4, \
                provider = $5, \
                config_json = $6, \
                enabled = $7, \
                secret_ciphertext = COALESCE($8, secret_ciphertext), \
                secret_key_id = COALESCE($9, secret_key_id), \
                secret_fingerprint = COALESCE($10, secret_fingerprint), \
                updated_by = $11, \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL \
               AND version = $12 \
             RETURNING id, name, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_at, updated_at, version",
        )
        .bind(account_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(name)
        .bind(provider)
        .bind(&command.config)
        .bind(command.enabled)
        .bind(encoded.as_ref().map(|value| value.ciphertext.as_str()))
        .bind(encoded.as_ref().map(|value| value.key_id.as_str()))
        .bind(encoded.as_ref().map(|value| value.fingerprint.as_str()))
        .bind(subject.operator_id)
        .bind(parse_expected_version(&command.expected_version)?)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict("email account name already exists".to_owned())
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?;
        let row = match row {
            Some(row) => row,
            None => {
                return Err(self
                    .version_conflict_or_missing(
                        "messaging_email_account",
                        account_id,
                        subject,
                        "email account",
                    )
                    .await);
            }
        };

        let mut item = self.email_account_item(subject, row).await?;
        if encoded.is_some() {
            item.has_secret = true;
            item.key_display_masked = mask_secret(command.secret.as_deref().unwrap_or(""));
        }
        Ok(item)
    }

    async fn delete_email_account(
        &self,
        subject: &MessagingAdminSubject,
        account_id: i64,
        _idempotency_key: &str,
    ) -> Result<(), StoreError> {
        // Reference check + account soft delete + sender cascade run in one
        // transaction (DATABASE_SPEC §17): a partial failure must not leave a
        // deleted account with live senders.
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let referenced: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_email_send_rule r \
             WHERE r.tenant_id = $1 AND r.organization_id = $2 AND r.deleted_at IS NULL \
               AND EXISTS ( \
                   SELECT 1 FROM messaging_email_sender s \
                   WHERE s.account_id = $3 AND s.tenant_id = $1 AND s.organization_id = $2 \
                     AND s.deleted_at IS NULL AND r.chain_json @> to_jsonb(s.id::text) \
               )",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        if referenced > 0 {
            return Err(StoreError::Conflict(
                "email account is referenced by a send rule; remove it from the rule chains first"
                    .to_owned(),
            ));
        }

        let result = sqlx::query(
            "UPDATE messaging_email_account SET \
                deleted_at = CURRENT_TIMESTAMP, \
                deleted_by = $4, \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        )
        .bind(account_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.operator_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        if result.rows_affected() == 0 {
            return Err(StoreError::NotFound("email account not found".to_owned()));
        }

        sqlx::query(
            "UPDATE messaging_email_sender SET \
                deleted_at = CURRENT_TIMESTAMP, \
                deleted_by = $4, \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE account_id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        )
        .bind(account_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.operator_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        tx.commit()
            .await
            .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        Ok(())
    }

    // ----------------------------------------------------------- email senders

    async fn list_email_senders(
        &self,
        subject: &MessagingAdminSubject,
        account_id: Option<i64>,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<EmailSenderItem>, StoreError> {
        let offset = (page - 1) * page_size;
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_email_sender \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL \
               AND ($3::bigint IS NULL OR account_id = $3)",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let rows = sqlx::query(
            "SELECT s.id, s.account_id, a.name AS account_name, s.from_address, s.from_name, s.enabled, s.version, s.created_at, s.updated_at \
             FROM messaging_email_sender s \
             JOIN messaging_email_account a ON a.id = s.account_id \
             WHERE s.tenant_id = $1 AND s.organization_id = $2 AND s.deleted_at IS NULL \
               AND ($3::bigint IS NULL OR s.account_id = $3) \
             ORDER BY s.updated_at DESC, s.id DESC \
             LIMIT $4 OFFSET $5",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let items = rows
            .into_iter()
            .map(email_sender_item_from_row)
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        Ok(MessagingPage {
            items,
            page,
            page_size,
            total_items: total,
        })
    }

    async fn create_email_sender(
        &self,
        subject: &MessagingAdminSubject,
        command: &CreateEmailSenderCommand,
        _idempotency_key: &str,
    ) -> Result<EmailSenderItem, StoreError> {
        let account_id = parse_scope_id(&command.account_id, "accountId")?;
        let from_address = command.from_address.trim();
        if let Err(error) = crate::ports::parse_email_address(from_address) {
            return Err(StoreError::Invalid(error));
        }
        sqlx::query(
            "SELECT id FROM messaging_email_account \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        )
        .bind(account_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?
        .ok_or_else(|| StoreError::NotFound("email account not found".to_owned()))?;

        let row = sqlx::query(
            "INSERT INTO messaging_email_sender \
             (id, uuid, tenant_id, organization_id, account_id, from_address, from_name, enabled, created_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) \
             RETURNING id",
        )
        .bind(self.next_id())
        .bind(uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_id)
        .bind(from_address)
        .bind(trim_optional(&command.from_name))
        .bind(command.enabled)
        .bind(subject.operator_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict("sender address already exists for this email account".to_owned())
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?;
        self.load_email_sender(subject, row.get::<i64, _>("id"))
            .await
    }

    async fn retrieve_email_sender(
        &self,
        subject: &MessagingAdminSubject,
        sender_id: i64,
    ) -> Result<EmailSenderItem, StoreError> {
        self.load_email_sender(subject, sender_id).await
    }

    async fn update_email_sender(
        &self,
        subject: &MessagingAdminSubject,
        sender_id: i64,
        command: &UpdateEmailSenderCommand,
        _idempotency_key: &str,
    ) -> Result<EmailSenderItem, StoreError> {
        let from_address = command.from_address.trim();
        if let Err(error) = crate::ports::parse_email_address(from_address) {
            return Err(StoreError::Invalid(error));
        }
        let updated = sqlx::query(
            "UPDATE messaging_email_sender SET \
                from_address = $4, \
                from_name = $5, \
                enabled = $6, \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL \
             RETURNING id",
        )
        .bind(sender_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(from_address)
        .bind(trim_optional(&command.from_name))
        .bind(command.enabled)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict(
                    "sender address already exists for this email account".to_owned(),
                )
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?
        .ok_or_else(|| StoreError::NotFound("email sender not found".to_owned()))?;
        self.load_email_sender(subject, updated.get::<i64, _>("id"))
            .await
    }

    async fn delete_email_sender(
        &self,
        subject: &MessagingAdminSubject,
        sender_id: i64,
        _idempotency_key: &str,
    ) -> Result<(), StoreError> {
        let referenced: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_email_send_rule \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL \
               AND chain_json @> to_jsonb($3::text)",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(sender_id.to_string())
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        if referenced > 0 {
            return Err(StoreError::Conflict(
                "email sender is referenced by a send rule; remove it from the rule chains first"
                    .to_owned(),
            ));
        }

        let result = sqlx::query(
            "UPDATE messaging_email_sender SET \
                deleted_at = CURRENT_TIMESTAMP, \
                deleted_by = $4, \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        )
        .bind(sender_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.operator_id)
        .execute(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        if result.rows_affected() == 0 {
            return Err(StoreError::NotFound("email sender not found".to_owned()));
        }
        Ok(())
    }

    // ---------------------------------------------------------- email send rules

    async fn list_email_send_rules(
        &self,
        subject: &MessagingAdminSubject,
    ) -> Result<Vec<EmailSendRuleItem>, StoreError> {
        let rows = sqlx::query(
            "SELECT scenario, chain_json, enabled, updated_at, version FROM messaging_email_send_rule \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let mut by_scenario: HashMap<String, (Vec<String>, bool, Option<String>, String)> =
            HashMap::new();
        for row in rows {
            let scenario: String = row.get("scenario");
            let chain_value: serde_json::Value = row.get("chain_json");
            let sender_ids = chain_value
                .as_array()
                .map(|items| {
                    items
                        .iter()
                        .filter_map(|item| item.as_str().map(str::to_owned))
                        .collect()
                })
                .unwrap_or_default();
            by_scenario.insert(
                scenario,
                (
                    sender_ids,
                    row.get("enabled"),
                    Some(rfc3339(row.get("updated_at"))),
                    row.get::<i64, _>("version").to_string(),
                ),
            );
        }

        let mut items = Vec::with_capacity(SEND_RULE_SCENARIOS.len());
        for scenario in SEND_RULE_SCENARIOS {
            let (sender_ids, enabled, updated_at, version) = by_scenario
                .remove(*scenario)
                .unwrap_or_else(|| (Vec::new(), true, None, "0".to_owned()));
            let chain = self.resolve_email_chain(subject, &sender_ids).await?;
            items.push(EmailSendRuleItem {
                scenario: (*scenario).to_owned(),
                chain,
                enabled,
                updated_at,
                version,
            });
        }
        Ok(items)
    }

    async fn update_email_send_rule(
        &self,
        subject: &MessagingAdminSubject,
        scenario: &str,
        command: &UpdateEmailSendRuleCommand,
        _idempotency_key: &str,
    ) -> Result<EmailSendRuleItem, StoreError> {
        let scenario =
            crate::ports::parse_send_rule_scenario(scenario).map_err(StoreError::Invalid)?;
        let mut sender_ids = Vec::with_capacity(command.sender_ids.len());
        for raw in &command.sender_ids {
            let id = parse_scope_id(raw, "senderId")?;
            if sender_ids.contains(&id) {
                return Err(StoreError::Invalid(format!(
                    "send rule chain contains duplicate sender `{raw}`"
                )));
            }
            sender_ids.push(id);
        }
        if !sender_ids.is_empty() {
            let known: i64 = sqlx::query_scalar(
                "SELECT COUNT(DISTINCT id) FROM messaging_email_sender \
                 WHERE tenant_id = $1 AND organization_id = $2 AND id = ANY($3) AND deleted_at IS NULL",
            )
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(&sender_ids)
            .fetch_one(&self.pool)
            .await
            .map_err(|error| StoreError::Unavailable(error.to_string()))?;
            if known != sender_ids.len() as i64 {
                return Err(StoreError::Invalid(
                    "send rule chain references an unknown email sender".to_owned(),
                ));
            }
        }

        let chain_json = serde_json::to_value(
            sender_ids
                .iter()
                .map(|id| id.to_string())
                .collect::<Vec<_>>(),
        )
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let row = sqlx::query(
            "INSERT INTO messaging_email_send_rule \
             (id, uuid, tenant_id, organization_id, scenario, chain_json, enabled, created_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) \
             ON CONFLICT (tenant_id, organization_id, scenario) WHERE deleted_at IS NULL DO UPDATE SET \
                chain_json = EXCLUDED.chain_json, \
                enabled = EXCLUDED.enabled, \
                updated_by = EXCLUDED.updated_by, \
                updated_at = CURRENT_TIMESTAMP, \
                version = messaging_email_send_rule.version + 1 \
             WHERE messaging_email_send_rule.version = $9 \
             RETURNING id, scenario, chain_json, enabled, updated_at, version",
        )
        .bind(self.next_id())
        .bind(uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(scenario)
        .bind(&chain_json)
        .bind(command.enabled)
        .bind(subject.operator_id)
        .bind(parse_expected_version(&command.expected_version)?)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        let row = row.ok_or_else(|| {
            StoreError::Conflict(
                "email send rule was modified concurrently; reload and retry".to_owned(),
            )
        })?;

        let stored_ids: Vec<String> = row
            .get::<serde_json::Value, _>("chain_json")
            .as_array()
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str().map(str::to_owned))
                    .collect()
            })
            .unwrap_or_default();
        let chain = self.resolve_email_chain(subject, &stored_ids).await?;
        Ok(EmailSendRuleItem {
            scenario: row.get("scenario"),
            chain,
            enabled: row.get("enabled"),
            updated_at: Some(rfc3339(row.get("updated_at"))),
            version: row.get::<i64, _>("version").to_string(),
        })
    }

    // -------------------------------------------------------------- sms accounts

    async fn list_sms_accounts(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<SmsAccountItem>, StoreError> {
        let offset = (page - 1) * page_size;
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_sms_account \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let rows = sqlx::query(
            "SELECT id, name, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_at, updated_at \
             FROM messaging_sms_account \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL \
             ORDER BY updated_at DESC, id DESC \
             LIMIT $3 OFFSET $4",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let mut items = Vec::with_capacity(rows.len());
        for row in rows {
            items.push(self.sms_account_item(subject, row).await?);
        }
        Ok(MessagingPage {
            items,
            page,
            page_size,
            total_items: total,
        })
    }

    async fn create_sms_account(
        &self,
        subject: &MessagingAdminSubject,
        command: &CreateSmsAccountCommand,
        _idempotency_key: &str,
    ) -> Result<SmsAccountItem, StoreError> {
        let name = command.name.trim();
        if name.is_empty() {
            return Err(StoreError::Invalid("name must not be empty".to_owned()));
        }
        if name.chars().count() > 128 {
            return Err(StoreError::Invalid(
                "name must be at most 128 characters".to_owned(),
            ));
        }
        let provider =
            crate::ports::parse_sms_provider(&command.provider).map_err(StoreError::Invalid)?;
        let encoded = self.encode_channel_secret(subject, "sms", command.secret.as_ref())?;

        let row = sqlx::query(
            "INSERT INTO messaging_sms_account \
             (id, uuid, tenant_id, organization_id, name, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) \
             RETURNING id, name, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_at, updated_at",
        )
        .bind(self.next_id())
        .bind(uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(name)
        .bind(provider)
        .bind(&command.config)
        .bind(encoded.as_ref().map(|value| value.ciphertext.as_str()))
        .bind(encoded.as_ref().map(|value| value.key_id.as_str()))
        .bind(encoded.as_ref().map(|value| value.fingerprint.as_str()))
        .bind(command.enabled)
        .bind(subject.operator_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict("sms account name already exists".to_owned())
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?;

        let mut item = self.sms_account_item(subject, row).await?;
        if encoded.is_some() {
            item.has_secret = true;
            item.key_display_masked = mask_secret(command.secret.as_deref().unwrap_or(""));
        }
        Ok(item)
    }

    async fn retrieve_sms_account(
        &self,
        subject: &MessagingAdminSubject,
        account_id: i64,
    ) -> Result<SmsAccountItem, StoreError> {
        let row = sqlx::query(
            "SELECT id, name, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_at, updated_at \
             FROM messaging_sms_account \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        )
        .bind(account_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?
        .ok_or_else(|| StoreError::NotFound("sms account not found".to_owned()))?;
        self.sms_account_item(subject, row).await
    }

    async fn update_sms_account(
        &self,
        subject: &MessagingAdminSubject,
        account_id: i64,
        command: &UpdateSmsAccountCommand,
        _idempotency_key: &str,
    ) -> Result<SmsAccountItem, StoreError> {
        let name = command.name.trim();
        if name.is_empty() {
            return Err(StoreError::Invalid("name must not be empty".to_owned()));
        }
        if name.chars().count() > 128 {
            return Err(StoreError::Invalid(
                "name must be at most 128 characters".to_owned(),
            ));
        }
        let provider =
            crate::ports::parse_sms_provider(&command.provider).map_err(StoreError::Invalid)?;
        let encoded = self.encode_channel_secret(subject, "sms", command.secret.as_ref())?;

        let row = sqlx::query(
            "UPDATE messaging_sms_account SET \
                name = $4, \
                provider = $5, \
                config_json = $6, \
                enabled = $7, \
                secret_ciphertext = COALESCE($8, secret_ciphertext), \
                secret_key_id = COALESCE($9, secret_key_id), \
                secret_fingerprint = COALESCE($10, secret_fingerprint), \
                updated_by = $11, \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL \
               AND version = $12 \
             RETURNING id, name, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_at, updated_at, version",
        )
        .bind(account_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(name)
        .bind(provider)
        .bind(&command.config)
        .bind(command.enabled)
        .bind(encoded.as_ref().map(|value| value.ciphertext.as_str()))
        .bind(encoded.as_ref().map(|value| value.key_id.as_str()))
        .bind(encoded.as_ref().map(|value| value.fingerprint.as_str()))
        .bind(subject.operator_id)
        .bind(parse_expected_version(&command.expected_version)?)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict("sms account name already exists".to_owned())
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?;
        let row = match row {
            Some(row) => row,
            None => {
                return Err(self
                    .version_conflict_or_missing(
                        "messaging_sms_account",
                        account_id,
                        subject,
                        "sms account",
                    )
                    .await);
            }
        };

        let mut item = self.sms_account_item(subject, row).await?;
        if encoded.is_some() {
            item.has_secret = true;
            item.key_display_masked = mask_secret(command.secret.as_deref().unwrap_or(""));
        }
        Ok(item)
    }

    async fn delete_sms_account(
        &self,
        subject: &MessagingAdminSubject,
        account_id: i64,
        _idempotency_key: &str,
    ) -> Result<(), StoreError> {
        // Reference check + account soft delete + signature cascade run in one
        // transaction (DATABASE_SPEC §17): a partial failure must not leave a
        // deleted account with live signatures.
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let referenced: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_sms_send_rule r \
             WHERE r.tenant_id = $1 AND r.organization_id = $2 AND r.deleted_at IS NULL \
               AND EXISTS ( \
                   SELECT 1 FROM messaging_sms_signature s \
                   WHERE s.account_id = $3 AND s.tenant_id = $1 AND s.organization_id = $2 \
                     AND s.deleted_at IS NULL AND r.chain_json @> to_jsonb(s.id::text) \
               )",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        if referenced > 0 {
            return Err(StoreError::Conflict(
                "sms account is referenced by a send rule; remove it from the rule chains first"
                    .to_owned(),
            ));
        }

        let result = sqlx::query(
            "UPDATE messaging_sms_account SET \
                deleted_at = CURRENT_TIMESTAMP, \
                deleted_by = $4, \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        )
        .bind(account_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.operator_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        if result.rows_affected() == 0 {
            return Err(StoreError::NotFound("sms account not found".to_owned()));
        }

        sqlx::query(
            "UPDATE messaging_sms_signature SET \
                deleted_at = CURRENT_TIMESTAMP, \
                deleted_by = $4, \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE account_id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        )
        .bind(account_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.operator_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        tx.commit()
            .await
            .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        Ok(())
    }

    // ---------------------------------------------------------- sms signatures

    async fn list_sms_signatures(
        &self,
        subject: &MessagingAdminSubject,
        account_id: Option<i64>,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<SmsSignatureItem>, StoreError> {
        let offset = (page - 1) * page_size;
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_sms_signature \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL \
               AND ($3::bigint IS NULL OR account_id = $3)",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let rows = sqlx::query(
            "SELECT s.id, s.account_id, a.name AS account_name, s.sign_name, s.enabled, s.version, s.created_at, s.updated_at \
             FROM messaging_sms_signature s \
             JOIN messaging_sms_account a ON a.id = s.account_id \
             WHERE s.tenant_id = $1 AND s.organization_id = $2 AND s.deleted_at IS NULL \
               AND ($3::bigint IS NULL OR s.account_id = $3) \
             ORDER BY s.updated_at DESC, s.id DESC \
             LIMIT $4 OFFSET $5",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let items = rows
            .into_iter()
            .map(sms_signature_item_from_row)
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        Ok(MessagingPage {
            items,
            page,
            page_size,
            total_items: total,
        })
    }

    async fn create_sms_signature(
        &self,
        subject: &MessagingAdminSubject,
        command: &CreateSmsSignatureCommand,
        _idempotency_key: &str,
    ) -> Result<SmsSignatureItem, StoreError> {
        let account_id = parse_scope_id(&command.account_id, "accountId")?;
        let sign_name = command.sign_name.trim();
        if let Err(error) = crate::ports::parse_sms_sign_name(sign_name) {
            return Err(StoreError::Invalid(error));
        }
        sqlx::query(
            "SELECT id FROM messaging_sms_account \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        )
        .bind(account_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?
        .ok_or_else(|| StoreError::NotFound("sms account not found".to_owned()))?;

        let row = sqlx::query(
            "INSERT INTO messaging_sms_signature \
             (id, uuid, tenant_id, organization_id, account_id, sign_name, enabled, created_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) \
             RETURNING id",
        )
        .bind(self.next_id())
        .bind(uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_id)
        .bind(sign_name)
        .bind(command.enabled)
        .bind(subject.operator_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict("signature already exists for this sms account".to_owned())
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?;
        self.load_sms_signature(subject, row.get::<i64, _>("id"))
            .await
    }

    async fn retrieve_sms_signature(
        &self,
        subject: &MessagingAdminSubject,
        signature_id: i64,
    ) -> Result<SmsSignatureItem, StoreError> {
        self.load_sms_signature(subject, signature_id).await
    }

    async fn update_sms_signature(
        &self,
        subject: &MessagingAdminSubject,
        signature_id: i64,
        command: &UpdateSmsSignatureCommand,
        _idempotency_key: &str,
    ) -> Result<SmsSignatureItem, StoreError> {
        let sign_name = command.sign_name.trim();
        if let Err(error) = crate::ports::parse_sms_sign_name(sign_name) {
            return Err(StoreError::Invalid(error));
        }
        let updated = sqlx::query(
            "UPDATE messaging_sms_signature SET \
                sign_name = $4, \
                enabled = $5, \
                updated_by = $6, \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL \
               AND version = $7 \
             RETURNING id",
        )
        .bind(signature_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(sign_name)
        .bind(command.enabled)
        .bind(subject.operator_id)
        .bind(parse_expected_version(&command.expected_version)?)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict("signature already exists for this sms account".to_owned())
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?;
        let updated = match updated {
            Some(updated) => updated,
            None => {
                return Err(self
                    .version_conflict_or_missing(
                        "messaging_sms_signature",
                        signature_id,
                        subject,
                        "sms signature",
                    )
                    .await);
            }
        };
        self.load_sms_signature(subject, updated.get::<i64, _>("id"))
            .await
    }

    async fn delete_sms_signature(
        &self,
        subject: &MessagingAdminSubject,
        signature_id: i64,
        _idempotency_key: &str,
    ) -> Result<(), StoreError> {
        let referenced: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_sms_send_rule \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL \
               AND chain_json @> to_jsonb($3::text)",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(signature_id.to_string())
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        if referenced > 0 {
            return Err(StoreError::Conflict(
                "sms signature is referenced by a send rule; remove it from the rule chains first"
                    .to_owned(),
            ));
        }

        let result = sqlx::query(
            "UPDATE messaging_sms_signature SET \
                deleted_at = CURRENT_TIMESTAMP, \
                deleted_by = $4, \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        )
        .bind(signature_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.operator_id)
        .execute(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        if result.rows_affected() == 0 {
            return Err(StoreError::NotFound("sms signature not found".to_owned()));
        }
        Ok(())
    }

    // --------------------------------------------------------- sms send rules

    async fn list_sms_send_rules(
        &self,
        subject: &MessagingAdminSubject,
    ) -> Result<Vec<SmsSendRuleItem>, StoreError> {
        let rows = sqlx::query(
            "SELECT scenario, chain_json, enabled, updated_at, version FROM messaging_sms_send_rule \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let mut by_scenario: HashMap<String, (Vec<String>, bool, Option<String>, String)> =
            HashMap::new();
        for row in rows {
            let scenario: String = row.get("scenario");
            let chain_value: serde_json::Value = row.get("chain_json");
            let signature_ids = chain_value
                .as_array()
                .map(|items| {
                    items
                        .iter()
                        .filter_map(|item| item.as_str().map(str::to_owned))
                        .collect()
                })
                .unwrap_or_default();
            by_scenario.insert(
                scenario,
                (
                    signature_ids,
                    row.get("enabled"),
                    Some(rfc3339(row.get("updated_at"))),
                    row.get::<i64, _>("version").to_string(),
                ),
            );
        }

        let mut items = Vec::with_capacity(SEND_RULE_SCENARIOS.len());
        for scenario in SEND_RULE_SCENARIOS {
            let (signature_ids, enabled, updated_at, version) = by_scenario
                .remove(*scenario)
                .unwrap_or_else(|| (Vec::new(), true, None, "0".to_owned()));
            let chain = self.resolve_sms_chain(subject, &signature_ids).await?;
            items.push(SmsSendRuleItem {
                scenario: (*scenario).to_owned(),
                chain,
                enabled,
                updated_at,
                version,
            });
        }
        Ok(items)
    }

    async fn update_sms_send_rule(
        &self,
        subject: &MessagingAdminSubject,
        scenario: &str,
        command: &UpdateSmsSendRuleCommand,
        _idempotency_key: &str,
    ) -> Result<SmsSendRuleItem, StoreError> {
        let scenario =
            crate::ports::parse_send_rule_scenario(scenario).map_err(StoreError::Invalid)?;
        let mut signature_ids = Vec::with_capacity(command.signature_ids.len());
        for raw in &command.signature_ids {
            let id = parse_scope_id(raw, "signatureId")?;
            if signature_ids.contains(&id) {
                return Err(StoreError::Invalid(format!(
                    "send rule chain contains duplicate signature `{raw}`"
                )));
            }
            signature_ids.push(id);
        }
        if !signature_ids.is_empty() {
            let known: i64 = sqlx::query_scalar(
                "SELECT COUNT(DISTINCT id) FROM messaging_sms_signature \
                 WHERE tenant_id = $1 AND organization_id = $2 AND id = ANY($3) AND deleted_at IS NULL",
            )
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(&signature_ids)
            .fetch_one(&self.pool)
            .await
            .map_err(|error| StoreError::Unavailable(error.to_string()))?;
            if known != signature_ids.len() as i64 {
                return Err(StoreError::Invalid(
                    "send rule chain references an unknown sms signature".to_owned(),
                ));
            }
        }

        let chain_json = serde_json::to_value(
            signature_ids
                .iter()
                .map(|id| id.to_string())
                .collect::<Vec<_>>(),
        )
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let row = sqlx::query(
            "INSERT INTO messaging_sms_send_rule \
             (id, uuid, tenant_id, organization_id, scenario, chain_json, enabled, created_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) \
             ON CONFLICT (tenant_id, organization_id, scenario) WHERE deleted_at IS NULL DO UPDATE SET \
                chain_json = EXCLUDED.chain_json, \
                enabled = EXCLUDED.enabled, \
                updated_by = EXCLUDED.updated_by, \
                updated_at = CURRENT_TIMESTAMP, \
                version = messaging_sms_send_rule.version + 1 \
             WHERE messaging_sms_send_rule.version = $9 \
             RETURNING id, scenario, chain_json, enabled, updated_at, version",
        )
        .bind(self.next_id())
        .bind(uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(scenario)
        .bind(&chain_json)
        .bind(command.enabled)
        .bind(subject.operator_id)
        .bind(parse_expected_version(&command.expected_version)?)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        let row = row.ok_or_else(|| {
            StoreError::Conflict(
                "sms send rule was modified concurrently; reload and retry".to_owned(),
            )
        })?;

        let stored_ids: Vec<String> = row
            .get::<serde_json::Value, _>("chain_json")
            .as_array()
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str().map(str::to_owned))
                    .collect()
            })
            .unwrap_or_default();
        let chain = self.resolve_sms_chain(subject, &stored_ids).await?;
        Ok(SmsSendRuleItem {
            scenario: row.get("scenario"),
            chain,
            enabled: row.get("enabled"),
            updated_at: Some(rfc3339(row.get("updated_at"))),
            version: row.get::<i64, _>("version").to_string(),
        })
    }

    // --------------------------------------------------------------- templates

    async fn list_templates(
        &self,
        subject: &MessagingAdminSubject,
        channel: Option<&str>,
        status: Option<&str>,
        keyword: Option<&str>,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<TemplateItem>, StoreError> {
        if let Some(channel) = channel {
            crate::ports::parse_channel(channel).map_err(StoreError::Invalid)?;
        }
        if let Some(status) = status {
            crate::ports::parse_template_status(Some(status)).map_err(StoreError::Invalid)?;
        }
        let offset = (page - 1) * page_size;
        let keyword_pattern = keyword.map(|value| format!("%{value}%"));

        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM messaging_template \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL \
               AND ($3::text IS NULL OR channel = $3) \
               AND ($4::text IS NULL OR status = $4) \
               AND ($5::text IS NULL OR template_code ILIKE $5 OR name ILIKE $5)",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(channel)
        .bind(status)
        .bind(keyword_pattern.as_deref())
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let rows = sqlx::query(
            "SELECT id, uuid, channel, template_code, name, subject, content, variables_json, approval_status, approval_note, status, created_at, updated_at, created_by \
             FROM messaging_template \
             WHERE tenant_id = $1 AND organization_id = $2 AND deleted_at IS NULL \
               AND ($3::text IS NULL OR channel = $3) \
               AND ($4::text IS NULL OR status = $4) \
               AND ($5::text IS NULL OR template_code ILIKE $5 OR name ILIKE $5) \
             ORDER BY updated_at DESC \
             LIMIT $6 OFFSET $7",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(channel)
        .bind(status)
        .bind(keyword_pattern.as_deref())
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let items = rows
            .into_iter()
            .map(template_item_from_row)
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        Ok(MessagingPage {
            items,
            page,
            page_size,
            total_items: total,
        })
    }

    async fn create_template(
        &self,
        subject: &MessagingAdminSubject,
        command: &CreateTemplateCommand,
        _idempotency_key: &str,
    ) -> Result<TemplateItem, StoreError> {
        crate::ports::parse_channel(&command.channel).map_err(StoreError::Invalid)?;
        if command.template_code.trim().is_empty() {
            return Err(StoreError::Invalid(
                "templateCode must not be empty".to_owned(),
            ));
        }
        if command.name.trim().is_empty() {
            return Err(StoreError::Invalid("name must not be empty".to_owned()));
        }
        if command.content.trim().is_empty() {
            return Err(StoreError::Invalid("content must not be empty".to_owned()));
        }
        if command.channel == "email"
            && command
                .subject
                .as_deref()
                .is_none_or(|value| value.is_empty())
        {
            return Err(StoreError::Invalid(
                "subject is required for email templates".to_owned(),
            ));
        }
        let approval_status = crate::ports::parse_template_approval_status(
            &command.channel,
            command.approval_status.as_deref(),
        )
        .map_err(StoreError::Invalid)?;
        let status = crate::ports::parse_template_status(command.status.as_deref())
            .map_err(StoreError::Invalid)?;
        let variables = command
            .variables
            .clone()
            .unwrap_or_else(|| extract_template_variables(&command.content));

        let id = self.next_id();
        let template_uuid = uuid();
        let row = sqlx::query(
            "INSERT INTO messaging_template \
             (id, uuid, tenant_id, organization_id, channel, template_code, name, subject, content, variables_json, approval_status, approval_note, status, created_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) \
             RETURNING id, uuid, channel, template_code, name, subject, content, variables_json, approval_status, approval_note, status, created_at, updated_at, created_by",
        )
        .bind(id)
        .bind(&template_uuid)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(&command.channel)
        .bind(&command.template_code)
        .bind(&command.name)
        .bind(&command.subject)
        .bind(&command.content)
        .bind(serde_json::to_value(&variables).unwrap_or_else(|_| serde_json::json!([])))
        .bind(approval_status)
        .bind(&command.approval_note)
        .bind(status)
        .bind(subject.operator_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            if is_unique_violation(&error) {
                StoreError::Conflict("template code already exists for this channel".to_owned())
            } else {
                StoreError::Unavailable(error.to_string())
            }
        })?;

        template_item_from_row(row).map_err(|error| StoreError::Unavailable(error.to_string()))
    }

    async fn retrieve_template(
        &self,
        subject: &MessagingAdminSubject,
        template_id: i64,
    ) -> Result<TemplateItem, StoreError> {
        let row = sqlx::query(
            "SELECT id, uuid, channel, template_code, name, subject, content, variables_json, approval_status, approval_note, status, created_at, updated_at, created_by \
             FROM messaging_template \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        )
        .bind(template_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?
        .ok_or_else(|| StoreError::NotFound("template not found".to_owned()))?;

        template_item_from_row(row).map_err(|error| StoreError::Unavailable(error.to_string()))
    }

    async fn update_template(
        &self,
        subject: &MessagingAdminSubject,
        template_id: i64,
        command: &UpdateTemplateCommand,
        _idempotency_key: &str,
    ) -> Result<TemplateItem, StoreError> {
        if command.name.trim().is_empty() {
            return Err(StoreError::Invalid("name must not be empty".to_owned()));
        }
        if command.content.trim().is_empty() {
            return Err(StoreError::Invalid("content must not be empty".to_owned()));
        }
        if let Some(approval_status) = &command.approval_status {
            crate::ports::parse_template_approval_status("email", Some(approval_status))
                .map_err(StoreError::Invalid)?;
        }
        let status = crate::ports::parse_template_status(command.status.as_deref())
            .map_err(StoreError::Invalid)?;

        let row = sqlx::query(
            "UPDATE messaging_template SET \
                name = $4, \
                subject = $5, \
                content = $6, \
                variables_json = COALESCE($7, variables_json), \
                approval_status = COALESCE($8, approval_status), \
                approval_note = COALESCE($9, approval_note), \
                status = $10, \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL \
             RETURNING id, uuid, channel, template_code, name, subject, content, variables_json, approval_status, approval_note, status, created_at, updated_at, created_by",
        )
        .bind(template_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(&command.name)
        .bind(&command.subject)
        .bind(&command.content)
        .bind(
            command
                .variables
                .as_ref()
                .map(|variables| serde_json::to_value(variables).unwrap_or_else(|_| serde_json::json!([]))),
        )
        .bind(&command.approval_status)
        .bind(&command.approval_note)
        .bind(status)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?
        .ok_or_else(|| StoreError::NotFound("template not found".to_owned()))?;

        template_item_from_row(row).map_err(|error| StoreError::Unavailable(error.to_string()))
    }

    async fn delete_template(
        &self,
        subject: &MessagingAdminSubject,
        template_id: i64,
        _idempotency_key: &str,
    ) -> Result<(), StoreError> {
        let result = sqlx::query(
            "UPDATE messaging_template SET \
                deleted_at = CURRENT_TIMESTAMP, \
                deleted_by = $3, \
                updated_at = CURRENT_TIMESTAMP, \
                version = version + 1 \
             WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND deleted_at IS NULL",
        )
        .bind(template_id)
        .bind(subject.tenant_id)
        .bind(subject.operator_id)
        .execute(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;
        if result.rows_affected() == 0 {
            return Err(StoreError::NotFound("template not found".to_owned()));
        }
        Ok(())
    }
}

fn extract_template_variables(content: &str) -> Vec<String> {
    let mut variables = Vec::new();
    let bytes = content.as_bytes();
    let mut index = 0;
    while index + 3 < bytes.len() {
        if bytes[index] == b'{' && bytes[index + 1] == b'{' {
            if let Some(end) = content[index + 2..].find("}}") {
                let name = content[index + 2..index + 2 + end].trim();
                if !name.is_empty() && !variables.iter().any(|existing: &String| existing == name) {
                    variables.push(name.to_owned());
                }
                index += 2 + end + 2;
                continue;
            }
        }
        index += 1;
    }
    variables
}

fn sms_signature_item_from_row(
    row: sqlx::postgres::PgRow,
) -> Result<SmsSignatureItem, sqlx::Error> {
    Ok(SmsSignatureItem {
        id: row.get::<i64, _>("id").to_string(),
        account_id: row.get::<i64, _>("account_id").to_string(),
        account_name: row.get("account_name"),
        sign_name: row.get("sign_name"),
        enabled: row.get("enabled"),
        version: row.get::<i64, _>("version").to_string(),
        created_at: rfc3339(row.get("created_at")),
        updated_at: rfc3339(row.get("updated_at")),
    })
}

fn email_sender_item_from_row(row: sqlx::postgres::PgRow) -> Result<EmailSenderItem, sqlx::Error> {
    Ok(EmailSenderItem {
        id: row.get::<i64, _>("id").to_string(),
        account_id: row.get::<i64, _>("account_id").to_string(),
        account_name: row.get("account_name"),
        from_address: row.get("from_address"),
        from_name: row.get("from_name"),
        enabled: row.get("enabled"),
        version: row.get::<i64, _>("version").to_string(),
        created_at: rfc3339(row.get("created_at")),
        updated_at: rfc3339(row.get("updated_at")),
    })
}

fn template_item_from_row(row: sqlx::postgres::PgRow) -> Result<TemplateItem, sqlx::Error> {
    Ok(TemplateItem {
        id: row.get::<i64, _>("id").to_string(),
        channel: row.get("channel"),
        template_code: row.get("template_code"),
        name: row.get("name"),
        subject: row.get("subject"),
        content: row.get("content"),
        variables: row
            .get::<serde_json::Value, _>("variables_json")
            .as_array()
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str().map(str::to_owned))
                    .collect()
            })
            .unwrap_or_default(),
        approval_status: row.get("approval_status"),
        approval_note: row.get("approval_note"),
        status: row.get("status"),
        created_at: rfc3339(row.get("created_at")),
        updated_at: rfc3339(row.get("updated_at")),
        created_by: row
            .get::<Option<i64>, _>("created_by")
            .map(|value| value.to_string()),
    })
}
