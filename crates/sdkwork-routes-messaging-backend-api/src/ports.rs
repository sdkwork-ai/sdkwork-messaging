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
    /// Business scenario used for routing and record grouping. Stored in the
    /// message payload so the send-record and dashboard surfaces can group by it.
    pub scenario: Option<String>,
    /// Template code used to render the message, when one was applied.
    pub template_code: Option<String>,
    /// Provider selected for this send. When set together with `templateCode`,
    /// the provider-specific template binding is resolved and its external id is
    /// carried on the message payload for the delivery adapter.
    pub provider: Option<String>,
}

// ------------------------------------------------------------- send records

/// One delivery attempt of an outbound message, resolved from
/// `messaging_outbound_delivery`.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessagingSendAttemptItem {
    pub id: String,
    pub provider: Option<String>,
    pub provider_message_id: Option<String>,
    pub status: String,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub sent_at: Option<String>,
    pub delivered_at: Option<String>,
    pub failed_at: Option<String>,
    pub created_at: String,
}

/// A send record as listed by `/admin/notify/email-records` and
/// `/admin/notify/sms-records`.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessagingSendRecordItem {
    pub id: String,
    pub channel: String,
    pub target_masked: String,
    pub subject: Option<String>,
    /// Full message body (email HTML or SMS text). The list preview is derived
    /// from it; the detail drawer renders this value as the HTML source.
    pub body: String,
    /// Plain-text rendering of the body (HTML tags stripped, whitespace
    /// collapsed). Used by the detail drawer so operators do not read raw tags.
    pub body_text: String,
    pub body_preview: String,
    pub status: String,
    pub scenario: String,
    pub template_code: Option<String>,
    pub provider: Option<String>,
    pub provider_message_id: Option<String>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub attempt_count: i64,
    pub created_at: String,
    pub sent_at: Option<String>,
    pub delivered_at: Option<String>,
    pub failed_at: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessagingSendRecordDetail {
    #[serde(flatten)]
    pub item: MessagingSendRecordItem,
    pub attempts: Vec<MessagingSendAttemptItem>,
}

/// Server-side filters for the send-record list. Date bounds are inclusive
/// `from` and exclusive `to` in UTC.
#[derive(Clone, Debug)]
pub struct SendRecordFilter {
    pub status: Option<String>,
    pub q: Option<String>,
    pub from: Option<chrono::DateTime<chrono::Utc>>,
    pub to: Option<chrono::DateTime<chrono::Utc>>,
    pub page: i64,
    pub page_size: i64,
}

// --------------------------------------------------------------- dashboard

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessagingDashboardTotals {
    pub total: i64,
    pub email: i64,
    pub sms: i64,
    pub delivered: i64,
    pub failed: i64,
    pub pending: i64,
    /// `delivered + opened` over `delivered + opened + failed`, in `[0, 1]`.
    pub success_rate: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessagingDashboardChannel {
    pub channel: String,
    pub total: i64,
    pub delivered: i64,
    pub failed: i64,
    pub pending: i64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessagingDashboardStatus {
    pub status: String,
    pub count: i64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessagingDashboardScenario {
    pub scenario: String,
    pub channel: String,
    pub total: i64,
    pub failed: i64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessagingDashboardProvider {
    pub provider: String,
    pub channel: String,
    pub total: i64,
    pub failed: i64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessagingDashboardTrendPoint {
    /// UTC calendar day (`YYYY-MM-DD`).
    pub date: String,
    pub email: i64,
    pub sms: i64,
    pub delivered: i64,
    pub failed: i64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessagingDashboardSummary {
    pub range_days: i64,
    pub from: String,
    pub to: String,
    pub totals: MessagingDashboardTotals,
    pub by_channel: Vec<MessagingDashboardChannel>,
    pub by_status: Vec<MessagingDashboardStatus>,
    pub by_scenario: Vec<MessagingDashboardScenario>,
    pub by_provider: Vec<MessagingDashboardProvider>,
    pub trend: Vec<MessagingDashboardTrendPoint>,
    pub recent_failures: Vec<MessagingSendRecordItem>,
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
    /// IAM cloud account supplying this provider's credential. `None` means the
    /// account uses its own stored `secret_ciphertext`.
    pub provider_account_id: Option<String>,
    /// Whether the bound cloud account currently holds active credential
    /// material, so the console can flag "bound but not credentialed".
    pub provider_account_ready: bool,
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
    /// Optional IAM cloud account to bind while creating the account.
    #[serde(default)]
    pub provider_account_id: Option<String>,
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
    /// Omit to keep the current cloud-account binding; send an empty string to
    /// clear it and fall back to the local secret.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_account_id: Option<String>,
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
    /// Whether the sender identity itself is enabled (sender switch).
    pub identity_enabled: bool,
    /// Whether the owning provider account is enabled.
    pub account_enabled: bool,
    /// Whether the provider account has channel credentials stored.
    /// Seeded accounts start without credentials by design.
    pub has_secret: bool,
    /// Whether this step participates in the fallback chain. A disabled step
    /// stays in place for later re-activation instead of being removed.
    pub step_enabled: bool,
    /// IAM cloud account bound to the owning provider account, when bound.
    pub provider_account_id: Option<String>,
    /// Whether this step can obtain credentials: either the bound cloud account
    /// has active material, or the account carries its own secret.
    pub credentials_ready: bool,
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
pub struct EmailSendRuleStepCommand {
    pub sender_id: String,
    pub enabled: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEmailSendRuleCommand {
    pub steps: Vec<EmailSendRuleStepCommand>,
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
    /// IAM cloud account supplying this provider's credential. Signatures may
    /// override it with their own binding.
    pub provider_account_id: Option<String>,
    /// Whether the bound cloud account currently holds active credential
    /// material.
    pub provider_account_ready: bool,
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
    /// Optional IAM cloud account to bind while creating the account.
    #[serde(default)]
    pub provider_account_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSmsAccountCommand {
    pub name: String,
    pub provider: String,
    pub config: Value,
    pub secret: Option<String>,
    pub enabled: bool,
    /// Omit to keep the current cloud-account binding; send an empty string to
    /// clear it and fall back to the local secret.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_account_id: Option<String>,
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
    /// Reusable cloud account (IAM `iam_provider_account`) backing this
    /// signature. `None` means the signature uses the provider account's own
    /// stored credential, which is the pre-existing behaviour.
    pub provider_account_id: Option<String>,
    /// Whether the bound cloud account currently has active credential
    /// material, so the console can flag "bound but not credentialed".
    pub provider_account_ready: bool,
    /// The installation's default signature: the one the send chains start
    /// from and the one an operator edits first. At most one per scope.
    pub is_default: bool,
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
    /// Optional IAM cloud account to bind while creating the signature.
    #[serde(default)]
    pub provider_account_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSmsSignatureCommand {
    pub sign_name: String,
    /// Omit to keep the current cloud-account binding; send an empty string to
    /// clear it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_account_id: Option<String>,
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
    /// Whether the signature identity itself is enabled.
    pub identity_enabled: bool,
    /// Whether the owning provider account is enabled.
    pub account_enabled: bool,
    /// Whether the provider account has channel credentials stored.
    /// Seeded accounts start without credentials by design.
    pub has_secret: bool,
    /// Whether this step participates in the fallback chain.
    pub step_enabled: bool,
    /// IAM cloud account bound to this signature, when one is bound.
    pub provider_account_id: Option<String>,
    /// Whether this step can actually obtain credentials: either the bound
    /// cloud account has active material, or the account carries its own
    /// secret. Steps that cannot are skipped by the send path.
    pub credentials_ready: bool,
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
pub struct SmsSendRuleStepCommand {
    pub signature_id: String,
    pub enabled: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSmsSendRuleCommand {
    pub steps: Vec<SmsSendRuleStepCommand>,
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

/// One provider-specific registration of a message template.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateProviderBindingItem {
    pub provider: String,
    /// Provider-side template id (SMS carrier template id, email provider
    /// template id, or the local rendering reference for SMTP providers).
    pub provider_template_id: Option<String>,
    pub provider_template_name: Option<String>,
    pub sync_status: String,
    pub sync_message: Option<String>,
    pub last_synced_at: Option<String>,
    pub version: String,
}

/// Command for one-click registration of a template with every provider of its
/// channel (or only the requested subset).
#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncTemplateProvidersCommand {
    pub providers: Option<Vec<String>>,
    /// Replace an existing provider template id with the deterministic local
    /// reference. Defaults to false; operator-entered ids are never overwritten.
    pub overwrite: Option<bool>,
}

/// Manual update of one provider binding, normally used after the provider
/// approves a template and returns its real template id.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTemplateProviderCommand {
    pub provider_template_id: Option<String>,
    pub provider_template_name: Option<String>,
    pub sync_status: Option<String>,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateProviderSyncResult {
    pub synced: usize,
    pub pending_approval: usize,
    pub items: Vec<TemplateProviderBindingItem>,
}

// -------------------------------------------------------------------- store

/// Outcome of an idempotent provider initialization command.
///
/// The command creates whatever is missing for one provider (account, sender
/// or signature identity, scenario routing steps) and never overwrites operator
/// edits. Repeating it is safe.
#[derive(Clone, Debug)]
pub struct ProviderInitialization {
    pub account_id: i64,
    pub identity_id: i64,
    pub rules_ensured: usize,
    pub created_account: bool,
}

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

    // send records + dashboard
    async fn list_send_records(
        &self,
        subject: &MessagingAdminSubject,
        channel: &str,
        filter: &SendRecordFilter,
    ) -> Result<MessagingPage<MessagingSendRecordItem>, StoreError>;
    async fn retrieve_send_record(
        &self,
        subject: &MessagingAdminSubject,
        channel: &str,
        record_id: i64,
    ) -> Result<MessagingSendRecordDetail, StoreError>;
    async fn notification_dashboard(
        &self,
        subject: &MessagingAdminSubject,
        range_days: i64,
        now: chrono::DateTime<chrono::Utc>,
    ) -> Result<MessagingDashboardSummary, StoreError>;

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
    /// Ensures the default account, sender identity, and scenario routing steps
    /// exist for one email provider. Missing config keys are merged into an
    /// existing account; existing values and credentials are preserved.
    async fn initialize_email_provider(
        &self,
        subject: &MessagingAdminSubject,
        provider: &str,
    ) -> Result<ProviderInitialization, StoreError>;

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
    /// Ensures the default account, signature identity, and scenario routing
    /// steps exist for one SMS provider. Missing config keys are merged into an
    /// existing account; existing values and credentials are preserved.
    async fn initialize_sms_provider(
        &self,
        subject: &MessagingAdminSubject,
        provider: &str,
    ) -> Result<ProviderInitialization, StoreError>;

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

    /// Provider-specific registrations of one template, ordered by provider
    /// priority so the console renders the default sender first.
    async fn list_template_providers(
        &self,
        subject: &MessagingAdminSubject,
        template_id: i64,
    ) -> Result<Vec<TemplateProviderBindingItem>, StoreError>;

    /// One-click registration of a template with every provider of its channel
    /// (or the requested subset). Never overwrites an operator-entered id unless
    /// `overwrite` is true; returns the complete binding set.
    async fn sync_template_providers(
        &self,
        subject: &MessagingAdminSubject,
        template_id: i64,
        command: &SyncTemplateProvidersCommand,
        idempotency_key: &str,
    ) -> Result<TemplateProviderSyncResult, StoreError>;

    /// Records the provider-side template id / approval state for one binding.
    /// Creates the binding when the provider was not registered yet.
    async fn update_template_provider(
        &self,
        subject: &MessagingAdminSubject,
        template_id: i64,
        provider: &str,
        command: &UpdateTemplateProviderCommand,
        idempotency_key: &str,
    ) -> Result<TemplateProviderBindingItem, StoreError>;

    /// Resolves the active template and its provider-specific external id for a
    /// send. Delivery consumers call this after the routing chain selected a
    /// provider; a missing/unsynchronized binding is a 400, not a silent fallback.
    async fn resolve_template_for_provider(
        &self,
        subject: &MessagingAdminSubject,
        channel: &str,
        template_code: &str,
        provider: &str,
    ) -> Result<(TemplateItem, TemplateProviderBindingItem), StoreError>;
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

/// Outbound message/delivery status vocabulary.
pub fn parse_outbound_status(value: &str) -> Result<&'static str, String> {
    match value {
        "accepted" => Ok("accepted"),
        "queued" => Ok("queued"),
        "sent" => Ok("sent"),
        "delivered" => Ok("delivered"),
        "failed" => Ok("failed"),
        "opened" => Ok("opened"),
        "cancelled" => Ok("cancelled"),
        "expired" => Ok("expired"),
        other => Err(format!(
            "status must be one of: accepted, queued, sent, delivered, failed, opened, cancelled, expired (found `{other}`)"
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
        // Enterprise-mailbox vendors. `enterprise_mail` remains the generic
        // bucket for a vendor that is not listed here.
        "tencent_exmail" => Ok("tencent_exmail"),
        "aliyun_mail" => Ok("aliyun_mail"),
        "netease_qiye" => Ok("netease_qiye"),
        "mail_263" => Ok("mail_263"),
        "coremail" => Ok("coremail"),
        "lark_mail" => Ok("lark_mail"),
        "exchange_online" => Ok("exchange_online"),
        "exchange_cn" => Ok("exchange_cn"),
        "sohu_mail" => Ok("sohu_mail"),
        "huawei_mail" => Ok("huawei_mail"),
        "sina_mail" => Ok("sina_mail"),
        "google_workspace" => Ok("google_workspace"),
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
            "email provider must be one of: smtp, enterprise_mail, tencent_exmail, aliyun_mail, netease_qiye, mail_263, coremail, lark_mail, exchange_online, exchange_cn, sohu_mail, huawei_mail, sina_mail, google_workspace, aliyun, tencent, tencent_mail, mail_139, gmail, microsoft, sendgrid, mailgun, amazon_ses, postmark, resend (found `{other}`)"
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

/// Validates an optional IAM cloud account binding.
///
/// The value identifies a row in the platform account center
/// (`iam_provider_account.id`), which is owned and deployed by the IAM module, so
/// only a syntactic check happens here. An empty/whitespace value means "no
/// binding" and normalizes to `None`, letting an update clear a stale binding.
pub fn parse_provider_account_id(value: Option<&str>) -> Result<Option<String>, String> {
    let Some(raw) = value else {
        return Ok(None);
    };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    let mut chars = trimmed.chars();
    let first = chars.next().unwrap_or_default();
    if !first.is_ascii_alphanumeric() {
        return Err("providerAccountId must start with a letter or digit".to_owned());
    }
    if trimmed.chars().count() > 128 {
        return Err("providerAccountId must be at most 128 characters".to_owned());
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | ':' | '-'))
    {
        return Err(
            "providerAccountId may only contain letters, digits, `_`, `.`, `:` and `-`".to_owned(),
        );
    }
    Ok(Some(trimmed.to_owned()))
}

pub fn parse_notification_priority(value: Option<&str>) -> Result<&'static str, String> {    match value.unwrap_or("normal") {
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

/// Validates that `provider` belongs to the template's channel.
pub fn parse_template_channel_provider(
    channel: &str,
    provider: &str,
) -> Result<&'static str, String> {
    match channel {
        "email" => parse_email_provider(provider),
        "sms" => parse_sms_provider(provider),
        other => Err(format!(
            "channel must be one of: sms, email (found `{other}`)"
        )),
    }
}

pub fn parse_template_provider_sync_status(value: Option<&str>) -> Result<&'static str, String> {
    match value.unwrap_or("pending_approval") {
        "not_synced" => Ok("not_synced"),
        "pending_approval" => Ok("pending_approval"),
        "synced" => Ok("synced"),
        "failed" => Ok("failed"),
        other => Err(format!(
            "syncStatus must be one of: not_synced, pending_approval, synced, failed (found `{other}`)"
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
