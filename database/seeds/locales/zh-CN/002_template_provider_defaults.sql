-- Provider-specific template bindings for the zh-CN seed templates.
--
-- Every seeded template is registered with every provider of its channel. The
-- binding owns the provider-side template id:
--   * email providers render the stored template locally, so the deterministic
--     provider-local reference (`<provider>:<templateCode>`) is recorded and the
--     binding starts synced;
--   * SMS carriers require an approved provider template id, so the binding
--     starts pending and the operator records the real id after approval.
--
-- Idempotent by the (tenant, organization, template, provider) unique key; a
-- re-run never overwrites an operator-entered provider template id.

INSERT INTO messaging_template_provider (
    id, uuid, tenant_id, organization_id, template_id, channel, provider,
    provider_template_id, provider_template_name, sync_status, sync_message,
    last_synced_at, created_at, updated_at
)
SELECT
    950000001000000 + (t.id - 950000000000) * 1000 + p.ordinal,
    'stp-' || t.id::text || '-' || p.provider,
    t.tenant_id,
    t.organization_id,
    t.id,
    t.channel,
    p.provider,
    CASE WHEN p.channel = 'email' THEN p.provider || ':' || t.template_code ELSE NULL END,
    t.name,
    CASE WHEN p.channel = 'email' THEN 'synced' ELSE 'pending_approval' END,
    CASE WHEN p.channel = 'email' THEN NULL ELSE 'provider_template_id_required' END,
    CASE WHEN p.channel = 'email' THEN CURRENT_TIMESTAMP ELSE NULL END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM messaging_template t
JOIN (VALUES
    (0, 'email', 'smtp'),
    (1, 'email', 'enterprise_mail'),
    (2, 'email', 'aliyun'),
    (3, 'email', 'tencent'),
    (4, 'email', 'tencent_mail'),
    (5, 'email', 'mail_139'),
    (6, 'email', 'gmail'),
    (7, 'email', 'microsoft'),
    (8, 'email', 'sendgrid'),
    (9, 'email', 'mailgun'),
    (10, 'email', 'amazon_ses'),
    (11, 'email', 'postmark'),
    (12, 'email', 'resend'),
    (0, 'sms', 'tencent'),
    (1, 'sms', 'aliyun'),
    (2, 'sms', 'huawei'),
    (3, 'sms', 'yuntongxun'),
    (4, 'sms', 'submail'),
    (5, 'sms', 'chuanglan'),
    (6, 'sms', 'twilio'),
    (7, 'sms', 'generic_http')
) AS p(ordinal, channel, provider) ON p.channel = t.channel
WHERE t.tenant_id = 100001 AND t.organization_id = 0 AND t.uuid LIKE 'seed-tpl-zh-%' AND t.deleted_at IS NULL
ON CONFLICT DO NOTHING;
