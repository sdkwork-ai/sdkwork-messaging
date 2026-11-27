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
-- EMAIL catalog scope (commercialization-ready): every standard transactional
-- email a system is expected to ship out of the box, grouped by journey:
--   * account & security — login/registration codes, forgot-password request
--     and reset confirmation, password-changed notice, welcome, email
--     verification, phone bound, new sign-in alert, account frozen/restored;
--   * orders & billing — created/paid/failed/shipped/completed/cancelled/
--     refunded, top-up success, low balance, arrears, invoice ready/overdue;
--   * subscription & membership — activated/expiring/expired/renewed/
--     cancelled, membership expiring;
--   * usage & quota — warning, exhausted;
--   * platform — maintenance, release notice, ticket reply;
--   * partner — application approved, commission settled;
--   * marketing — campaign and limited-time promotion with unsubscribe link.
-- Bodies are self-contained responsive HTML with inline styles and a shared
-- visual shell, so a re-brand is a copy edit rather than a design task.
--
-- SMS catalog scope: the same business areas at message-brief length, so the
-- multi-channel journey stays consistent (see the SMS block below).
--
-- Reserved id blocks:
--   950000000701..950000000738  zh-CN email templates
--   950000000801..950000000861  zh-CN SMS templates
-- (the en-US file owns 950000000971..950000001008 and 950000000901..950000000961
--  and keeps the same `template_code` order as this file)

INSERT INTO messaging_template (
    id, uuid, tenant_id, organization_id, channel, template_code, name, subject,
    content, variables_json, approval_status, approval_note, status,
    created_at, updated_at
)
VALUES
    (
        950000000701, 'seed-tpl-zh-email-verification-code', 100001, 0,
        'email', 'verification_code', '登录验证码通知',
        '【{{appName}}】您的登录验证码为 {{code}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">登录验证</h2><p>您好，</p><p>您正在登录 <strong>{{appName}}</strong>，本次登录验证码为：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>验证码 {{ttlMinutes}} 分钟内有效。请勿向任何人透露此验证码，工作人员不会向您索取。</p><p>如非本人操作，请忽略本邮件并尽快修改密码。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "code", "ttlMinutes"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000702, 'seed-tpl-zh-email-register-verification-code', 100001, 0,
        'email', 'register_verification_code', '注册验证码通知',
        '【{{appName}}】完成注册的验证码',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">完成注册</h2><p>您好，</p><p>感谢您注册 <strong>{{appName}}</strong>。请使用以下验证码完成注册：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>验证码 {{ttlMinutes}} 分钟内有效。如非本人操作，请忽略本邮件。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "code", "ttlMinutes"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000703, 'seed-tpl-zh-email-password-reset', 100001, 0,
        'email', 'password_reset', '忘记密码验证',
        '【{{appName}}】重置密码验证码',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">重置密码</h2><p>您好，</p><p>我们收到了重置 <strong>{{appName}}</strong> 账户密码的请求。请在重置页面输入以下验证码：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>验证码 {{ttlMinutes}} 分钟内有效。</p><p>如非本人操作，请忽略本邮件，您的密码不会被修改。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "code", "ttlMinutes"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000704, 'seed-tpl-zh-email-password-reset-success', 100001, 0,
        'email', 'password_reset_success', '密码重置成功通知',
        '【{{appName}}】您的密码已重置成功',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">密码已重置</h2><p>你好 {{userName}}，</p><p>你的账户密码已于 {{resetTime}} 重置成功，现在可以使用新密码登录。</p><p>如果这不是你本人的操作，请立即<a href="{{securityUrl}}">修改密码</a>并联系客服。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "resetTime", "securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000705, 'seed-tpl-zh-email-password-changed', 100001, 0,
        'email', 'password_changed', '密码修改成功通知',
        '【{{appName}}】您的密码已修改',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">密码已修改</h2><p>你好 {{userName}}，</p><p>你的账户密码已于 {{changeTime}} 修改成功。</p><p>如果这不是你本人的操作，请立即<a href="{{securityUrl}}">冻结账户</a>并联系客服。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "changeTime", "securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000706, 'seed-tpl-zh-email-register-welcome', 100001, 0,
        'email', 'register_welcome', '注册成功通知',
        '欢迎加入 {{appName}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">账户已创建</h2><p>你好 {{userName}}，</p><p>欢迎加入 <strong>{{appName}}</strong>！你的账户已创建成功，现在即可登录控制台开始使用。</p><p style="margin:24px 0"><a href="{{loginUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">立即登录</a></p><p>如需帮助，请回复本邮件或联系客户成功团队。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "loginUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000707, 'seed-tpl-zh-email-email-verify', 100001, 0,
        'email', 'email_verify', '邮箱验证通知',
        '【{{appName}}】请验证您的邮箱地址',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">验证邮箱</h2><p>你好 {{userName}}，</p><p>请点击下方按钮完成邮箱验证，以启用账户的完整功能。</p><p style="margin:24px 0"><a href="{{verifyUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">验证邮箱</a></p><p>链接 {{ttlMinutes}} 分钟内有效。如非本人操作，请忽略本邮件。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "verifyUrl", "ttlMinutes"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000708, 'seed-tpl-zh-email-phone-bound', 100001, 0,
        'email', 'phone_bound', '手机号绑定成功通知',
        '【{{appName}}】手机号绑定成功',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">手机号已绑定</h2><p>你好 {{userName}}，</p><p>你的账户已成功绑定手机号 {{phone}}，后续可用于登录与安全验证。</p><p>如非本人操作，请立即联系客服。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "phone"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000709, 'seed-tpl-zh-email-security-alert', 100001, 0,
        'email', 'security_alert', '异常登录提醒',
        '【{{appName}}】检测到新的登录',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">新的登录</h2><p>你好 {{userName}}，</p><p>你的账户于 {{loginAt}} 在 {{location}} 通过 {{device}} 登录。</p><p>如非本人操作，请立即<a href="{{securityUrl}}">修改密码</a>并联系客服。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "loginAt", "location", "device", "securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000710, 'seed-tpl-zh-email-account-frozen', 100001, 0,
        'email', 'account_frozen', '账户冻结通知',
        '【{{appName}}】您的账户已被冻结',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">账户已冻结</h2><p>你好 {{userName}}，</p><p>你的账户因 {{reason}} 已被暂停使用。</p><p>如需申诉或恢复账户，请<a href="{{supportUrl}}">联系客服</a>。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "reason", "supportUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000711, 'seed-tpl-zh-email-account-unfrozen', 100001, 0,
        'email', 'account_unfrozen', '账户恢复通知',
        '【{{appName}}】您的账户已恢复正常',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">账户已恢复</h2><p>你好 {{userName}}，</p><p>你的账户已恢复正常使用，感谢你的配合。</p><p style="margin:24px 0"><a href="{{loginUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">前往登录</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "loginUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000712, 'seed-tpl-zh-email-order-created', 100001, 0,
        'email', 'order_created', '订单创建通知',
        '【{{appName}}】订单 {{orderId}} 已创建',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">订单已创建</h2><p>你好 {{userName}}，</p><p>你的订单 {{orderId}} 已创建，应付金额 {{amount}}。</p><p>请在有效期内完成支付，逾期订单将自动关闭。</p><p style="margin:24px 0"><a href="{{payUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">立即支付</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "orderId", "userName", "amount", "payUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000713, 'seed-tpl-zh-email-order-paid', 100001, 0,
        'email', 'order_paid', '订单支付成功通知',
        '订单 {{orderId}} 支付成功',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">支付成功</h2><p>你好 {{userName}}，</p><p>你的订单 {{orderId}} 已于 {{paidAt}} 支付成功，金额 {{amount}}。</p><p>你可以在控制台「订单中心」查看订单详情与发票信息。</p><p style="margin:24px 0"><a href="{{orderUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看订单</a></p><p>感谢你的支持！</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["orderId", "userName", "paidAt", "amount", "orderUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000714, 'seed-tpl-zh-email-payment-failed', 100001, 0,
        'email', 'payment_failed', '支付失败提醒',
        '【{{appName}}】订单 {{orderId}} 支付失败',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">支付失败</h2><p>你好 {{userName}}，</p><p>订单 {{orderId}} 的支付未能成功（金额 {{amount}}）。可能是支付渠道超时或余额不足。</p><p>请重新支付，如持续失败请联系客户支持。</p><p style="margin:24px 0"><a href="{{retryUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">重新支付</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "orderId", "userName", "amount", "retryUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000715, 'seed-tpl-zh-email-order-shipped', 100001, 0,
        'email', 'order_shipped', '订单发货通知',
        '【{{appName}}】订单 {{orderId}} 已发货',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">订单已发货</h2><p>你好 {{userName}}，</p><p>你的订单 {{orderId}} 已发货，物流单号 {{trackingNo}}，请注意查收。</p><p style="margin:24px 0"><a href="{{trackUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看物流</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "orderId", "userName", "trackingNo", "trackUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000716, 'seed-tpl-zh-email-order-completed', 100001, 0,
        'email', 'order_completed', '订单完成通知',
        '【{{appName}}】订单 {{orderId}} 已完成',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">订单已完成</h2><p>你好 {{userName}}，</p><p>你的订单 {{orderId}} 已完成，期待再次为你服务。</p><p style="margin:24px 0"><a href="{{orderUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">再次购买</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "orderId", "userName", "orderUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000717, 'seed-tpl-zh-email-order-cancelled', 100001, 0,
        'email', 'order_cancelled', '订单取消通知',
        '【{{appName}}】订单 {{orderId}} 已取消',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">订单已取消</h2><p>你好 {{userName}}，</p><p>你的订单 {{orderId}} 已取消。如已支付，款项将原路退回。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "orderId", "userName"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000718, 'seed-tpl-zh-email-order-refunded', 100001, 0,
        'email', 'order_refunded', '退款到账通知',
        '【{{appName}}】订单 {{orderId}} 已退款 {{amount}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">退款已处理</h2><p>你好 {{userName}}，</p><p>你的订单 {{orderId}} 已退款 {{amount}}，款项将原路退回到你的支付账户，通常 1-7 个工作日到账。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "orderId", "amount", "userName"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000719, 'seed-tpl-zh-email-recharge-success', 100001, 0,
        'email', 'recharge_success', '充值成功通知',
        '【{{appName}}】充值成功',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">充值成功</h2><p>你好 {{userName}}，</p><p>你的账户已成功充值 {{amount}}，当前余额 {{balance}}。</p><p style="margin:24px 0"><a href="{{walletUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看余额</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "amount", "balance", "walletUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000720, 'seed-tpl-zh-email-balance-low', 100001, 0,
        'email', 'balance_low', '余额不足提醒',
        '【{{appName}}】账户余额不足',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">余额不足</h2><p>你好 {{userName}}，</p><p>你的账户余额仅剩 {{balance}}，为不影响正常使用，请及时充值。</p><p style="margin:24px 0"><a href="{{rechargeUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">立即充值</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "balance", "rechargeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000721, 'seed-tpl-zh-email-arrears-notice', 100001, 0,
        'email', 'arrears_notice', '欠费提醒',
        '【{{appName}}】账户欠费提醒',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">欠费提醒</h2><p>你好 {{userName}}，</p><p>你的账户已欠费 {{amount}}，请于 {{dueDate}} 前完成补缴，否则相关服务将被暂停。</p><p style="margin:24px 0"><a href="{{rechargeUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">立即补缴</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "amount", "dueDate", "rechargeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000722, 'seed-tpl-zh-email-invoice-ready', 100001, 0,
        'email', 'invoice_ready', '账单已生成',
        '【{{appName}}】{{period}} 账单已生成',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">账单已生成</h2><p>你好 {{userName}}，</p><p>你 {{period}} 的账单已生成，应付金额 {{amount}}，请于 {{dueDate}} 前完成支付。</p><p style="margin:24px 0"><a href="{{invoiceUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看账单</a></p><p>如需开具发票，可在控制台「财务中心」提交申请。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "period", "userName", "amount", "dueDate", "invoiceUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000723, 'seed-tpl-zh-email-invoice-overdue', 100001, 0,
        'email', 'invoice_overdue', '账单逾期提醒',
        '【{{appName}}】账单已逾期',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">账单逾期</h2><p>你好 {{userName}}，</p><p>你 {{period}} 的账单已逾期 {{overdueDays}} 天，金额 {{amount}}。请尽快完成支付以免影响服务。</p><p style="margin:24px 0"><a href="{{invoiceUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">立即支付</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "period", "overdueDays", "amount", "invoiceUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000724, 'seed-tpl-zh-email-subscription-activated', 100001, 0,
        'email', 'subscription_activated', '订阅开通成功通知',
        '【{{appName}}】{{planName}} 订阅已开通',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">订阅已开通</h2><p>你好 {{userName}}，</p><p>你的 {{planName}} 订阅已开通成功，有效期至 {{expireDate}}，立即生效。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">前往控制台</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "planName", "userName", "expireDate", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000725, 'seed-tpl-zh-email-subscription-expiring', 100001, 0,
        'email', 'subscription_expiring', '订阅即将到期',
        '你的 {{planName}} 订阅将于 {{expireDate}} 到期',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">订阅即将到期</h2><p>你好 {{userName}}，</p><p>你的 {{planName}} 订阅将于 {{expireDate}} 到期（剩余 {{daysLeft}} 天）。为避免服务中断，请及时续费。</p><p style="margin:24px 0"><a href="{{renewUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">立即续费</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["planName", "expireDate", "userName", "daysLeft", "renewUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000726, 'seed-tpl-zh-email-subscription-expired', 100001, 0,
        'email', 'subscription_expired', '订阅已到期通知',
        '【{{appName}}】{{planName}} 订阅已到期',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">订阅已到期</h2><p>你好 {{userName}}，</p><p>你的 {{planName}} 订阅已于 {{expireDate}} 到期，服务已降级。续费后立即恢复完整功能。</p><p style="margin:24px 0"><a href="{{renewUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">续费恢复</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "planName", "userName", "expireDate", "renewUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000727, 'seed-tpl-zh-email-subscription-renewed', 100001, 0,
        'email', 'subscription_renewed', '订阅续费成功通知',
        '【{{appName}}】{{planName}} 续费成功',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">续费成功</h2><p>你好 {{userName}}，</p><p>你的 {{planName}} 订阅已成功续费，新的有效期至 {{expireDate}}。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看订阅</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "planName", "userName", "expireDate", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000728, 'seed-tpl-zh-email-subscription-cancelled', 100001, 0,
        'email', 'subscription_cancelled', '订阅取消通知',
        '【{{appName}}】订阅已取消',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">订阅已取消</h2><p>你好 {{userName}}，</p><p>你的 {{planName}} 订阅已取消，服务将保持有效至 {{expireDate}}。到期后不会自动续费。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "planName", "expireDate"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000729, 'seed-tpl-zh-email-membership-expiring', 100001, 0,
        'email', 'membership_expiring', '会员到期提醒',
        '【{{appName}}】会员即将到期',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">会员即将到期</h2><p>你好 {{userName}}，</p><p>你的会员将于 {{expireDate}} 到期，续费可继续享受专属权益与折扣。</p><p style="margin:24px 0"><a href="{{renewUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">立即续费</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "expireDate", "renewUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000730, 'seed-tpl-zh-email-quota-warning', 100001, 0,
        'email', 'quota_warning', '配额使用预警',
        '【{{appName}}】{{quotaName}} 使用率已达 {{usagePercent}}%',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">配额使用预警</h2><p>你好 {{userName}}，</p><p>你的 {{quotaName}} 已使用 {{usagePercent}}%，剩余 {{remaining}}。为避免调用中断，请及时升级套餐或充值。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">前往控制台</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "quotaName", "usagePercent", "userName", "remaining", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000731, 'seed-tpl-zh-email-quota-exhausted', 100001, 0,
        'email', 'quota_exhausted', '配额已用尽通知',
        '【{{appName}}】{{quotaName}} 配额已用尽',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">配额已用尽</h2><p>你好 {{userName}}，</p><p>你的 {{quotaName}} 配额已用尽，相关调用已被限制。请立即扩容或充值以恢复服务。</p><p style="margin:24px 0"><a href="{{upgradeUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">升级套餐</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "quotaName", "userName", "upgradeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000732, 'seed-tpl-zh-email-maintenance-notice', 100001, 0,
        'email', 'maintenance_notice', '系统维护通知',
        '【{{appName}}】系统维护通知',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">系统维护通知</h2><p>你好 {{userName}}，</p><p>{{appName}} 将于 {{startTime}} 进行系统维护，预计耗时 {{duration}}，期间部分功能可能不可用。</p><p>给你带来的不便，敬请谅解。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "startTime", "duration"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000733, 'seed-tpl-zh-email-release-notice', 100001, 0,
        'email', 'release_notice', '版本发布通知',
        '【{{appName}}】新版本 {{version}} 已发布',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">新版本发布</h2><p>你好 {{userName}}，</p><p>{{appName}} 新版本 {{version}} 已发布，本次更新包含功能优化与问题修复。</p><p style="margin:24px 0"><a href="{{releaseUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看更新内容</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "version", "userName", "releaseUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000734, 'seed-tpl-zh-email-ticket-replied', 100001, 0,
        'email', 'ticket_replied', '工单回复提醒',
        '【{{appName}}】工单 {{ticketNo}} 有新回复',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">工单有新回复</h2><p>你好 {{userName}}，</p><p>你的工单 {{ticketNo}} 有新的回复，请及时查看。</p><p style="margin:24px 0"><a href="{{ticketUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看工单</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "ticketNo", "userName", "ticketUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000735, 'seed-tpl-zh-email-partner-approved', 100001, 0,
        'email', 'partner_approved', '合作伙伴审核通过通知',
        '【{{appName}}】合作伙伴申请已通过',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">申请已通过</h2><p>你好 {{userName}}，</p><p>恭喜你，合作伙伴申请已通过审核！现在可以登录伙伴中心查看推广链接与佣金规则。</p><p style="margin:24px 0"><a href="{{partnerUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">进入伙伴中心</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "partnerUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000736, 'seed-tpl-zh-email-partner-commission-settled', 100001, 0,
        'email', 'partner_commission_settled', '佣金结算通知',
        '【{{appName}}】佣金 {{amount}} 已结算',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">佣金已结算</h2><p>你好 {{userName}}，</p><p>你的佣金 {{amount}} 已结算至账户余额，可在伙伴中心查看明细。</p><p style="margin:24px 0"><a href="{{partnerUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看明细</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "amount", "userName", "partnerUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000737, 'seed-tpl-zh-email-marketing-campaign', 100001, 0,
        'email', 'marketing_campaign', '营销活动通知',
        '{{campaignTitle}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">{{campaignTitle}}</h2><p>你好 {{userName}}，</p><p>{{campaignBody}}</p><p style="margin:24px 0"><a href="{{ctaUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">{{ctaLabel}}</a></p><p style="font-size:12px;color:#64748b">如不想再收到此类邮件，可<a href="{{unsubscribeUrl}}">退订</a>。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由 {{appName}} 发送。如不想再收到此类邮件，可点击上方链接退订。</p></div>',
        '["campaignTitle", "userName", "campaignBody", "ctaUrl", "ctaLabel", "unsubscribeUrl", "appName"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000738, 'seed-tpl-zh-email-marketing-promotion', 100001, 0,
        'email', 'marketing_promotion', '限时促销通知',
        '【限时】{{campaignTitle}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">限时优惠</h2><p>你好 {{userName}}，</p><p>{{campaignBody}}</p><p>活动截止时间：{{expireDate}}，不要错过。</p><p style="margin:24px 0"><a href="{{ctaUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">立即参与</a></p><p style="font-size:12px;color:#64748b">如不想再收到此类邮件，可<a href="{{unsubscribeUrl}}">退订</a>。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由 {{appName}} 发送。如不想再收到此类邮件，可点击上方链接退订。</p></div>',
        '["campaignTitle", "userName", "campaignBody", "expireDate", "ctaUrl", "unsubscribeUrl", "appName"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000801, 'seed-tpl-zh-sms-verification-code', 100001, 0,
        'sms', 'verification_code', '登录验证码短信',
        NULL,
        '您的登录验证码为 {{code}}，{{ttlMinutes}} 分钟内有效，请勿告知他人。',
        '["code", "ttlMinutes"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000802, 'seed-tpl-zh-sms-register-verification-code', 100001, 0,
        'sms', 'register_verification_code', '注册验证码短信',
        NULL,
        '您正在注册账号，验证码为 {{code}}，{{ttlMinutes}} 分钟内有效。',
        '["code", "ttlMinutes"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000803, 'seed-tpl-zh-sms-password-reset', 100001, 0,
        'sms', 'password_reset', '重置密码验证码短信',
        NULL,
        '您正在重置密码，验证码 {{code}}，如非本人操作请忽略并立即改密。',
        '["code"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000804, 'seed-tpl-zh-sms-password-changed', 100001, 0,
        'sms', 'password_changed', '密码修改成功短信',
        NULL,
        '您的账号密码已于 {{changeTime}} 修改成功，如非本人操作请联系客服。',
        '["changeTime"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000805, 'seed-tpl-zh-sms-register-welcome', 100001, 0,
        'sms', 'register_welcome', '注册欢迎短信',
        NULL,
        '欢迎加入 {{appName}}，账号已开通，登录即可开始使用。',
        '["appName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000806, 'seed-tpl-zh-sms-account-frozen', 100001, 0,
        'sms', 'account_frozen', '账户冻结通知短信',
        NULL,
        '您的账号因 {{reason}} 已被暂停使用，如有疑问请联系客服。',
        '["reason"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000807, 'seed-tpl-zh-sms-security-alert', 100001, 0,
        'sms', 'security_alert', '异常登录提醒短信',
        NULL,
        '检测到您的账号于 {{loginTime}} 在 {{location}} 登录，如非本人请立即改密。',
        '["loginTime", "location"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000808, 'seed-tpl-zh-sms-new-device-login', 100001, 0,
        'sms', 'new_device_login', '新设备登录提醒短信',
        NULL,
        '您的账号在新设备上登录，设备：{{device}}，如非本人请立即修改密码。',
        '["device"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000809, 'seed-tpl-zh-sms-phone-bind-code', 100001, 0,
        'sms', 'phone_bind_code', '绑定手机验证码短信',
        NULL,
        '您正在绑定手机号，验证码为 {{code}}，{{ttlMinutes}} 分钟内有效。',
        '["code", "ttlMinutes"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000810, 'seed-tpl-zh-sms-phone-rebind-code', 100001, 0,
        'sms', 'phone_rebind_code', '更换手机验证码短信',
        NULL,
        '您正在更换绑定手机号，验证码为 {{code}}，请勿告知他人。',
        '["code"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000811, 'seed-tpl-zh-sms-login-mfa-code', 100001, 0,
        'sms', 'login_mfa_code', '双因子登录验证码短信',
        NULL,
        '您的登录二次验证码为 {{code}}，{{ttlMinutes}} 分钟内有效。',
        '["code", "ttlMinutes"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000812, 'seed-tpl-zh-sms-withdraw-verification-code', 100001, 0,
        'sms', 'withdraw_verification_code', '提现验证码短信',
        NULL,
        '您正在发起提现，验证码为 {{code}}，请勿向任何人透露。',
        '["code"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000813, 'seed-tpl-zh-sms-payment-verification-code', 100001, 0,
        'sms', 'payment_verification_code', '支付验证码短信',
        NULL,
        '您的支付验证码为 {{code}}，涉及金额 {{amount}}，{{ttlMinutes}} 分钟内有效。',
        '["code", "amount", "ttlMinutes"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000814, 'seed-tpl-zh-sms-order-created', 100001, 0,
        'sms', 'order_created', '订单创建成功短信',
        NULL,
        '您的订单 {{orderId}} 已创建，金额 {{amount}}，请及时完成支付。',
        '["orderId", "amount"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000815, 'seed-tpl-zh-sms-order-paid', 100001, 0,
        'sms', 'order_paid', '订单支付成功短信',
        NULL,
        '您的订单 {{orderId}} 支付成功，金额 {{amount}}，感谢您的支持。',
        '["orderId", "amount"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000816, 'seed-tpl-zh-sms-payment-failed', 100001, 0,
        'sms', 'payment_failed', '支付失败提醒短信',
        NULL,
        '您的订单 {{orderId}} 支付未成功，请前往控制台重新支付。',
        '["orderId"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000817, 'seed-tpl-zh-sms-order-shipped', 100001, 0,
        'sms', 'order_shipped', '订单已发货短信',
        NULL,
        '您的订单 {{orderId}} 已发货，物流单号 {{trackingNo}}，请注意查收。',
        '["orderId", "trackingNo"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000818, 'seed-tpl-zh-sms-order-completed', 100001, 0,
        'sms', 'order_completed', '订单已完成短信',
        NULL,
        '您的订单 {{orderId}} 已完成，期待再次为您服务。',
        '["orderId"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000819, 'seed-tpl-zh-sms-order-cancelled', 100001, 0,
        'sms', 'order_cancelled', '订单已取消短信',
        NULL,
        '您的订单 {{orderId}} 已取消，如已支付将原路退回。',
        '["orderId"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000820, 'seed-tpl-zh-sms-order-refunded', 100001, 0,
        'sms', 'order_refunded', '订单退款到账短信',
        NULL,
        '您的订单 {{orderId}} 已退款 {{amount}}，将原路退回到您的支付账户。',
        '["orderId", "amount"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000821, 'seed-tpl-zh-sms-recharge-success', 100001, 0,
        'sms', 'recharge_success', '充值成功短信',
        NULL,
        '您的账户已成功充值 {{amount}}，当前余额 {{balance}}。',
        '["amount", "balance"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000822, 'seed-tpl-zh-sms-balance-low', 100001, 0,
        'sms', 'balance_low', '余额不足提醒短信',
        NULL,
        '您的账户余额仅剩 {{balance}}，为不影响使用请及时充值。',
        '["balance"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000823, 'seed-tpl-zh-sms-arrears-notice', 100001, 0,
        'sms', 'arrears_notice', '欠费提醒短信',
        NULL,
        '您的账户已欠费 {{amount}}，请于 {{dueDate}} 前完成补缴，否则服务将暂停。',
        '["amount", "dueDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000824, 'seed-tpl-zh-sms-service-suspended', 100001, 0,
        'sms', 'service_suspended', '服务暂停通知短信',
        NULL,
        '您的账户因欠费已暂停服务，充值后系统将自动恢复。',
        '[]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000825, 'seed-tpl-zh-sms-invoice-ready', 100001, 0,
        'sms', 'invoice_ready', '账单生成提醒短信',
        NULL,
        '您 {{period}} 的账单已生成，应付金额 {{amount}}，请于 {{dueDate}} 前支付。',
        '["period", "amount", "dueDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000826, 'seed-tpl-zh-sms-invoice-overdue', 100001, 0,
        'sms', 'invoice_overdue', '账单逾期提醒短信',
        NULL,
        '您 {{period}} 的账单已逾期 {{overdueDays}} 天，请尽快完成支付。',
        '["period", "overdueDays"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000827, 'seed-tpl-zh-sms-subscription-activated', 100001, 0,
        'sms', 'subscription_activated', '订阅开通成功短信',
        NULL,
        '您的 {{planName}} 订阅已开通，有效期至 {{expireDate}}。',
        '["planName", "expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000828, 'seed-tpl-zh-sms-subscription-expiring', 100001, 0,
        'sms', 'subscription_expiring', '订阅即将到期短信',
        NULL,
        '您的 {{planName}} 将于 {{expireDate}} 到期，为避免服务中断请及时续费。',
        '["planName", "expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000829, 'seed-tpl-zh-sms-subscription-expired', 100001, 0,
        'sms', 'subscription_expired', '订阅已到期短信',
        NULL,
        '您的 {{planName}} 已到期，服务已降级，续费后立即恢复。',
        '["planName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000830, 'seed-tpl-zh-sms-subscription-renewed', 100001, 0,
        'sms', 'subscription_renewed', '订阅续费成功短信',
        NULL,
        '您的 {{planName}} 已成功续费，有效期至 {{expireDate}}。',
        '["planName", "expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000831, 'seed-tpl-zh-sms-subscription-cancelled', 100001, 0,
        'sms', 'subscription_cancelled', '订阅取消成功短信',
        NULL,
        '您的 {{planName}} 订阅已取消，服务有效期至 {{expireDate}}。',
        '["planName", "expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000832, 'seed-tpl-zh-sms-plan-changed', 100001, 0,
        'sms', 'plan_changed', '套餐变更成功短信',
        NULL,
        '您的套餐已变更为 {{planName}}，新配置即刻生效。',
        '["planName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000833, 'seed-tpl-zh-sms-membership-expiring', 100001, 0,
        'sms', 'membership_expiring', '会员即将到期短信',
        NULL,
        '您的会员将于 {{expireDate}} 到期，续费可继续享受专属权益。',
        '["expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000834, 'seed-tpl-zh-sms-coupon-expiring', 100001, 0,
        'sms', 'coupon_expiring', '优惠券即将过期短信',
        NULL,
        '您有 {{couponCount}} 张优惠券将于 {{expireDate}} 过期，请在有效期内使用。',
        '["couponCount", "expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000835, 'seed-tpl-zh-sms-quota-warning', 100001, 0,
        'sms', 'quota_warning', '配额使用预警短信',
        NULL,
        '您的 {{quotaName}} 使用率已达 {{usagePercent}}，请及时调整套餐或充值。',
        '["quotaName", "usagePercent"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000836, 'seed-tpl-zh-sms-quota-exhausted', 100001, 0,
        'sms', 'quota_exhausted', '配额用尽通知短信',
        NULL,
        '您的 {{quotaName}} 配额已用尽，相关调用已被限制，请及时扩容。',
        '["quotaName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000837, 'seed-tpl-zh-sms-rate-limit-triggered', 100001, 0,
        'sms', 'rate_limit_triggered', '限流告警短信',
        NULL,
        '您的应用 {{appName}} 触发限流，请检查调用量或调整解封时间。',
        '["appName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000838, 'seed-tpl-zh-sms-api-key-exhausted', 100001, 0,
        'sms', 'api_key_exhausted', '密钥额度不足短信',
        NULL,
        '您的 API 密钥 {{keyName}} 余额不足，请及时充值以免调用失败。',
        '["keyName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000839, 'seed-tpl-zh-sms-usage-spike-alert', 100001, 0,
        'sms', 'usage_spike_alert', '用量突增告警短信',
        NULL,
        '您的 {{serviceName}} 用量在近 1 小时突增 {{usagePercent}}，请确认是否为预期行为。',
        '["serviceName", "usagePercent"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000840, 'seed-tpl-zh-sms-upstream-failure', 100001, 0,
        'sms', 'upstream_failure', '上游服务异常短信',
        NULL,
        '上游渠道 {{providerName}} 出现异常，系统已自动切换备用线路，请关注恢复情况。',
        '["providerName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000841, 'seed-tpl-zh-sms-node-offline', 100001, 0,
        'sms', 'node_offline', '节点离线告警短信',
        NULL,
        '服务节点 {{nodeName}} 已离线，请及时排查。',
        '["nodeName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000842, 'seed-tpl-zh-sms-service-degraded', 100001, 0,
        'sms', 'service_degraded', '服务降级告警短信',
        NULL,
        '{{serviceName}} 触发降级策略，部分功能可能受影响，请尽快处理。',
        '["serviceName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000843, 'seed-tpl-zh-sms-release-published', 100001, 0,
        'sms', 'release_published', '版本发布通知短信',
        NULL,
        '{{appName}} 新版本 {{version}} 已发布，可前往控制台查看更新内容。',
        '["appName", "version"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000844, 'seed-tpl-zh-sms-maintenance-notice', 100001, 0,
        'sms', 'maintenance_notice', '系统维护通知短信',
        NULL,
        '系统将于 {{startTime}} 进行维护，预计耗时 {{duration}}，期间部分功能不可用。',
        '["startTime", "duration"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000845, 'seed-tpl-zh-sms-data-export-ready', 100001, 0,
        'sms', 'data_export_ready', '数据导出完成短信',
        NULL,
        '您的数据导出任务已完成，可前往控制台下载，链接 24 小时内有效。',
        '[]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000846, 'seed-tpl-zh-sms-ticket-created', 100001, 0,
        'sms', 'ticket_created', '工单受理短信',
        NULL,
        '您的工单 {{ticketNo}} 已受理，我们会尽快处理。',
        '["ticketNo"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000847, 'seed-tpl-zh-sms-ticket-replied', 100001, 0,
        'sms', 'ticket_replied', '工单回复提醒短信',
        NULL,
        '您的工单 {{ticketNo}} 有新的回复，请前往控制台查看。',
        '["ticketNo"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000848, 'seed-tpl-zh-sms-ticket-closed', 100001, 0,
        'sms', 'ticket_closed', '工单关闭短信',
        NULL,
        '您的工单 {{ticketNo}} 已关闭，如问题仍存在可重新提交。',
        '["ticketNo"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000849, 'seed-tpl-zh-sms-partner-approved', 100001, 0,
        'sms', 'partner_approved', '合作伙伴审核通过短信',
        NULL,
        '恭喜您已成为 {{appName}} 合作伙伴，可登录伙伴中心查看权益。',
        '["appName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000850, 'seed-tpl-zh-sms-partner-rejected', 100001, 0,
        'sms', 'partner_rejected', '合作伙伴审核未通过短信',
        NULL,
        '很抱歉，您的合作伙伴申请未通过审核，原因：{{reason}}。',
        '["reason"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000851, 'seed-tpl-zh-sms-partner-commission-settled', 100001, 0,
        'sms', 'partner_commission_settled', '佣金结算短信',
        NULL,
        '您的佣金 {{amount}} 已结算，可前往伙伴中心查看明细。',
        '["amount"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000852, 'seed-tpl-zh-sms-partner-withdraw-success', 100001, 0,
        'sms', 'partner_withdraw_success', '提现成功短信',
        NULL,
        '您的提现 {{amount}} 已成功，预计 1-3 个工作日到账。',
        '["amount"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000853, 'seed-tpl-zh-sms-partner-withdraw-failed', 100001, 0,
        'sms', 'partner_withdraw_failed', '提现失败短信',
        NULL,
        '您的提现 {{amount}} 未成功，资金已退回余额，请联系客服核实信息。',
        '["amount"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000854, 'seed-tpl-zh-sms-marketing-campaign', 100001, 0,
        'sms', 'marketing_campaign', '营销活动通知短信',
        NULL,
        '{{campaignTitle}}：{{ctaUrl}}，回 T 退订。',
        '["campaignTitle", "ctaUrl"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000855, 'seed-tpl-zh-sms-marketing-promotion', 100001, 0,
        'sms', 'marketing_promotion', '限时促销短信',
        NULL,
        '{{campaignTitle}}，活动截止 {{expireDate}}，回 T 退订。',
        '["campaignTitle", "expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000856, 'seed-tpl-zh-sms-marketing-recall', 100001, 0,
        'sms', 'marketing_recall', '用户召回短信',
        NULL,
        '好久不见！我们为您准备了专属福利，回 T 退订。',
        '[]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000857, 'seed-tpl-zh-sms-marketing-new-feature', 100001, 0,
        'sms', 'marketing_new_feature', '新功能上线短信',
        NULL,
        '{{appName}} 上线新功能：{{featureName}}，欢迎体验，回 T 退订。',
        '["appName", "featureName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000858, 'seed-tpl-zh-sms-marketing-unsubscribed', 100001, 0,
        'sms', 'marketing_unsubscribed', '营销退订成功短信',
        NULL,
        '您已成功退订 {{appName}} 的营销短信，将不再收到此类消息。',
        '["appName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000859, 'seed-tpl-zh-sms-content-rejected', 100001, 0,
        'sms', 'content_rejected', '内容审核未通过短信',
        NULL,
        '您提交的内容因 {{reason}} 未通过审核，请修改后重新提交。',
        '["reason"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000860, 'seed-tpl-zh-sms-account-risk-alert', 100001, 0,
        'sms', 'account_risk_alert', '风险账户提醒短信',
        NULL,
        '您的账号存在异常行为，已临时限制部分功能，请完成安全验证。',
        '[]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000861, 'seed-tpl-zh-sms-realname-verified', 100001, 0,
        'sms', 'realname_verified', '实名认证通过短信',
        NULL,
        '您的实名认证已通过，可享受完整服务。',
        '[]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001010, 'seed-tpl-zh-email-api-key-created', 100001, 0,
        'email', 'api_key_created', 'API 密钥已创建',
        '【{{appName}}】新的 API 密钥已创建',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">API 密钥已创建</h2><p>你好 {{userName}}，</p><p>你的账户于 {{createdAt}} 创建了新的 API 密钥 <strong>{{keyName}}</strong>（前缀 {{keyPrefix}}）。</p><p>请妥善保管密钥，不要在客户端或公开仓库中泄露。如非本人操作，请立即前往控制台吊销并联系客服。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">管理密钥</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "createdAt", "keyName", "keyPrefix", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001011, 'seed-tpl-zh-email-api-key-revoked', 100001, 0,
        'email', 'api_key_revoked', 'API 密钥已吊销',
        '【{{appName}}】API 密钥 {{keyName}} 已吊销',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">API 密钥已吊销</h2><p>你好 {{userName}}，</p><p>API 密钥 <strong>{{keyName}}</strong> 已于 {{revokedAt}} 吊销，使用该密钥的调用将立即失败。</p><p>如果这是一次误操作，请在控制台重新创建密钥并更新你的应用配置。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">前往控制台</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "keyName", "userName", "revokedAt", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001012, 'seed-tpl-zh-email-api-deprecation', 100001, 0,
        'email', 'api_deprecation', '接口下线通知',
        '【{{appName}}】接口 {{endpoint}} 即将下线',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">接口下线通知</h2><p>你好 {{userName}}，</p><p>接口 <code>{{endpoint}}</code> 将于 {{deprecateDate}} 下线，请在此日期前迁移到 {{replacementEndpoint}}。</p><p>未完成迁移的调用届时将返回错误。可查看迁移指南了解改动点。</p><p style="margin:24px 0"><a href="{{migrationUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看迁移指南</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "endpoint", "userName", "deprecateDate", "replacementEndpoint", "migrationUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001013, 'seed-tpl-zh-email-api-rate-limited', 100001, 0,
        'email', 'api_rate_limited', '调用超限通知',
        '【{{appName}}】应用 {{appNameShort}} 触发限流',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">调用超限通知</h2><p>你好 {{userName}}，</p><p>你的应用在 {{windowStart}} 至 {{windowEnd}} 期间触发限流，最高达到 {{peakRpm}} RPM。</p><p>可通过升级套餐提升配额，或在控制台申请临时解封。详见调用记录。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看用量</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "appNameShort", "userName", "windowStart", "windowEnd", "peakRpm", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001014, 'seed-tpl-zh-email-team-member-invited', 100001, 0,
        'email', 'team_member_invited', '团队邀请',
        '{{inviterName}} 邀请你加入 {{appName}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">团队邀请</h2><p>你好，</p><p>{{inviterName}} 邀请你以「{{roleName}}」身份加入 <strong>{{tenantName}}</strong> 的 {{appName}} 团队。</p><p style="margin:24px 0"><a href="{{inviteUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">接受邀请</a></p><p>邀请链接 {{ttlDays}} 天内有效。如果这不是给你的邮件，请忽略。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["inviterName", "appName", "roleName", "tenantName", "inviteUrl", "ttlDays"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001015, 'seed-tpl-zh-email-team-member-joined', 100001, 0,
        'email', 'team_member_joined', '成员加入通知',
        '【{{appName}}】{{memberName}} 已加入团队',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">新成员加入</h2><p>你好 {{userName}}，</p><p>{{memberName}}（{{memberEmail}}）已接受邀请，以「{{roleName}}」身份加入 <strong>{{tenantName}}</strong>。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看成员</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "memberName", "userName", "memberEmail", "roleName", "tenantName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001016, 'seed-tpl-zh-email-role-changed', 100001, 0,
        'email', 'role_changed', '成员角色变更',
        '【{{appName}}】你的权限已调整为 {{roleName}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">权限已调整</h2><p>你好 {{userName}}，</p><p>你在 <strong>{{tenantName}}</strong> 的角色已调整为「{{roleName}}」，新权限立即生效。</p><p>如对权限范围有疑问，请联系团队管理员。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看权限</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "roleName", "userName", "tenantName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001017, 'seed-tpl-zh-email-subuser-created', 100001, 0,
        'email', 'subuser_created', '子账号创建',
        '【{{appName}}】子账号 {{subUserName}} 已创建',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">子账号已创建</h2><p>你好 {{userName}}，</p><p>你已成功创建子账号 <strong>{{subUserName}}</strong>，可分配给团队成员使用。</p><p>子账号拥有独立凭证，请按最小权限原则授予访问策略。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">管理子账号</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "subUserName", "userName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001018, 'seed-tpl-zh-email-seat-limit-reached', 100001, 0,
        'email', 'seat_limit_reached', '席位已满提醒',
        '【{{appName}}】团队席位已用尽',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">团队席位已用尽</h2><p>你好 {{userName}}，</p><p><strong>{{tenantName}}</strong> 的团队成员已达套餐上限（{{seatLimit}} 个席位），新成员将无法加入。</p><p>如需继续新增成员，请升级套餐或移除不再使用的席位。</p><p style="margin:24px 0"><a href="{{upgradeUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">升级套餐</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "tenantName", "seatLimit", "upgradeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001019, 'seed-tpl-zh-email-domain-verified', 100001, 0,
        'email', 'domain_verified', '域名验证成功',
        '【{{appName}}】域名 {{domainName}} 验证成功',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">域名验证成功</h2><p>你好 {{userName}}，</p><p>域名 <strong>{{domainName}}</strong> 已完成归属验证，可用于对外提供服务和绑定应用。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看域名</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "domainName", "userName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001020, 'seed-tpl-zh-email-domain-expiring', 100001, 0,
        'email', 'domain_expiring', '域名即将到期',
        '【{{appName}}】域名 {{domainName}} 将于 {{expireDate}} 到期',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">域名即将到期</h2><p>你好 {{userName}}，</p><p>域名 <strong>{{domainName}}</strong> 将于 {{expireDate}} 到期。到期未续费将停止解析，相关服务会中断。</p><p style="margin:24px 0"><a href="{{renewUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">立即续费</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "domainName", "expireDate", "userName", "renewUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001021, 'seed-tpl-zh-email-ssl-cert-expiring', 100001, 0,
        'email', 'ssl_cert_expiring', '证书即将过期',
        '【{{appName}}】证书 {{certName}} 将于 {{expireDate}} 过期',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">证书即将过期</h2><p>你好 {{userName}}，</p><p>证书 <strong>{{certName}}</strong>（绑定 {{domainName}}）将于 {{expireDate}} 过期。</p><p>请及时续期或更换证书，避免访问出现安全警告。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">管理证书</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "certName", "expireDate", "userName", "domainName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001022, 'seed-tpl-zh-email-storage-quota-warning', 100001, 0,
        'email', 'storage_quota_warning', '存储空间预警',
        '【{{appName}}】存储空间已使用 {{usagePercent}}%',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">存储空间预警</h2><p>你好 {{userName}}，</p><p>你的存储空间已使用 {{usagePercent}}%，剩余 {{remaining}}。</p><p>达到上限后将无法写入新文件，请清理或扩容。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">管理存储</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "usagePercent", "userName", "remaining", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001023, 'seed-tpl-zh-email-payment-method-added', 100001, 0,
        'email', 'payment_method_added', '支付方式已添加',
        '【{{appName}}】已添加新的支付方式',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">支付方式已添加</h2><p>你好 {{userName}}，</p><p>你的账户于 {{addedAt}} 添加了新的支付方式：{{methodLabel}}（尾号 {{methodTail}}）。</p><p>如非本人操作，请立即删除该支付方式并联系客服。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">管理支付方式</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "addedAt", "methodLabel", "methodTail", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001024, 'seed-tpl-zh-email-recharge-failed', 100001, 0,
        'email', 'recharge_failed', '充值失败提醒',
        '【{{appName}}】充值 {{amount}} 未成功',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">充值未成功</h2><p>你好 {{userName}}，</p><p>你的账户充值 {{amount}} 未能完成，可能由支付渠道超时或银行拒付导致。</p><p>请重新发起充值，如多次失败请联系客服核实。</p><p style="margin:24px 0"><a href="{{rechargeUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">重新充值</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "amount", "userName", "rechargeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001025, 'seed-tpl-zh-email-refund-created', 100001, 0,
        'email', 'refund_created', '退款申请已受理',
        '【{{appName}}】退款申请已受理',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">退款申请已受理</h2><p>你好 {{userName}}，</p><p>你针对订单 {{orderId}} 提出的退款申请已受理，退款金额 {{amount}}。</p><p>审核通过后款项将原路退回，通常 1-7 个工作日到账。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "orderId", "amount"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001026, 'seed-tpl-zh-email-invoice-issued', 100001, 0,
        'email', 'invoice_issued', '发票已开具',
        '【{{appName}}】发票已开具',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">发票已开具</h2><p>你好 {{userName}}，</p><p>你申请的发票已开具，发票号码 {{invoiceNo}}，开票金额 {{amount}}。</p><p>可前往财务中心下载电子发票。</p><p style="margin:24px 0"><a href="{{invoiceUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">下载发票</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "invoiceNo", "amount", "invoiceUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001027, 'seed-tpl-zh-email-tax-info-required', 100001, 0,
        'email', 'tax_info_required', '税务信息待完善',
        '【{{appName}}】请完善开票税务信息',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">税务信息待完善</h2><p>你好 {{userName}}，</p><p>你的账户缺少开票所需的税务信息，无法开具发票。</p><p>请补充企业名称、纳税人识别号与注册地址等信息后重新申请。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">完善信息</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001028, 'seed-tpl-zh-email-contract-signed', 100001, 0,
        'email', 'contract_signed', '合同签署完成',
        '【{{appName}}】合同 {{contractNo}} 已签署完成',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">合同已签署</h2><p>你好 {{userName}}，</p><p>合同 <strong>{{contractNo}}</strong> 已由双方签署完成，生效日期 {{effectiveDate}}。</p><p>你可以在控制台下载已签署的合同副本。</p><p style="margin:24px 0"><a href="{{contractUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看合同</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "contractNo", "userName", "effectiveDate", "contractUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001029, 'seed-tpl-zh-email-trial-ending', 100001, 0,
        'email', 'trial_ending', '试用即将结束',
        '【{{appName}}】你的试用将于 {{expireDate}} 结束',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">试用即将结束</h2><p>你好 {{userName}}，</p><p>你的试用将于 {{expireDate}} 结束。试用结束后，超出免费额度的功能将被限制。</p><p>现在购买可保留现有配置与数据。</p><p style="margin:24px 0"><a href="{{upgradeUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">选择套餐</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "expireDate", "userName", "upgradeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001030, 'seed-tpl-zh-email-plan-upgraded', 100001, 0,
        'email', 'plan_upgraded', '套餐升级成功',
        '【{{appName}}】已升级至 {{planName}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">套餐升级成功</h2><p>你好 {{userName}}，</p><p>你的套餐已升级至 <strong>{{planName}}</strong>，相应配额立即生效。</p><p>本次应付金额 {{amount}}，可在控制台查看账单明细。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看套餐</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "planName", "userName", "amount", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001031, 'seed-tpl-zh-email-downgrade-scheduled', 100001, 0,
        'email', 'downgrade_scheduled', '套餐降级预约',
        '【{{appName}}】套餐将于 {{effectiveDate}} 降级',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">套餐降级预约</h2><p>你好 {{userName}}，</p><p>你的套餐将于 {{effectiveDate}} 降级至 {{planName}}。降级后超出新套餐额度的资源将受到限制。</p><p>如需取消降级，可在生效前操作。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">管理套餐</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "effectiveDate", "userName", "planName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001032, 'seed-tpl-zh-email-subscription-paused', 100001, 0,
        'email', 'subscription_paused', '订阅已暂停',
        '【{{appName}}】订阅已暂停',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">订阅已暂停</h2><p>你好 {{userName}}，</p><p>你的 {{planName}} 订阅已暂停，服务将在 {{pauseUntil}} 后恢复。</p><p>如需提前恢复，可在控制台立即启用。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">立即恢复</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "planName", "pauseUntil", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001033, 'seed-tpl-zh-email-cost-alert', 100001, 0,
        'email', 'cost_alert', '消费预算预警',
        '【{{appName}}】本月消费已达预算的 {{usagePercent}}%',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">消费预算预警</h2><p>你好 {{userName}}，</p><p>你设置的月度预算 {{budget}} 已使用 {{usagePercent}}%，当前消费 {{currentCost}}。</p><p>可调整预算上限或设置告警阈值，避免意外超支。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看账单</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "usagePercent", "userName", "budget", "currentCost", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001034, 'seed-tpl-zh-email-membership-upgraded', 100001, 0,
        'email', 'membership_upgraded', '会员升级成功',
        '【{{appName}}】你已升级为 {{levelName}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">会员升级成功</h2><p>你好 {{userName}}，</p><p>恭喜你升级为 <strong>{{levelName}}</strong> 会员，有效期至 {{expireDate}}。</p><p>现在起可享受对应等级的全部权益。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看权益</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "levelName", "userName", "expireDate", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001035, 'seed-tpl-zh-email-coupon-granted', 100001, 0,
        'email', 'coupon_granted', '优惠券到账',
        '【{{appName}}】你收到一张优惠券',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">优惠券到账</h2><p>你好 {{userName}}，</p><p>你收到优惠券 <strong>{{couponName}}</strong>，可在购买指定商品时抵扣 {{discountAmount}}。</p><p>有效期至 {{expireDate}}，逾期作废。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">立即使用</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "couponName", "discountAmount", "expireDate", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001036, 'seed-tpl-zh-email-points-changed', 100001, 0,
        'email', 'points_changed', '积分变动',
        '【{{appName}}】你的积分已变动',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">积分变动</h2><p>你好 {{userName}}，</p><p>你的账户积分{{direction}} {{points}}，当前积分 {{balance}}。</p><p>积分可在积分商城兑换权益。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看积分</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "direction", "points", "balance", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001037, 'seed-tpl-zh-email-referral-reward', 100001, 0,
        'email', 'referral_reward', '推荐奖励到账',
        '【{{appName}}】推荐奖励已发放',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">推荐奖励已发放</h2><p>你好 {{userName}}，</p><p>你邀请的好友已完成注册并产生首单，奖励 {{amount}} 已发放至你的账户。</p><p>继续邀请可获得更多奖励。</p><p style="margin:24px 0"><a href="{{partnerUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">继续邀请</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "amount", "partnerUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001038, 'seed-tpl-zh-email-account-deletion-scheduled', 100001, 0,
        'email', 'account_deletion_scheduled', '账户注销预约',
        '【{{appName}}】账户注销申请已受理',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">账户注销申请已受理</h2><p>你好 {{userName}}，</p><p>你的账户注销申请已受理，账户将于 {{deleteDate}} 永久删除，届时数据无法恢复。</p><p>如需撤销，请在生效前登录控制台操作。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">撤销注销</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "deleteDate", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001039, 'seed-tpl-zh-email-data-export-ready', 100001, 0,
        'email', 'data_export_ready', '数据导出完成',
        '【{{appName}}】数据导出已完成',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">数据导出已完成</h2><p>你好 {{userName}}，</p><p>你申请的数据导出已完成，可前往控制台下载。</p><p>下载链接 {{ttlHours}} 小时内有效，过期后需重新发起导出。</p><p style="margin:24px 0"><a href="{{exportUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">下载数据</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "ttlHours", "exportUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001040, 'seed-tpl-zh-email-privacy-request-received', 100001, 0,
        'email', 'privacy_request_received', '隐私请求已受理',
        '【{{appName}}】隐私请求已受理',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">隐私请求已受理</h2><p>你好 {{userName}}，</p><p>我们已收到你的 {{requestType}} 请求，将在 {{slaDays}} 个工作日内处理完成。</p><p>处理结果会通过邮件同步给你。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "requestType", "slaDays"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001041, 'seed-tpl-zh-email-mfa-enabled', 100001, 0,
        'email', 'mfa_enabled', '已启用双因子验证',
        '【{{appName}}】双因子验证已启用',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">双因子验证已启用</h2><p>你好 {{userName}}，</p><p>你的账户已启用双因子验证（{{factorName}}），后续登录需完成二次验证。</p><p>如非本人操作，请立即联系客服。</p><p style="margin:24px 0"><a href="{{securityUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">安全设置</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "factorName", "securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001042, 'seed-tpl-zh-email-mfa-disabled', 100001, 0,
        'email', 'mfa_disabled', '已关闭双因子验证',
        '【{{appName}}】双因子验证已关闭',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">双因子验证已关闭</h2><p>你好 {{userName}}，</p><p>你的账户已关闭双因子验证，账户安全性将相应降低。</p><p>如非本人操作，请立即重新启用并修改密码。</p><p style="margin:24px 0"><a href="{{securityUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">重新启用</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001043, 'seed-tpl-zh-email-security-audit-log', 100001, 0,
        'email', 'security_audit_log', '安全审计提示',
        '【{{appName}}】本周安全审计摘要',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">安全审计摘要</h2><p>你好 {{userName}}，</p><p>{{period}} 期间你的账户共发生 {{eventCount}} 条安全相关事件，其中高风险 {{highRiskCount}} 条。</p><p>如发现异常登录或未授权操作，请及时处理。</p><p style="margin:24px 0"><a href="{{auditUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看审计日志</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "period", "eventCount", "highRiskCount", "auditUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001044, 'seed-tpl-zh-email-login-new-region', 100001, 0,
        'email', 'login_new_region', '新地区登录提醒',
        '【{{appName}}】检测到来自新地区的登录',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">新地区登录</h2><p>你好 {{userName}}，</p><p>你的账户于 {{loginAt}} 首次从 {{location}} 登录，IP 地址 {{ipAddress}}。</p><p>如非本人操作，请立即修改密码并开启双因子验证。</p><p style="margin:24px 0"><a href="{{securityUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">保护账户</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "loginAt", "location", "ipAddress", "securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001045, 'seed-tpl-zh-email-service-outage', 100001, 0,
        'email', 'service_outage', '服务故障通知',
        '【{{appName}}】{{serviceName}} 发生故障',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">服务故障通知</h2><p>你好 {{userName}}，</p><p>{{serviceName}} 于 {{startTime}} 发生故障（{{severity}}），影响 {{impactScope}}。</p><p>技术团队正在处理，进展将同步更新。</p><p style="margin:24px 0"><a href="{{statusUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看状态页</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "serviceName", "userName", "startTime", "severity", "impactScope", "statusUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001046, 'seed-tpl-zh-email-service-recovered', 100001, 0,
        'email', 'service_recovered', '服务恢复通知',
        '【{{appName}}】{{serviceName}} 已恢复',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">服务已恢复</h2><p>你好 {{userName}}，</p><p>{{serviceName}} 已于 {{recoveredAt}} 恢复正常，本次故障持续 {{duration}}。</p><p>我们会在故障复盘中公布根因与改进措施。</p><p style="margin:24px 0"><a href="{{statusUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看复盘</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "serviceName", "userName", "recoveredAt", "duration", "statusUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001047, 'seed-tpl-zh-email-sla-breach', 100001, 0,
        'email', 'sla_breach', 'SLA 未达成通知',
        '【{{appName}}】{{period}} 服务水平未达成',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">服务水平未达成</h2><p>你好 {{userName}}，</p><p>{{period}} 期间 {{serviceName}} 的可用性为 {{availability}}，低于承诺的 {{slaTarget}}。</p><p>按服务协议，对应补偿将自动计入你的账户。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看补偿</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "period", "userName", "serviceName", "availability", "slaTarget", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001048, 'seed-tpl-zh-email-maintenance-completed', 100001, 0,
        'email', 'maintenance_completed', '系统维护完成',
        '【{{appName}}】系统维护已提前完成',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">维护已完成</h2><p>你好 {{userName}}，</p><p>{{appName}} 的维护已于 {{completedAt}} 提前完成，全部服务已恢复。</p><p>感谢你的耐心等待与配合。</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName", "userName", "completedAt"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001100, 'seed-tpl-zh-sms-login-new-region', 100001, 0,
        'sms', 'login_new_region', '异地登录提醒短信',
        NULL,
        '您的账号于 {{loginTime}} 在 {{location}} 登录，如非本人请立即改密。',
        '["loginTime","location"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001101, 'seed-tpl-zh-sms-mfa-enabled', 100001, 0,
        'sms', 'mfa_enabled', '双因子开启提醒短信',
        NULL,
        '您的账号已开启双因子验证，后续登录需二次验证。',
        '[]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001102, 'seed-tpl-zh-sms-mfa-disabled', 100001, 0,
        'sms', 'mfa_disabled', '双因子关闭提醒短信',
        NULL,
        '您的账号已关闭双因子验证，如非本人请立即处理。',
        '[]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001103, 'seed-tpl-zh-sms-api-key-created', 100001, 0,
        'sms', 'api_key_created', '密钥创建提醒短信',
        NULL,
        '您的账户创建了新的 API 密钥 {{keyName}}，如非本人请立即吊销。',
        '["keyName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001104, 'seed-tpl-zh-sms-api-key-revoked', 100001, 0,
        'sms', 'api_key_revoked', '密钥吊销提醒短信',
        NULL,
        '您的 API 密钥 {{keyName}} 已吊销，相关调用将失败。',
        '["keyName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001105, 'seed-tpl-zh-sms-team-member-invited', 100001, 0,
        'sms', 'team_member_invited', '团队邀请短信',
        NULL,
        '{{inviterName}} 邀请您加入 {{tenantName}} 团队，请登录查看。',
        '["inviterName","tenantName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001106, 'seed-tpl-zh-sms-seat-limit-reached', 100001, 0,
        'sms', 'seat_limit_reached', '席位已满提醒短信',
        NULL,
        '您的团队席位已用尽，新增成员前请升级套餐。',
        '[]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001107, 'seed-tpl-zh-sms-domain-verified', 100001, 0,
        'sms', 'domain_verified', '域名验证成功短信',
        NULL,
        '您的域名 {{domainName}} 已验证成功，可正常使用。',
        '["domainName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001108, 'seed-tpl-zh-sms-domain-expiring', 100001, 0,
        'sms', 'domain_expiring', '域名到期提醒短信',
        NULL,
        '您的域名 {{domainName}} 将于 {{expireDate}} 到期，请及时续费。',
        '["domainName","expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001109, 'seed-tpl-zh-sms-ssl-cert-expiring', 100001, 0,
        'sms', 'ssl_cert_expiring', '证书到期提醒短信',
        NULL,
        '您的证书 {{certName}} 将于 {{expireDate}} 过期，请及时续期。',
        '["certName","expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001110, 'seed-tpl-zh-sms-storage-quota-warning', 100001, 0,
        'sms', 'storage_quota_warning', '存储空间预警短信',
        NULL,
        '您的存储空间已使用 {{usagePercent}}，请及时清理或扩容。',
        '["usagePercent"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001111, 'seed-tpl-zh-sms-payment-method-added', 100001, 0,
        'sms', 'payment_method_added', '支付方式新增短信',
        NULL,
        '您的账户新增了支付方式，如非本人请立即联系客服。',
        '[]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001112, 'seed-tpl-zh-sms-recharge-failed', 100001, 0,
        'sms', 'recharge_failed', '充值失败提醒短信',
        NULL,
        '您的充值 {{amount}} 未成功，请重新发起或联系客服。',
        '["amount"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001113, 'seed-tpl-zh-sms-invoice-issued', 100001, 0,
        'sms', 'invoice_issued', '发票开具提醒短信',
        NULL,
        '您申请的发票 {{invoiceNo}} 已开具，可前往财务中心下载。',
        '["invoiceNo"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001114, 'seed-tpl-zh-sms-trial-ending', 100001, 0,
        'sms', 'trial_ending', '试用到期提醒短信',
        NULL,
        '您的试用将于 {{expireDate}} 结束，请及时选择套餐。',
        '["expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001115, 'seed-tpl-zh-sms-plan-changed-success', 100001, 0,
        'sms', 'plan_changed_success', '套餐变更成功短信',
        NULL,
        '您的套餐已变更为 {{planName}}，新配额即刻生效。',
        '["planName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001116, 'seed-tpl-zh-sms-subscription-paused', 100001, 0,
        'sms', 'subscription_paused', '订阅暂停提醒短信',
        NULL,
        '您的 {{planName}} 订阅已暂停，可前往控制台恢复。',
        '["planName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001117, 'seed-tpl-zh-sms-cost-alert', 100001, 0,
        'sms', 'cost_alert', '消费预算预警短信',
        NULL,
        '您本月消费已达预算的 {{usagePercent}}，当前 {{currentCost}}。',
        '["usagePercent","currentCost"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001118, 'seed-tpl-zh-sms-coupon-granted', 100001, 0,
        'sms', 'coupon_granted', '优惠券到账短信',
        NULL,
        '您获得优惠券 {{couponName}}，有效期至 {{expireDate}}。',
        '["couponName","expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001119, 'seed-tpl-zh-sms-account-deletion-scheduled', 100001, 0,
        'sms', 'account_deletion_scheduled', '注销预约提醒短信',
        NULL,
        '您的账户将于 {{deleteDate}} 注销，如需撤销请尽快登录。',
        '["deleteDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001120, 'seed-tpl-zh-sms-service-outage', 100001, 0,
        'sms', 'service_outage', '服务故障通知短信',
        NULL,
        '{{serviceName}} 发生故障，我们正在紧急处理。',
        '["serviceName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001121, 'seed-tpl-zh-sms-service-recovered', 100001, 0,
        'sms', 'service_recovered', '服务恢复通知短信',
        NULL,
        '{{serviceName}} 已恢复，感谢您的耐心等待。',
        '["serviceName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001200, 'seed-tpl-zh-email-ticket-created', 100001, 0,
        'email', 'ticket_created', '工单已创建',
        '【{{appName}}】工单 {{ticketNo}} 已创建',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">工单已创建</h2><p>你好 {{userName}}，</p><p>你的工单 <strong>{{ticketNo}}</strong>（{{ticketSubject}}）已创建，我们会在 {{slaHours}} 小时内响应。</p><p style="margin:24px 0"><a href="{{ticketUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看工单</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName","ticketNo","userName","ticketSubject","slaHours","ticketUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001201, 'seed-tpl-zh-email-ticket-closed', 100001, 0,
        'email', 'ticket_closed', '工单已关闭',
        '【{{appName}}】工单 {{ticketNo}} 已关闭',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">工单已关闭</h2><p>你好 {{userName}}，</p><p>工单 <strong>{{ticketNo}}</strong> 已关闭。如问题仍未解决，可重新提交工单。</p><p style="margin:24px 0"><a href="{{ticketUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">评价服务</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName","ticketNo","userName","ticketUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001202, 'seed-tpl-zh-email-marketing-recall', 100001, 0,
        'email', 'marketing_recall', '召回优惠',
        '【{{appName}}】为你准备了专属回归礼',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">专属回归礼</h2><p>你好 {{userName}}，</p><p>很久没看到你了。我们为你准备了 {{discountAmount}} 的回归优惠，有效期至 {{expireDate}}。</p><p style="margin:24px 0"><a href="{{campaignUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">立即使用</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName","userName","discountAmount","expireDate","campaignUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001203, 'seed-tpl-zh-email-marketing-new-feature', 100001, 0,
        'email', 'marketing_new_feature', '新功能上线',
        '【{{appName}}】新功能 {{featureName}} 已上线',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">新功能上线</h2><p>你好 {{userName}}，</p><p>新功能 <strong>{{featureName}}</strong> 已上线：{{featureSummary}}</p><p style="margin:24px 0"><a href="{{releaseUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">了解详情</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName","featureName","userName","featureSummary","releaseUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001204, 'seed-tpl-zh-email-marketing-unsubscribed', 100001, 0,
        'email', 'marketing_unsubscribed', '退订确认',
        '【{{appName}}】已为你退订推广邮件',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">退订确认</h2><p>你好 {{userName}}，</p><p>我们已停止向你发送推广邮件。账号与交易类通知不受影响。</p><p>如需重新订阅，可在通知设置中开启。</p><p style="margin:24px 0"><a href="{{preferencesUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">通知设置</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName","userName","preferencesUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001205, 'seed-tpl-zh-email-order-invoice', 100001, 0,
        'email', 'order_invoice', '订单发票申请',
        '【{{appName}}】订单 {{orderId}} 可开具发票',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">订单可开发票</h2><p>你好 {{userName}}，</p><p>订单 <strong>{{orderId}}</strong>（{{amount}}）已完成，现在可以申请开具发票。</p><p style="margin:24px 0"><a href="{{invoiceUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">申请开票</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName","orderId","userName","amount","invoiceUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001206, 'seed-tpl-zh-email-order-delivered', 100001, 0,
        'email', 'order_delivered', '服务已交付',
        '【{{appName}}】订单 {{orderId}} 服务已交付',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">服务已交付</h2><p>你好 {{userName}}，</p><p>订单 <strong>{{orderId}}</strong> 的资源已完成交付并生效，可前往控制台查看。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看资源</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName","orderId","userName","consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001207, 'seed-tpl-zh-email-password-expiring', 100001, 0,
        'email', 'password_expiring', '密码即将过期',
        '【{{appName}}】你的密码将于 {{expireDate}} 过期',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">密码即将过期</h2><p>你好 {{userName}}，</p><p>按安全策略，你的密码将于 {{expireDate}} 过期，届时需要重新设置。</p><p style="margin:24px 0"><a href="{{securityUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">修改密码</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName","expireDate","userName","securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001208, 'seed-tpl-zh-email-device-removed', 100001, 0,
        'email', 'device_removed', '设备已被移除',
        '【{{appName}}】设备 {{deviceName}} 已被移除',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">设备已移除</h2><p>你好 {{userName}}，</p><p>设备 <strong>{{deviceName}}</strong> 已于 {{removedAt}} 从你的账户移除，该设备将无法继续登录。</p><p>如非本人操作，请立即修改密码。</p><p style="margin:24px 0"><a href="{{securityUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">设备管理</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName","deviceName","userName","removedAt","securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001209, 'seed-tpl-zh-email-profile-updated', 100001, 0,
        'email', 'profile_updated', '资料变更通知',
        '【{{appName}}】账户资料已更新',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">账户资料已更新</h2><p>你好 {{userName}}，</p><p>你的账户资料（{{changedFields}}）已于 {{changedAt}} 更新。</p><p>如非本人操作，请立即联系客服。</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">查看资料</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">本邮件由系统自动发送，请勿直接回复；如需帮助请联系客服。</p></div>',
        '["appName","userName","changedFields","changedAt","consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001160, 'seed-tpl-zh-sms-team-member-joined', 100001, 0,
        'sms', 'team_member_joined', '成员加入短信',
        NULL,
        '{{memberName}} 已加入您的团队 {{tenantName}}。',
        '["memberName","tenantName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001161, 'seed-tpl-zh-sms-role-changed', 100001, 0,
        'sms', 'role_changed', '角色变更短信',
        NULL,
        '您在 {{tenantName}} 的角色已调整为 {{roleName}}。',
        '["tenantName","roleName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001162, 'seed-tpl-zh-sms-subuser-created', 100001, 0,
        'sms', 'subuser_created', '子账号创建短信',
        NULL,
        '您的账户已创建子账号 {{subUserName}}，如非本人请立即处理。',
        '["subUserName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001163, 'seed-tpl-zh-sms-password-expiring', 100001, 0,
        'sms', 'password_expiring', '密码过期短信',
        NULL,
        '您的密码将于 {{expireDate}} 过期，请及时修改。',
        '["expireDate"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001164, 'seed-tpl-zh-sms-profile-updated', 100001, 0,
        'sms', 'profile_updated', '资料变更短信',
        NULL,
        '您的账户资料已更新，如非本人操作请立即联系客服。',
        '[]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001165, 'seed-tpl-zh-sms-device-removed', 100001, 0,
        'sms', 'device_removed', '设备移除短信',
        NULL,
        '设备 {{deviceName}} 已从您的账户移除，如非本人请立即改密。',
        '["deviceName"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001167, 'seed-tpl-zh-sms-contract-signed', 100001, 0,
        'sms', 'contract_signed', '合同签署短信',
        NULL,
        '合同 {{contractNo}} 已签署完成，可在控制台查看。',
        '["contractNo"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001168, 'seed-tpl-zh-sms-referral-reward', 100001, 0,
        'sms', 'referral_reward', '推荐奖励短信',
        NULL,
        '您邀请的好友已完成首单，奖励 {{amount}} 已到账。',
        '["amount"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001169, 'seed-tpl-zh-sms-privacy-request-received', 100001, 0,
        'sms', 'privacy_request_received', '隐私请求短信',
        NULL,
        '我们已收到您的 {{requestType}} 请求，将在 {{slaDays}} 个工作日内处理。',
        '["requestType","slaDays"]'::jsonb,
        'pending', '待服务商审核通过后启用', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
