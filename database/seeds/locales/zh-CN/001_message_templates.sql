-- Default message templates for the canonical installation tenant
-- (100001) / organization (0), zh-CN locale set.
--
-- Message templates are locale-specific initialization data
-- (DATABASE_FRAMEWORK_SPEC §8.2: "default templates" belong to
-- `seeds/locales/{locale}/`). The default seed profile selects zh-CN, so a new
-- cluster starts with ready-to-edit Chinese templates for the most common
-- verification, billing and lifecycle scenarios instead of an empty list.
--
-- Contract rules honored here:
--   * DATABASE_SPEC §6.4 — reserved, deterministic ids in the dedicated
--     `9500000xxxxx` block and stable uuids, so retries and upgrades stay
--     idempotent.
--   * DATABASE_FRAMEWORK_SPEC §8.2 — no file mixes locales; en-US has a
--     sibling file with the same template codes.
--   * DATABASE_FRAMEWORK_SPEC §8.3 — `ON CONFLICT DO NOTHING` makes the seed
--     safe to re-run and guarantees operator edits are never overwritten.
--   * Email templates are provider-agnostic and start `active`; SMS templates
--     start `draft` with `pending` provider approval because carriers require
--     an approved signature/template before delivery.
--
-- After installation the operator only adjusts branding placeholders
-- ({{appName}}, URLs) and activates the SMS templates once the provider
-- approves them.
--
-- Reserved id blocks:
--   950000000701..950000000710  zh-CN email templates
--   950000000801..950000000810  zh-CN SMS templates
-- (the en-US file owns 950000000711..720 and 950000000811..820)

INSERT INTO messaging_template (
    id, uuid, tenant_id, organization_id, channel, template_code, name, subject,
    content, variables_json, approval_status, approval_note, status,
    created_at, updated_at
)
VALUES
    (
        950000000701, 'seed-tpl-zh-email-verification-code', 100001, 0,
        'email', 'verification_code', '登录验证码通知',
        '【{{appName}}】您的验证码为 {{code}}',
        '<p>您好，</p><p>您正在进行身份验证，验证码为 <strong style="font-size:18px;letter-spacing:2px">{{code}}</strong>，{{ttlMinutes}} 分钟内有效。</p><p>请勿向任何人透露此验证码。如非本人操作，请忽略本邮件。</p>',
        '["appName","code","ttlMinutes"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000702, 'seed-tpl-zh-email-password-reset', 100001, 0,
        'email', 'password_reset', '重置密码验证',
        '【{{appName}}】重置密码验证码',
        '<p>您好，</p><p>我们收到了重置密码的请求，验证码为 <strong>{{code}}</strong>，{{ttlMinutes}} 分钟内有效。</p><p>如非本人操作，请立即修改账户密码并联系管理员。</p>',
        '["appName","code","ttlMinutes"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000703, 'seed-tpl-zh-email-register-welcome', 100001, 0,
        'email', 'register_welcome', '注册欢迎',
        '欢迎加入 {{appName}}',
        '<p>你好 {{userName}}，</p><p>欢迎加入 {{appName}}！你的账户已创建成功，现在可以登录控制台开始使用。</p><p><a href="{{loginUrl}}">立即登录</a></p><p>如需帮助，请回复本邮件或联系客户成功团队。</p>',
        '["appName","userName","loginUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000704, 'seed-tpl-zh-email-order-paid', 100001, 0,
        'email', 'order_paid', '订单支付成功',
        '订单 {{orderId}} 支付成功',
        '<p>你好 {{userName}}，</p><p>你的订单 {{orderId}} 已于 {{paidAt}} 支付成功，金额 {{amount}}。</p><p>你可以在控制台「订单中心」查看订单详情与发票信息。</p><p>感谢你的支持！</p>',
        '["userName","orderId","amount","paidAt"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000705, 'seed-tpl-zh-email-payment-failed', 100001, 0,
        'email', 'payment_failed', '支付失败提醒',
        '【{{appName}}】订单 {{orderId}} 支付失败',
        '<p>你好 {{userName}}，</p><p>订单 {{orderId}} 的支付未能成功（金额 {{amount}}）。可能是支付渠道超时或余额不足。</p><p>请<a href="{{retryUrl}}">重新支付</a>，如持续失败请联系客户支持。</p>',
        '["appName","userName","orderId","amount","retryUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000706, 'seed-tpl-zh-email-subscription-expiring', 100001, 0,
        'email', 'subscription_expiring', '订阅即将到期',
        '你的 {{planName}} 订阅将于 {{expireDate}} 到期',
        '<p>你好 {{userName}}，</p><p>你的 {{planName}} 订阅将于 {{expireDate}} 到期（剩余 {{daysLeft}} 天）。为避免服务中断，请及时续费。</p><p><a href="{{renewUrl}}">立即续费</a></p>',
        '["userName","planName","expireDate","daysLeft","renewUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000707, 'seed-tpl-zh-email-quota-warning', 100001, 0,
        'email', 'quota_warning', '配额使用预警',
        '【{{appName}}】{{quotaName}} 使用率已达 {{usagePercent}}%',
        '<p>你好 {{userName}}，</p><p>你的 {{quotaName}} 已使用 {{usagePercent}}%，剩余 {{remaining}}。为避免调用中断，请及时调整套餐或充值。</p><p><a href="{{consoleUrl}}">前往控制台</a></p>',
        '["appName","userName","quotaName","usagePercent","remaining","consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000708, 'seed-tpl-zh-email-security-alert', 100001, 0,
        'email', 'security_alert', '异常登录提醒',
        '【{{appName}}】检测到新的登录',
        '<p>你好 {{userName}}，</p><p>你的账户于 {{loginAt}} 在 {{location}} 通过 {{device}} 登录。</p><p>如非本人操作，请立即修改密码并联系管理员。</p>',
        '["appName","userName","loginAt","location","device"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000709, 'seed-tpl-zh-email-invoice-ready', 100001, 0,
        'email', 'invoice_ready', '账单已生成',
        '【{{appName}}】{{period}} 账单已生成',
        '<p>你好 {{userName}}，</p><p>你 {{period}} 的账单已生成，应付金额 {{amount}}，请于 {{dueDate}} 前完成支付。</p><p><a href="{{invoiceUrl}}">查看账单</a></p>',
        '["appName","userName","period","amount","dueDate","invoiceUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000710, 'seed-tpl-zh-email-marketing-campaign', 100001, 0,
        'email', 'marketing_campaign', '营销活动通知',
        '{{campaignTitle}}',
        '<p>你好 {{userName}}，</p><p>{{campaignBody}}</p><p><a href="{{ctaUrl}}">{{ctaLabel}}</a></p><p>如不想再收到此类邮件，可<a href="{{unsubscribeUrl}}">退订</a>。</p>',
        '["userName","campaignTitle","campaignBody","ctaUrl","ctaLabel","unsubscribeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000801, 'seed-tpl-zh-sms-verification-code', 100001, 0,
        'sms', 'verification_code', '验证码短信',
        NULL,
        '您的验证码为 {{code}}，{{ttlMinutes}} 分钟内有效，请勿泄露给他人。',
        '["code","ttlMinutes"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000802, 'seed-tpl-zh-sms-password-reset', 100001, 0,
        'sms', 'password_reset', '重置密码短信',
        NULL,
        '您正在重置密码，验证码 {{code}}，{{ttlMinutes}} 分钟内有效。如非本人操作请立即改密。',
        '["code","ttlMinutes"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000803, 'seed-tpl-zh-sms-register-welcome', 100001, 0,
        'sms', 'register_welcome', '注册欢迎短信',
        NULL,
        '欢迎加入 {{appName}}，账户已开通。如需帮助请联系客服。',
        '["appName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000804, 'seed-tpl-zh-sms-order-paid', 100001, 0,
        'sms', 'order_paid', '订单支付成功短信',
        NULL,
        '订单 {{orderId}} 支付成功，金额 {{amount}}。感谢您的支持。',
        '["orderId","amount"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000805, 'seed-tpl-zh-sms-payment-failed', 100001, 0,
        'sms', 'payment_failed', '支付失败短信',
        NULL,
        '订单 {{orderId}} 支付失败，请前往控制台重新支付。',
        '["orderId"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000806, 'seed-tpl-zh-sms-subscription-expiring', 100001, 0,
        'sms', 'subscription_expiring', '订阅到期短信',
        NULL,
        '{{planName}} 将于 {{expireDate}} 到期，为避免服务中断请及时续费。',
        '["planName","expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000807, 'seed-tpl-zh-sms-quota-warning', 100001, 0,
        'sms', 'quota_warning', '配额预警短信',
        NULL,
        '{{quotaName}} 使用率已达 {{usagePercent}}%，请及时调整套餐或充值。',
        '["quotaName","usagePercent"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000808, 'seed-tpl-zh-sms-security-alert', 100001, 0,
        'sms', 'security_alert', '安全提醒短信',
        NULL,
        '检测到 {{loginAt}} 在 {{location}} 登录。如非本人操作，请立即修改密码。',
        '["loginAt","location"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000809, 'seed-tpl-zh-sms-invoice-ready', 100001, 0,
        'sms', 'invoice_ready', '账单生成短信',
        NULL,
        '{{period}} 账单已生成，金额 {{amount}}，请于 {{dueDate}} 前完成支付。',
        '["period","amount","dueDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000810, 'seed-tpl-zh-sms-marketing-campaign', 100001, 0,
        'sms', 'marketing_campaign', '营销活动短信',
        NULL,
        '{{campaignTitle}}：{{ctaUrl}} 回T退订。',
        '["campaignTitle","ctaUrl"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
