//! Messaging admin store port: DTOs and trait implemented by the PostgreSQL store.

use serde::{Deserialize, Serialize};
use serde_json::Value;

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
    pub version: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVerificationPolicyCommand {
    pub ttl_seconds: Option<i64>,
    pub max_attempts: Option<i64>,
    pub message_subject: Option<String>,
    pub message_body_pattern: Option<String>,
    pub enabled: Option<bool>,
    /// Optimistic concurrency guard (DATABASE_SPEC §17).
    pub expected_version: String,
}

// ------------------------------------------------------------- email accounts

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailAccountItem {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub config: Value,
    pub has_secret: bool,
    pub key_display_masked: String,
    /// Outbound switch: the account participates in email delivery routing.
    pub enabled: bool,
    /// Inbound switch: the account's IMAP/POP3 receive configuration is active.
    pub receive_enabled: bool,
    pub created_at: String,
    pub updated_at: String,
    pub version: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEmailAccountCommand {
    pub name: String,
    pub provider: String,
    pub config: Value,
    pub secret: Option<String>,
    pub enabled: bool,
    /// Inbound (IMAP/POP3) switch; omitted means disabled.
    #[serde(default)]
    pub receive_enabled: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEmailAccountCommand {
    pub name: String,
    pub provider: String,
    pub config: Value,
    pub secret: Option<String>,
    pub enabled: bool,
    /// Inbound (IMAP/POP3) switch; omitted means disabled.
    #[serde(default)]
    pub receive_enabled: bool,
    /// Optimistic concurrency guard (DATABASE_SPEC §17): the version read by the
    /// client; the update applies only when it still matches.
    pub expected_version: String,
}

// -------------------------------------------------------------- email senders

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailSenderItem {
    pub id: String,
    pub account_id: String,
    pub account_name: String,
    pub from_address: String,
    pub from_name: Option<String>,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
    pub version: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEmailSenderCommand {
    pub account_id: String,
    pub from_address: String,
    pub from_name: Option<String>,
    pub enabled: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEmailSenderCommand {
    pub from_address: String,
    pub from_name: Option<String>,
    pub enabled: bool,
    /// Optimistic concurrency guard (DATABASE_SPEC §17): the version read by the
    /// client; the update applies only when it still matches.
    pub expected_version: String,
}

// ----------------------------------------------------------- email send rules

/// One resolved routing step: a sender identity with the account it belongs
/// to. Chains are ordered; delivery falls through in order.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailSendRuleStep {
    pub sender_id: String,
    pub account_id: String,
    pub account_name: String,
    pub from_address: String,
    pub from_name: Option<String>,
    pub enabled: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailSendRuleItem {
    pub scenario: String,
    pub chain: Vec<EmailSendRuleStep>,
    pub enabled: bool,
    /// Absent while the scenario has never been configured.
    pub updated_at: Option<String>,
    pub version: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEmailSendRuleCommand {
    pub sender_ids: Vec<String>,
    pub enabled: bool,
    /// Optimistic concurrency guard (DATABASE_SPEC §17): the version read by the
    /// client; the update applies only when it still matches.
    pub expected_version: String,
}

// --------------------------------------------------------------- sms accounts

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmsAccountItem {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub config: Value,
    pub has_secret: bool,
    pub key_display_masked: String,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
    pub version: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSmsAccountCommand {
    pub name: String,
    pub provider: String,
    pub config: Value,
    pub secret: Option<String>,
    pub enabled: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSmsAccountCommand {
    pub name: String,
    pub provider: String,
    pub config: Value,
    pub secret: Option<String>,
    pub enabled: bool,
    /// Optimistic concurrency guard (DATABASE_SPEC §17): the version read by the
    /// client; the update applies only when it still matches.
    pub expected_version: String,
}

// ------------------------------------------------------------ sms signatures

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmsSignatureItem {
    pub id: String,
    pub account_id: String,
    pub account_name: String,
    pub sign_name: String,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
    pub version: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSmsSignatureCommand {
    pub account_id: String,
    pub sign_name: String,
    pub enabled: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSmsSignatureCommand {
    pub sign_name: String,
    pub enabled: bool,
    /// Optimistic concurrency guard (DATABASE_SPEC §17): the version read by the
    /// client; the update applies only when it still matches.
    pub expected_version: String,
}

// ------------------------------------------------------------- sms send rules

/// One resolved routing step: a signature with the account it belongs to.
/// Chains are ordered; delivery falls through in order.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmsSendRuleStep {
    pub signature_id: String,
    pub account_id: String,
    pub account_name: String,
    pub sign_name: String,
    pub enabled: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmsSendRuleItem {
    pub scenario: String,
    pub chain: Vec<SmsSendRuleStep>,
    pub enabled: bool,
    /// Absent while the scenario has never been configured.
    pub updated_at: Option<String>,
    pub version: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSmsSendRuleCommand {
    pub signature_ids: Vec<String>,
    pub enabled: bool,
    /// Optimistic concurrency guard (DATABASE_SPEC §17): the version read by the
    /// client; the update applies only when it still matches.
    pub expected_version: String,
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
    pub version: String,
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
    /// Optimistic concurrency guard (DATABASE_SPEC §17).
    pub expected_version: String,
}

// -------------------------------------------------------------------- store

#[async_trait::async_trait]
// async_trait desugars every method to `Pin<Box<dyn Future>>` returns, which
// clippy flags as double_must_use; the macro expansion is not hand-editable.
#[allow(clippy::double_must_use)]
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

    // email provider accounts (multi-provider email configuration)
    async fn list_email_accounts(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<EmailAccountItem>, StoreError>;
    async fn create_email_account(
        &self,
        subject: &MessagingAdminSubject,
        command: &CreateEmailAccountCommand,
        idempotency_key: &str,
    ) -> Result<EmailAccountItem, StoreError>;
    async fn retrieve_email_account(
        &self,
        subject: &MessagingAdminSubject,
        account_id: i64,
    ) -> Result<EmailAccountItem, StoreError>;
    async fn update_email_account(
        &self,
        subject: &MessagingAdminSubject,
        account_id: i64,
        command: &UpdateEmailAccountCommand,
        idempotency_key: &str,
    ) -> Result<EmailAccountItem, StoreError>;
    async fn delete_email_account(
        &self,
        subject: &MessagingAdminSubject,
        account_id: i64,
        idempotency_key: &str,
    ) -> Result<(), StoreError>;

    // email sender identities
    async fn list_email_senders(
        &self,
        subject: &MessagingAdminSubject,
        account_id: Option<i64>,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<EmailSenderItem>, StoreError>;
    async fn create_email_sender(
        &self,
        subject: &MessagingAdminSubject,
        command: &CreateEmailSenderCommand,
        idempotency_key: &str,
    ) -> Result<EmailSenderItem, StoreError>;
    async fn retrieve_email_sender(
        &self,
        subject: &MessagingAdminSubject,
        sender_id: i64,
    ) -> Result<EmailSenderItem, StoreError>;
    async fn update_email_sender(
        &self,
        subject: &MessagingAdminSubject,
        sender_id: i64,
        command: &UpdateEmailSenderCommand,
        idempotency_key: &str,
    ) -> Result<EmailSenderItem, StoreError>;
    async fn delete_email_sender(
        &self,
        subject: &MessagingAdminSubject,
        sender_id: i64,
        idempotency_key: &str,
    ) -> Result<(), StoreError>;

    // email per-scenario routing chains
    async fn list_email_send_rules(
        &self,
        subject: &MessagingAdminSubject,
    ) -> Result<Vec<EmailSendRuleItem>, StoreError>;
    async fn update_email_send_rule(
        &self,
        subject: &MessagingAdminSubject,
        scenario: &str,
        command: &UpdateEmailSendRuleCommand,
        idempotency_key: &str,
    ) -> Result<EmailSendRuleItem, StoreError>;

    // sms provider accounts (multi-provider sms configuration)
    async fn list_sms_accounts(
        &self,
        subject: &MessagingAdminSubject,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<SmsAccountItem>, StoreError>;
    async fn create_sms_account(
        &self,
        subject: &MessagingAdminSubject,
        command: &CreateSmsAccountCommand,
        idempotency_key: &str,
    ) -> Result<SmsAccountItem, StoreError>;
    async fn retrieve_sms_account(
        &self,
        subject: &MessagingAdminSubject,
        account_id: i64,
    ) -> Result<SmsAccountItem, StoreError>;
    async fn update_sms_account(
        &self,
        subject: &MessagingAdminSubject,
        account_id: i64,
        command: &UpdateSmsAccountCommand,
        idempotency_key: &str,
    ) -> Result<SmsAccountItem, StoreError>;
    async fn delete_sms_account(
        &self,
        subject: &MessagingAdminSubject,
        account_id: i64,
        idempotency_key: &str,
    ) -> Result<(), StoreError>;

    // sms signature identities
    async fn list_sms_signatures(
        &self,
        subject: &MessagingAdminSubject,
        account_id: Option<i64>,
        page: i64,
        page_size: i64,
    ) -> Result<MessagingPage<SmsSignatureItem>, StoreError>;
    async fn create_sms_signature(
        &self,
        subject: &MessagingAdminSubject,
        command: &CreateSmsSignatureCommand,
        idempotency_key: &str,
    ) -> Result<SmsSignatureItem, StoreError>;
    async fn retrieve_sms_signature(
        &self,
        subject: &MessagingAdminSubject,
        signature_id: i64,
    ) -> Result<SmsSignatureItem, StoreError>;
    async fn update_sms_signature(
        &self,
        subject: &MessagingAdminSubject,
        signature_id: i64,
        command: &UpdateSmsSignatureCommand,
        idempotency_key: &str,
    ) -> Result<SmsSignatureItem, StoreError>;
    async fn delete_sms_signature(
        &self,
        subject: &MessagingAdminSubject,
        signature_id: i64,
        idempotency_key: &str,
    ) -> Result<(), StoreError>;

    // sms per-scenario routing chains
    async fn list_sms_send_rules(
        &self,
        subject: &MessagingAdminSubject,
    ) -> Result<Vec<SmsSendRuleItem>, StoreError>;
    async fn update_sms_send_rule(
        &self,
        subject: &MessagingAdminSubject,
        scenario: &str,
        command: &UpdateSmsSendRuleCommand,
        idempotency_key: &str,
    ) -> Result<SmsSendRuleItem, StoreError>;

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
        _ => Err(format!(
            "channel must be one of: sms, email (found `{value}`)"
        )),
    }
}

/// Email provider catalog for `messaging_email_account` rows. The legacy
/// single-channel endpoint only ever exposed `smtp`; the multi-account
/// surface accepts the full well-known provider set. Consumer mailbox
/// services (`tencent_mail`, `mail_139`, `gmail`, `microsoft`) ship ready-made
/// send and receive presets; cloud delivery providers (`aliyun`, `tencent`,
/// `sendgrid`, `mailgun`, `amazon_ses`, `postmark`, `resend`) are send-only.
pub fn parse_email_provider(value: &str) -> Result<&'static str, String> {
    match value {
        "smtp" => Ok("smtp"),
        "enterprise_mail" => Ok("enterprise_mail"),
        "aliyun" => Ok("aliyun"),
        "tencent" => Ok("tencent"),
        "tencent_mail" => Ok("tencent_mail"),
        "mail_139" => Ok("mail_139"),
        "gmail" => Ok("gmail"),
        "microsoft" => Ok("microsoft"),
        "sendgrid" => Ok("sendgrid"),
        "mailgun" => Ok("mailgun"),
        "amazon_ses" => Ok("amazon_ses"),
        "postmark" => Ok("postmark"),
        "resend" => Ok("resend"),
        other => Err(format!(
            "email provider must be one of: smtp, enterprise_mail, aliyun, tencent, tencent_mail, mail_139, gmail, microsoft, sendgrid, mailgun, amazon_ses, postmark, resend (found `{other}`)"
        )),
    }
}

/// SMS provider catalog for `messaging_sms_account` rows. The legacy
/// single-channel endpoint only exposed aliyun/tencent/generic_http; the
/// multi-account surface accepts the full well-known provider set.
pub fn parse_sms_provider(value: &str) -> Result<&'static str, String> {
    match value {
        "aliyun" => Ok("aliyun"),
        "tencent" => Ok("tencent"),
        "huawei" => Ok("huawei"),
        "yuntongxun" => Ok("yuntongxun"),
        "submail" => Ok("submail"),
        "chuanglan" => Ok("chuanglan"),
        "twilio" => Ok("twilio"),
        "generic_http" => Ok("generic_http"),
        other => Err(format!(
            "sms provider must be one of: aliyun, tencent, huawei, yuntongxun, submail, chuanglan, twilio, generic_http (found `{other}`)"
        )),
    }
}

/// Fixed scenario vocabulary for per-scenario routing chains, shared by the
/// email and sms multi-account surfaces. `default` is the catch-all; delivery
/// falls back to it when a specific scenario has no usable sender.
pub const SEND_RULE_SCENARIOS: &[&str] = &[
    "default",
    "verification_code",
    "system_notification",
    "marketing",
];

pub fn parse_send_rule_scenario(value: &str) -> Result<&'static str, String> {
    match value {
        "default" => Ok("default"),
        "verification_code" => Ok("verification_code"),
        "system_notification" => Ok("system_notification"),
        "marketing" => Ok("marketing"),
        other => Err(format!(
            "send rule scenario must be one of: default, verification_code, system_notification, marketing (found `{other}`)"
        )),
    }
}

/// Light syntactic check for sender addresses on the configuration surface.
/// Deliverability remains the provider's concern; this only rejects values
/// that can never be an email address.
pub fn parse_email_address(value: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("fromAddress must not be empty".to_owned());
    }
    let local_and_domain: Vec<&str> = trimmed.rsplitn(2, '@').collect();
    if local_and_domain.len() != 2
        || local_and_domain[0].is_empty()
        || local_and_domain[1].is_empty()
        || trimmed.contains(char::is_whitespace)
    {
        return Err(format!(
            "fromAddress `{trimmed}` is not a valid email address"
        ));
    }
    Ok(())
}

/// Light syntactic check for SMS signatures on the configuration surface.
/// Content review remains the provider's concern; this only rejects values
/// that can never be a signature (empty or over-length).
pub fn parse_sms_sign_name(value: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("signName must not be empty".to_owned());
    }
    if trimmed.chars().count() > 64 {
        return Err("signName must be at most 64 characters".to_owned());
    }
    Ok(())
}

pub fn parse_notification_priority(value: Option<&str>) -> Result<&'static str, String> {
    match value.unwrap_or("normal") {
        "low" => Ok("low"),
        "normal" => Ok("normal"),
        "high" => Ok("high"),
        "urgent" => Ok("urgent"),
        other => Err(format!(
            "priority must be one of: low, normal, high, urgent (found `{other}`)"
        )),
    }
}

pub fn parse_announcement_severity(value: Option<&str>) -> Result<&'static str, String> {
    match value.unwrap_or("info") {
        "info" => Ok("info"),
        "success" => Ok("success"),
        "warning" => Ok("warning"),
        "critical" => Ok("critical"),
        other => Err(format!(
            "severity must be one of: info, success, warning, critical (found `{other}`)"
        )),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_provider_catalog_accepts_consumer_mailbox_and_delivery_providers() {
        // Consumer mailbox services ship send + receive presets.
        for provider in [
            "enterprise_mail",
            "tencent_mail",
            "mail_139",
            "gmail",
            "microsoft",
        ] {
            assert_eq!(
                parse_email_provider(provider).expect("mailbox provider must be accepted"),
                provider,
                "consumer mailbox provider must round-trip"
            );
        }
        // Cloud delivery providers and the generic SMTP fallback stay valid.
        for provider in [
            "smtp",
            "aliyun",
            "tencent",
            "sendgrid",
            "mailgun",
            "amazon_ses",
            "postmark",
            "resend",
        ] {
            assert_eq!(
                parse_email_provider(provider).expect("delivery provider must be accepted"),
                provider
            );
        }
        // Version 1 of the catalog stays readable after the expansion.
        assert!(parse_email_provider("mail_139").is_ok());
        let error =
            parse_email_provider("exchange").expect_err("unknown provider must be rejected");
        assert!(
            error.contains("tencent_mail") && error.contains("microsoft"),
            "rejection message must enumerate the expanded catalog: {error}"
        );
    }
}
