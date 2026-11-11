-- Default message templates for the canonical installation tenant
-- (100001) / organization (0), en-US locale set.
--
-- Message templates are locale-specific initialization data
-- (DATABASE_FRAMEWORK_SPEC §8.2). An installation seeded with en-US starts with
-- ready-to-edit English templates for the same template codes as the zh-CN
-- set, so operator runbooks and template codes stay identical across locales.
--
-- Contract rules honored here:
--   * DATABASE_SPEC §6.4 — reserved, deterministic ids in the dedicated
--     `9500000xxxxx` block and stable uuids.
--   * DATABASE_FRAMEWORK_SPEC §8.2 — this file contains one locale only.
--   * DATABASE_FRAMEWORK_SPEC §8.3 — `ON CONFLICT DO NOTHING` keeps re-seeds
--     idempotent and never overwrites operator edits. Because template codes
--     are unique per channel, seeding zh-CN first makes this file a no-op.
--   * Email templates start `active`; SMS templates start `draft` with
--     `pending` provider approval because carriers require an approved
--     signature/template before delivery.
--
-- Reserved id blocks:
--   950000000711..950000000720  en-US email templates
--   950000000811..950000000820  en-US SMS templates

INSERT INTO messaging_template (
    id, uuid, tenant_id, organization_id, channel, template_code, name, subject,
    content, variables_json, approval_status, approval_note, status,
    created_at, updated_at
)
VALUES
    (
        950000000711, 'seed-tpl-en-email-verification-code', 100001, 0,
        'email', 'verification_code', 'Login verification code',
        'Your {{appName}} verification code is {{code}}',
        '<p>Hello,</p><p>Your verification code is <strong style="font-size:18px;letter-spacing:2px">{{code}}</strong>. It expires in {{ttlMinutes}} minutes.</p><p>Never share this code. If you did not request it, you can ignore this email.</p>',
        '["appName","code","ttlMinutes"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000712, 'seed-tpl-en-email-password-reset', 100001, 0,
        'email', 'password_reset', 'Password reset',
        'Reset your {{appName}} password',
        '<p>Hello,</p><p>We received a request to reset your password. Your code is <strong>{{code}}</strong> and expires in {{ttlMinutes}} minutes.</p><p>If you did not request this, change your password immediately and contact your administrator.</p>',
        '["appName","code","ttlMinutes"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000713, 'seed-tpl-en-email-register-welcome', 100001, 0,
        'email', 'register_welcome', 'Welcome email',
        'Welcome to {{appName}}',
        '<p>Hi {{userName}},</p><p>Welcome to {{appName}}. Your account is ready. Sign in to the console to get started.</p><p><a href="{{loginUrl}}">Sign in now</a></p><p>Need help? Reply to this email or contact our success team.</p>',
        '["appName","userName","loginUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000714, 'seed-tpl-en-email-order-paid', 100001, 0,
        'email', 'order_paid', 'Order payment receipt',
        'Payment received for order {{orderId}}',
        '<p>Hi {{userName}},</p><p>Your order {{orderId}} was paid successfully on {{paidAt}} for {{amount}}.</p><p>You can view the order and invoice in the console under Orders.</p><p>Thank you for your business.</p>',
        '["userName","orderId","amount","paidAt"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000715, 'seed-tpl-en-email-payment-failed', 100001, 0,
        'email', 'payment_failed', 'Payment failed',
        '{{appName}}: payment failed for order {{orderId}}',
        '<p>Hi {{userName}},</p><p>We could not process the payment for order {{orderId}} ({{amount}}). The payment provider may have timed out or the balance may be insufficient.</p><p><a href="{{retryUrl}}">Retry payment</a>. If the problem persists, contact support.</p>',
        '["appName","userName","orderId","amount","retryUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000716, 'seed-tpl-en-email-subscription-expiring', 100001, 0,
        'email', 'subscription_expiring', 'Subscription expiring',
        'Your {{planName}} subscription expires on {{expireDate}}',
        '<p>Hi {{userName}},</p><p>Your {{planName}} subscription expires on {{expireDate}} ({{daysLeft}} days left). Renew now to avoid service interruption.</p><p><a href="{{renewUrl}}">Renew subscription</a></p>',
        '["userName","planName","expireDate","daysLeft","renewUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000717, 'seed-tpl-en-email-quota-warning', 100001, 0,
        'email', 'quota_warning', 'Quota usage warning',
        '{{quotaName}} usage reached {{usagePercent}}%',
        '<p>Hi {{userName}},</p><p>Your {{appName}} {{quotaName}} usage has reached {{usagePercent}}% with {{remaining}} remaining. Adjust your plan or top up to avoid interruptions.</p><p><a href="{{consoleUrl}}">Open console</a></p>',
        '["appName","userName","quotaName","usagePercent","remaining","consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000718, 'seed-tpl-en-email-security-alert', 100001, 0,
        'email', 'security_alert', 'New sign-in alert',
        'New sign-in to your {{appName}} account',
        '<p>Hi {{userName}},</p><p>Your account signed in on {{loginAt}} from {{location}} using {{device}}.</p><p>If this was not you, change your password immediately and contact your administrator.</p>',
        '["appName","userName","loginAt","location","device"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000719, 'seed-tpl-en-email-invoice-ready', 100001, 0,
        'email', 'invoice_ready', 'Invoice ready',
        'Your {{period}} invoice is ready',
        '<p>Hi {{userName}},</p><p>Your {{appName}} invoice for {{period}} is ready. Amount due: {{amount}}, due by {{dueDate}}.</p><p><a href="{{invoiceUrl}}">View invoice</a></p>',
        '["appName","userName","period","amount","dueDate","invoiceUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000720, 'seed-tpl-en-email-marketing-campaign', 100001, 0,
        'email', 'marketing_campaign', 'Marketing campaign',
        '{{campaignTitle}}',
        '<p>Hi {{userName}},</p><p>{{campaignBody}}</p><p><a href="{{ctaUrl}}">{{ctaLabel}}</a></p><p>If you no longer want these emails, <a href="{{unsubscribeUrl}}">unsubscribe</a>.</p>',
        '["userName","campaignTitle","campaignBody","ctaUrl","ctaLabel","unsubscribeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000811, 'seed-tpl-en-sms-verification-code', 100001, 0,
        'sms', 'verification_code', 'Verification code SMS',
        NULL,
        'Your verification code is {{code}}. It expires in {{ttlMinutes}} minutes. Do not share it.',
        '["code","ttlMinutes"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000812, 'seed-tpl-en-sms-password-reset', 100001, 0,
        'sms', 'password_reset', 'Password reset SMS',
        NULL,
        'Your password reset code is {{code}}. It expires in {{ttlMinutes}} minutes.',
        '["code","ttlMinutes"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000813, 'seed-tpl-en-sms-register-welcome', 100001, 0,
        'sms', 'register_welcome', 'Welcome SMS',
        NULL,
        'Welcome to {{appName}}! Your account is ready. Contact support if you need help.',
        '["appName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000814, 'seed-tpl-en-sms-order-paid', 100001, 0,
        'sms', 'order_paid', 'Order paid SMS',
        NULL,
        'Order {{orderId}} was paid successfully for {{amount}}. Thank you for your business.',
        '["orderId","amount"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000815, 'seed-tpl-en-sms-payment-failed', 100001, 0,
        'sms', 'payment_failed', 'Payment failed SMS',
        NULL,
        'Payment for order {{orderId}} failed. Please retry from the console.',
        '["orderId"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000816, 'seed-tpl-en-sms-subscription-expiring', 100001, 0,
        'sms', 'subscription_expiring', 'Subscription expiring SMS',
        NULL,
        'Your {{planName}} subscription expires on {{expireDate}}. Renew to avoid interruption.',
        '["planName","expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000817, 'seed-tpl-en-sms-quota-warning', 100001, 0,
        'sms', 'quota_warning', 'Quota warning SMS',
        NULL,
        '{{quotaName}} usage reached {{usagePercent}}%. Adjust your plan or top up now.',
        '["quotaName","usagePercent"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000818, 'seed-tpl-en-sms-security-alert', 100001, 0,
        'sms', 'security_alert', 'Security alert SMS',
        NULL,
        'New sign-in at {{loginAt}} from {{location}}. If this was not you, change your password now.',
        '["loginAt","location"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000819, 'seed-tpl-en-sms-invoice-ready', 100001, 0,
        'sms', 'invoice_ready', 'Invoice ready SMS',
        NULL,
        'Your {{period}} invoice is ready for {{amount}}. Pay by {{dueDate}} in the console.',
        '["period","amount","dueDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000820, 'seed-tpl-en-sms-marketing-campaign', 100001, 0,
        'sms', 'marketing_campaign', 'Marketing campaign SMS',
        NULL,
        '{{campaignTitle}}: {{ctaUrl}} Reply STOP to unsubscribe.',
        '["campaignTitle","ctaUrl"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
