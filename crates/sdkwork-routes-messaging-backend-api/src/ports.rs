//! Messaging admin store port: DTOs and trait implemented by the PostgreSQL store.

use serde::{Deserialize, Serialize};
use serde_json::Value;

use sdkwork_messaging_delivery_service::MessagingChannelProvider;

#[derive(Clone, Debug)]
pub struct MessagingAdminSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: Option<i64>,
}

#[derive(Clone, Debug)]
pub struct MessagingPage<T> {
    pub items: Vec<T>,
    pub page: i64,
    pub page_size: i64,
    pub total_items: i64,
}

#[derive(Debug)]
pub enum StoreError {
    NotFound(String),
    Conflict(String),
    Invalid(String),
    Unavailable(String),
}

// ---------------------------------------------------------------- notification

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationItem {
    pub id: String,
    pub title: String,
    pub body: String,
    pub category: String,
    pub priority: String,
    pub status: String,
    pub action_url: Option<String>,
    pub metadata: Value,
    pub created_at: String,
    pub read_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNotificationCommand {
    pub recipient_user_ids: Vec<i64>,
    pub title: String,
    pub body: String,
    pub category: Option<String>,
    pub priority: Option<String>,
    pub action_url: Option<String>,
    pub metadata: Option<Value>,
}

// --------------------------------------------------------------- announcement

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnnouncementItem {
    pub id: String,
    pub title: String,
    pub body: String,
    pub severity: String,
    pub status: String,
    pub require_ack: bool,
    pub publish_at: Option<String>,
    pub expire_at: Option<String>,
    pub acknowledged_at: Option<String>,
    pub metadata: Value,
    pub created_at: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishAnnouncementCommand {
    pub title: String,
    pub body: String,
    pub severity: Option<String>,
    pub require_ack: Option<bool>,
    pub publish_at: Option<String>,
    pub expire_at: Option<String>,
    pub audiences: Vec<AnnouncementAudience>,
    pub metadata: Option<Value>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnnouncementAudience {
    pub kind: String,
    pub value: Option<String>,
}

// -------------------------------------------------------------------- push

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PushMessageItem {
    pub id: String,
    pub title: String,
    pub body: String,
    pub status: String,
    pub badge: Option<i64>,
    pub collapse_key: Option<String>,
    pub data: Value,
    pub scheduled_at: Option<String>,
    pub created_at: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendPushMessageCommand {
    pub recipient_user_ids: Vec<i64>,
    pub title: String,
    pub body: String,
    pub badge: Option<i64>,
    pub collapse_key: Option<String>,
    pub data: Option<Value>,
    pub scheduled_at: Option<String>,
}

// ----------------------------------------------------------------- outbound

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OutboundMessageItem {
    pub id: String,
    pub channel: String,
    pub target_masked: String,
    pub subject: Option<String>,
    pub body: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendOutboundMessageCommand {
    pub channel: String,
    pub target: String,
    pub subject: Option<String>,
    pub body: String,
    pub payload: Option<Value>,
}

// ------------------------------------------------------ verification policy

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VerificationPolicyItem {
    pub id: String,
    pub scene_code: String,
    pub channel: String,
    pub ttl_seconds: i64,
    pub max_attempts: i64,
    pub message_subject: Option<String>,
    pub message_body_pattern: String,
    pub enabled: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVerificationPolicyCommand {
    pub ttl_seconds: Option<i64>,
    pub max_attempts: Option<i64>,
    pub message_subject: Option<String>,
    pub message_body_pattern: Option<String>,
    pub enabled: Option<bool>,
}

// ------------------------------------------------------------------ channel

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelItem {
    pub id: String,
    pub channel: String,
    pub provider: String,
    pub config: Value,
    pub has_secret: bool,
    pub key_display_masked: String,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateChannelCommand {
    pub provider: String,
    pub config: Value,
    pub secret: Option<String>,
    pub enabled: bool,
}

// ---------------------------------------------------------------- template

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateItem {
    pub id: String,
    pub channel: String,
    pub template_code: String,
    pub name: String,
    pub subject: Option<String>,
    pub content: String,
    pub variables: Vec<String>,
    pub approval_status: String,
    pub approval_note: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTemplateCommand {
    pub channel: String,
    pub template_code: String,
    pub name: String,
    pub subject: Option<String>,
    pub content: String,
    pub variables: Option<Vec<String>>,
    pub approval_status: Option<String>,
    pub approval_note: Option<String>,
    pub status: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTemplateCommand {
    pub name: String,
    pub subject: Option<String>,
    pub content: String,
    pub variables: Option<Vec<String>>,
    pub approval_status: Option<String>,
    pub approval_note: Option<String>,
    pub status: Option<String>,
}

// -------------------------------------------------------------------- store

#[async_trait::async_trait]
#[allow(clippy::too_many_arguments)]
pub trait MessagingAdminStore: Send + Sync {
    // notifications
    async fn list_notifications(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<NotificationItem>, StoreError>;
    async fn create_notification(
        &self,
        subject: &MessagingAdminSubject,
        command: &CreateNotificationCommand,
        idempotency_key: &str,
    ) -> Result<NotificationItem, StoreError>;

    // announcements
    async fn list_announcements(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<AnnouncementItem>, StoreError>;
    async fn publish_announcement(
        &self,
        subject: &MessagingAdminSubject,
        command: &PublishAnnouncementCommand,
        idempotency_key: &str,
    ) -> Result<AnnouncementItem, StoreError>;

    // push messages
    async fn list_push_messages(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<PushMessageItem>, StoreError>;
    async fn send_push_message(
        &self,
        subject: &MessagingAdminSubject,
        command: &SendPushMessageCommand,
        idempotency_key: &str,
    ) -> Result<PushMessageItem, StoreError>;

    // outbound messages
    async fn list_outbound_messages(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<OutboundMessageItem>, StoreError>;
    async fn send_outbound_message(
        &self,
        subject: &MessagingAdminSubject,
        command: &SendOutboundMessageCommand,
        idempotency_key: &str,
    ) -> Result<OutboundMessageItem, StoreError>;

    // verification policies
    async fn list_verification_policies(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<VerificationPolicyItem>, StoreError>;
    async fn update_verification_policy(
        &self,
        subject: &MessagingAdminSubject,
        policy_id: i64,
        command: &UpdateVerificationPolicyCommand,
        idempotency_key: &str,
    ) -> Result<VerificationPolicyItem, StoreError>;

    // channels
    async fn retrieve_channel(
        &self,
        subject: &MessagingAdminSubject,
        channel: &str,
    ) -> Result<ChannelItem, StoreError>;
    async fn update_channel(
        &self,
        subject: &MessagingAdminSubject,
        channel: &str,
        command: &UpdateChannelCommand,
        idempotency_key: &str,
    ) -> Result<ChannelItem, StoreError>;

    // templates
    async fn list_templates(
        &self,
        subject: &MessagingAdminSubject,
        channel: Option<&str>,
        status: Option<&str>,
        keyword: Option<&str>,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<TemplateItem>, StoreError>;
    async fn create_template(
        &self,
        subject: &MessagingAdminSubject,
        command: &CreateTemplateCommand,
        idempotency_key: &str,
    ) -> Result<TemplateItem, StoreError>;
    async fn retrieve_template(
        &self,
        subject: &MessagingAdminSubject,
        template_id: i64,
    ) -> Result<TemplateItem, StoreError>;
    async fn update_template(
        &self,
        subject: &MessagingAdminSubject,
        template_id: i64,
        command: &UpdateTemplateCommand,
        idempotency_key: &str,
    ) -> Result<TemplateItem, StoreError>;
    async fn delete_template(
        &self,
        subject: &MessagingAdminSubject,
        template_id: i64,
        idempotency_key: &str,
    ) -> Result<(), StoreError>;
}

// ---------------------------------------------------------- enum validation

pub fn parse_channel(value: &str) -> Result<&'static str, String> {
    match value {
        "sms" => Ok("sms"),
        "email" => Ok("email"),
        _ => Err(format!("channel must be one of: sms, email (found `{value}`)")),
    }
}

pub fn parse_channel_provider(channel: &str, value: &str) -> Result<MessagingChannelProvider, String> {
    match (channel, value) {
        ("email", "smtp") => Ok(MessagingChannelProvider::Smtp),
        ("sms", "aliyun") => Ok(MessagingChannelProvider::Aliyun),
        ("sms", "tencent") => Ok(MessagingChannelProvider::Tencent),
        ("sms", "generic_http") => Ok(MessagingChannelProvider::GenericHttp),
        _ => Err(format!(
            "provider `{value}` is not valid for channel `{channel}` (email: smtp; sms: aliyun, tencent, generic_http)"
        )),
    }
}

pub fn parse_notification_priority(value: Option<&str>) -> Result<&'static str, String> {
    match value.unwrap_or("normal") {
        "low" => Ok("low"),
        "normal" => Ok("normal"),
        "high" => Ok("high"),
        "urgent" => Ok("urgent"),
        other => Err(format!("priority must be one of: low, normal, high, urgent (found `{other}`)")),
    }
}

pub fn parse_announcement_severity(value: Option<&str>) -> Result<&'static str, String> {
    match value.unwrap_or("info") {
        "info" => Ok("info"),
        "success" => Ok("success"),
        "warning" => Ok("warning"),
        "critical" => Ok("critical"),
        other => Err(format!("severity must be one of: info, success, warning, critical (found `{other}`)")),
    }
}

pub fn parse_audience_kind(value: &str) -> Result<&'static str, String> {
    match value {
        "all_users" => Ok("all_users"),
        "tenant" => Ok("tenant"),
        "organization" => Ok("organization"),
        "role" => Ok("role"),
        "user_segment" => Ok("user_segment"),
        "explicit_users" => Ok("explicit_users"),
        _ => Err(format!(
            "audience kind must be one of: all_users, tenant, organization, role, user_segment, explicit_users (found `{value}`)"
        )),
    }
}

pub fn parse_template_approval_status(
    channel: &str,
    value: Option<&str>,
) -> Result<&'static str, String> {
    let effective = match value {
        Some(value) => value,
        None => {
            return Ok(if channel == "sms" {
                "pending"
            } else {
                "not_applicable"
            })
        }
    };
    match effective {
        "not_applicable" => Ok("not_applicable"),
        "pending" => Ok("pending"),
        "approved" => Ok("approved"),
        "rejected" => Ok("rejected"),
        other => Err(format!(
            "approvalStatus must be one of: not_applicable, pending, approved, rejected (found `{other}`)"
        )),
    }
}

pub fn parse_template_status(value: Option<&str>) -> Result<&'static str, String> {
    match value.unwrap_or("draft") {
        "draft" => Ok("draft"),
        "active" => Ok("active"),
        "disabled" => Ok("disabled"),
        other => Err(format!(
            "status must be one of: draft, active, disabled (found `{other}`)"
        )),
    }
}

pub fn mask_secret(secret: &str) -> String {
    if secret.len() <= 8 {
        return "********".to_owned();
    }
    format!("{}****{}", &secret[..3], &secret[secret.len() - 3..])
}

pub fn mask_target(target: &str) -> String {
    if target.len() <= 6 {
        return "******".to_owned();
    }
    format!("{}****{}", &target[..3], &target[target.len() - 3..])
}
