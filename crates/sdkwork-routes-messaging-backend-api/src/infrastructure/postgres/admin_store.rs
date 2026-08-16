//! PostgreSQL implementation of [`MessagingAdminStore`].

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use chrono::Utc;
use sdkwork_utils_rust::{sha256_hash, uuid};
use sqlx::{PgPool, Row};

use crate::application::messaging_secret_codec::{
    AesGcmMessagingSecretCodec, MessagingSecretCodec, MessagingSecretContext,
};
use crate::ports::{
    mask_secret, mask_target, AnnouncementItem, ChannelItem, CreateNotificationCommand,
    CreateTemplateCommand, MessagingAdminStore, MessagingAdminSubject, MessagingPage,
    NotificationItem, OutboundMessageItem, PublishAnnouncementCommand, PushMessageItem,
    SendOutboundMessageCommand, SendPushMessageCommand, StoreError, TemplateItem,
    UpdateChannelCommand, UpdateTemplateCommand, UpdateVerificationPolicyCommand,
    VerificationPolicyItem,
};

/// Snowflake-style runtime id generator (timestamp | worker | sequence).
pub struct MessagingRuntimeIdGenerator {
    worker_id: u16,
    sequence: AtomicU64,
}

impl MessagingRuntimeIdGenerator {
    pub fn new() -> Self {
        let worker_id = std::env::var("SDKWORK_MESSAGING_RUNTIME_WORKER_ID")
            .ok()
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or(0);
        Self {
            worker_id: worker_id & 0x3FF,
            sequence: AtomicU64::new(0),
        }
    }

    pub fn next_id(&self) -> i64 {
        let millis = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis() as i64)
            .unwrap_or(0);
        let sequence = self.sequence.fetch_add(1, Ordering::Relaxed) & 0xFFF;
        (millis << 22) | ((self.worker_id as i64) << 12) | (sequence as i64)
    }
}

impl Default for MessagingRuntimeIdGenerator {
    fn default() -> Self {
        Self::new()
    }
}

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

    fn channel_secret_context(&self, subject: &MessagingAdminSubject, channel: &str) -> MessagingSecretContext {
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
            (Some(key_id), Some(ciphertext)) => match self.secret_codec.decode(&context, key_id, ciphertext) {
                Ok(plaintext) => mask_secret(&plaintext),
                Err(_) => fingerprint
                    .map(|value| self.mask_from_fingerprint(value))
                    .unwrap_or_else(|| "********".to_owned()),
            },
            _ => "********".to_owned(),
        }
    }
}

fn rfc3339(value: chrono::DateTime<Utc>) -> String {
    value.to_rfc3339()
}

fn is_unique_violation(error: &sqlx::Error) -> bool {
    matches!(error, sqlx::Error::Database(db_error) if db_error.code().as_deref() == Some("23505"))
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
                status: row.get::<Option<String>, _>("recipient_status").unwrap_or_else(|| "unread".to_owned()),
                action_url: row.get("action_url"),
                metadata: row.get("payload_json"),
                created_at: rfc3339(row.get("created_at")),
                read_at: row.get::<Option<chrono::DateTime<Utc>>, _>("read_at").map(rfc3339),
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
            return Err(StoreError::Invalid("recipientUserIds must not be empty".to_owned()));
        }
        let id = self.next_id();
        let notification_uuid = uuid();
        let payload_json = command.metadata.clone().unwrap_or_else(|| serde_json::json!({}));
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
            return Err(StoreError::Unavailable("notification insert returned no rows".to_owned()));
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
            category: command.category.clone().unwrap_or_else(|| "general".to_owned()),
            priority: command.priority.clone().unwrap_or_else(|| "normal".to_owned()),
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
                publish_at: row.get::<Option<chrono::DateTime<Utc>>, _>("publish_at").map(rfc3339),
                expire_at: row.get::<Option<chrono::DateTime<Utc>>, _>("expire_at").map(rfc3339),
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
            return Err(StoreError::Invalid("audiences must not be empty".to_owned()));
        }
        let id = self.next_id();
        let announcement_uuid = uuid();
        let publish_at = command
            .publish_at
            .as_deref()
            .map(|value| chrono::DateTime::parse_from_rfc3339(value))
            .transpose()
            .map_err(|error| StoreError::Invalid(format!("publishAt is not a valid date-time: {error}")))?
            .map(|value| value.with_timezone(&Utc));
        let expire_at = command
            .expire_at
            .as_deref()
            .map(|value| chrono::DateTime::parse_from_rfc3339(value))
            .transpose()
            .map_err(|error| StoreError::Invalid(format!("expireAt is not a valid date-time: {error}")))?
            .map(|value| value.with_timezone(&Utc));
        if let (Some(publish_at), Some(expire_at)) = (&publish_at, &expire_at) {
            if expire_at <= publish_at {
                return Err(StoreError::Invalid("expireAt must be after publishAt".to_owned()));
            }
        }
        let now = Utc::now();
        let status = match &publish_at {
            Some(publish_at) if *publish_at > now => "scheduled",
            _ => "published",
        };
        let payload_json = command.metadata.clone().unwrap_or_else(|| serde_json::json!({}));

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
            return Err(StoreError::Unavailable("announcement insert returned no rows".to_owned()));
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
            severity: command.severity.clone().unwrap_or_else(|| "info".to_owned()),
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
                scheduled_at: row.get::<Option<chrono::DateTime<Utc>>, _>("scheduled_at").map(rfc3339),
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
            return Err(StoreError::Invalid("recipientUserIds must not be empty".to_owned()));
        }
        if command.badge.is_some_and(|badge| badge < 0) {
            return Err(StoreError::Invalid("badge must not be negative".to_owned()));
        }
        let id = self.next_id();
        let push_uuid = uuid();
        let data_json = command.data.clone().unwrap_or_else(|| serde_json::json!({}));
        let scheduled_at = command
            .scheduled_at
            .as_deref()
            .map(|value| chrono::DateTime::parse_from_rfc3339(value))
            .transpose()
            .map_err(|error| StoreError::Invalid(format!("scheduledAt is not a valid date-time: {error}")))?
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
            return Err(StoreError::Unavailable("push message insert returned no rows".to_owned()));
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
        let payload_json = command.payload.clone().unwrap_or_else(|| serde_json::json!({}));
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
            return Err(StoreError::Unavailable("outbound message insert returned no rows".to_owned()));
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
                return Err(StoreError::Invalid("ttlSeconds must be positive".to_owned()));
            }
        }
        if let Some(attempts) = command.max_attempts {
            if attempts <= 0 {
                return Err(StoreError::Invalid("maxAttempts must be positive".to_owned()));
            }
        }
        if let Some(pattern) = &command.message_body_pattern {
            if pattern.trim().is_empty() {
                return Err(StoreError::Invalid("messageBodyPattern must not be empty".to_owned()));
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

    // ---------------------------------------------------------------- channels

    async fn retrieve_channel(
        &self,
        subject: &MessagingAdminSubject,
        channel: &str,
    ) -> Result<ChannelItem, StoreError> {
        crate::ports::parse_channel(channel).map_err(StoreError::Invalid)?;
        let row = sqlx::query(
            "SELECT id, channel, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_at, updated_at \
             FROM messaging_channel \
             WHERE tenant_id = $1 AND organization_id = $2 AND channel = $3 AND deleted_at IS NULL",
        )
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(channel)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?
        .ok_or_else(|| StoreError::NotFound(format!("channel `{channel}` is not configured")))?;

        let key_id: Option<String> = row.get("secret_key_id");
        let ciphertext: Option<String> = row.get("secret_ciphertext");
        let fingerprint: Option<String> = row.get("secret_fingerprint");
        let key_display_masked = self
            .resolve_channel_mask(subject, channel, key_id.as_deref(), ciphertext.as_deref(), fingerprint.as_deref())
            .await;

        Ok(ChannelItem {
            id: row.get::<i64, _>("id").to_string(),
            channel: row.get("channel"),
            provider: row.get("provider"),
            config: row.get("config_json"),
            has_secret: fingerprint.is_some(),
            key_display_masked,
            enabled: row.get("enabled"),
            created_at: rfc3339(row.get("created_at")),
            updated_at: rfc3339(row.get("updated_at")),
        })
    }

    async fn update_channel(
        &self,
        subject: &MessagingAdminSubject,
        channel: &str,
        command: &UpdateChannelCommand,
        _idempotency_key: &str,
    ) -> Result<ChannelItem, StoreError> {
        crate::ports::parse_channel(channel).map_err(StoreError::Invalid)?;
        let provider = crate::ports::parse_channel_provider(channel, &command.provider)
            .map_err(StoreError::Invalid)?;
        let provider = provider.as_str();

        let encoded = match &command.secret {
            Some(secret) if secret.trim().is_empty() => None,
            Some(secret) => {
                let context = self.channel_secret_context(subject, channel);
                Some(
                    self.secret_codec
                        .encode(&context, secret)
                        .map_err(StoreError::Invalid)?,
                )
            }
            None => None,
        };

        let row = sqlx::query(
            "INSERT INTO messaging_channel \
             (id, uuid, tenant_id, organization_id, channel, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) \
             ON CONFLICT (tenant_id, organization_id, channel) DO UPDATE SET \
                provider = EXCLUDED.provider, \
                config_json = EXCLUDED.config_json, \
                enabled = EXCLUDED.enabled, \
                secret_ciphertext = CASE WHEN EXCLUDED.secret_ciphertext IS NULL THEN messaging_channel.secret_ciphertext ELSE EXCLUDED.secret_ciphertext END, \
                secret_key_id = CASE WHEN EXCLUDED.secret_key_id IS NULL THEN messaging_channel.secret_key_id ELSE EXCLUDED.secret_key_id END, \
                secret_fingerprint = CASE WHEN EXCLUDED.secret_fingerprint IS NULL THEN messaging_channel.secret_fingerprint ELSE EXCLUDED.secret_fingerprint END, \
                updated_at = CURRENT_TIMESTAMP, \
                version = messaging_channel.version + 1 \
             RETURNING id, channel, provider, config_json, secret_ciphertext, secret_key_id, secret_fingerprint, enabled, created_at, updated_at",
        )
        .bind(self.next_id())
        .bind(uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(channel)
        .bind(provider)
        .bind(&command.config)
        .bind(encoded.as_ref().map(|value| value.ciphertext.as_str()))
        .bind(encoded.as_ref().map(|value| value.key_id.as_str()))
        .bind(encoded.as_ref().map(|value| value.fingerprint.as_str()))
        .bind(command.enabled)
        .bind(subject.operator_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| StoreError::Unavailable(error.to_string()))?;

        let key_id: Option<String> = row.get("secret_key_id");
        let ciphertext: Option<String> = row.get("secret_ciphertext");
        let fingerprint: Option<String> = row.get("secret_fingerprint");
        let key_display_masked = match &encoded {
            Some(_) => mask_secret(command.secret.as_deref().unwrap_or("")),
            None => self
                .resolve_channel_mask(subject, channel, key_id.as_deref(), ciphertext.as_deref(), fingerprint.as_deref())
                .await,
        };

        Ok(ChannelItem {
            id: row.get::<i64, _>("id").to_string(),
            channel: row.get("channel"),
            provider: row.get("provider"),
            config: row.get("config_json"),
            has_secret: fingerprint.is_some(),
            key_display_masked,
            enabled: row.get("enabled"),
            created_at: rfc3339(row.get("created_at")),
            updated_at: rfc3339(row.get("updated_at")),
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
            return Err(StoreError::Invalid("templateCode must not be empty".to_owned()));
        }
        if command.name.trim().is_empty() {
            return Err(StoreError::Invalid("name must not be empty".to_owned()));
        }
        if command.content.trim().is_empty() {
            return Err(StoreError::Invalid("content must not be empty".to_owned()));
        }
        if command.channel == "email"
            && command.subject.as_deref().map_or(true, |value| value.is_empty())
        {
            return Err(StoreError::Invalid("subject is required for email templates".to_owned()));
        }
        let approval_status = crate::ports::parse_template_approval_status(
            &command.channel,
            command.approval_status.as_deref(),
        )
        .map_err(StoreError::Invalid)?;
        let status =
            crate::ports::parse_template_status(command.status.as_deref()).map_err(StoreError::Invalid)?;
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
        let status =
            crate::ports::parse_template_status(command.status.as_deref()).map_err(StoreError::Invalid)?;

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
