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
--   950000000971..950000001008  en-US email templates
--   950000000901..950000000961  en-US SMS templates
--
-- The email and SMS catalogs below mirror the zh-CN locale file one for one:
-- same `template_code` values in the same order, same variables, same business
-- coverage. Email bodies are self-contained responsive HTML; marketing bodies
-- carry an unsubscribe link and SMS marketing bodies carry the "Reply STOP"
-- opt-out tail.

INSERT INTO messaging_template (
    id, uuid, tenant_id, organization_id, channel, template_code, name, subject,
    content, variables_json, approval_status, approval_note, status,
    created_at, updated_at
)
VALUES
    (
        950000000971, 'seed-tpl-en-email-verification-code', 100001, 0,
        'email', 'verification_code', 'Login verification code',
        '[{{appName}}] Your login verification code is {{code}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Sign-in verification</h2><p>Hi,</p><p>You are signing in to <strong>{{appName}}</strong>. Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>The code expires in {{ttlMinutes}} minutes. Never share it with anyone; our staff will never ask for it.</p><p>If this was not you, ignore this email and change your password.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "code", "ttlMinutes"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000972, 'seed-tpl-en-email-register-verification-code', 100001, 0,
        'email', 'register_verification_code', 'Registration verification code',
        '[{{appName}}] Verify your email to finish signing up',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Finish signing up</h2><p>Hi,</p><p>Thanks for signing up for <strong>{{appName}}</strong>. Use this code to finish your registration:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>The code expires in {{ttlMinutes}} minutes. If this was not you, ignore this email.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "code", "ttlMinutes"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000973, 'seed-tpl-en-email-password-reset', 100001, 0,
        'email', 'password_reset', 'Forgot password verification',
        '[{{appName}}] Reset your password',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Reset your password</h2><p>Hi,</p><p>We received a request to reset the password for your <strong>{{appName}}</strong> account. Enter this code on the reset page:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>The code expires in {{ttlMinutes}} minutes.</p><p>If you did not request this, ignore this email and your password will stay unchanged.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "code", "ttlMinutes"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000974, 'seed-tpl-en-email-password-reset-success', 100001, 0,
        'email', 'password_reset_success', 'Password reset confirmation',
        '[{{appName}}] Your password was reset',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Password reset</h2><p>Hi {{userName}},</p><p>Your account password was reset at {{resetTime}}. You can now sign in with the new password.</p><p>If this was not you, <a href="{{securityUrl}}">change your password</a> immediately and contact support.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "resetTime", "securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000975, 'seed-tpl-en-email-password-changed', 100001, 0,
        'email', 'password_changed', 'Password changed confirmation',
        '[{{appName}}] Your password was changed',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Password changed</h2><p>Hi {{userName}},</p><p>Your account password was changed at {{changeTime}}.</p><p>If this was not you, <a href="{{securityUrl}}">secure your account</a> immediately and contact support.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "changeTime", "securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000976, 'seed-tpl-en-email-register-welcome', 100001, 0,
        'email', 'register_welcome', 'Welcome email',
        'Welcome to {{appName}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Your account is ready</h2><p>Hi {{userName}},</p><p>Welcome to <strong>{{appName}}</strong>! Your account has been created. Sign in to the console to get started.</p><p style="margin:24px 0"><a href="{{loginUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Sign in</a></p><p>Need help? Reply to this email or contact our customer success team.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "loginUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000977, 'seed-tpl-en-email-email-verify', 100001, 0,
        'email', 'email_verify', 'Email verification',
        '[{{appName}}] Please verify your email address',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Verify your email</h2><p>Hi {{userName}},</p><p>Click the button below to verify your email address and unlock your account&#39;s full features.</p><p style="margin:24px 0"><a href="{{verifyUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Verify email</a></p><p>The link expires in {{ttlMinutes}} minutes. If this was not you, ignore this email.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "verifyUrl", "ttlMinutes"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000978, 'seed-tpl-en-email-phone-bound', 100001, 0,
        'email', 'phone_bound', 'Phone number bound',
        '[{{appName}}] Your phone number was linked',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Phone number linked</h2><p>Hi {{userName}},</p><p>Your account is now linked to {{phone}}, which you can use for sign-in and security checks.</p><p>If this was not you, contact support immediately.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "phone"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000979, 'seed-tpl-en-email-security-alert', 100001, 0,
        'email', 'security_alert', 'New sign-in alert',
        '[{{appName}}] New sign-in to your account',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">New sign-in</h2><p>Hi {{userName}},</p><p>Your account signed in at {{loginAt}} from {{location}} using {{device}}.</p><p>If this was not you, <a href="{{securityUrl}}">change your password</a> immediately and contact support.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "loginAt", "location", "device", "securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000980, 'seed-tpl-en-email-account-frozen', 100001, 0,
        'email', 'account_frozen', 'Account suspended',
        '[{{appName}}] Your account has been suspended',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Account suspended</h2><p>Hi {{userName}},</p><p>Your account has been suspended because {{reason}}.</p><p>To appeal or restore your account, <a href="{{supportUrl}}">contact support</a>.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "reason", "supportUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000981, 'seed-tpl-en-email-account-unfrozen', 100001, 0,
        'email', 'account_unfrozen', 'Account restored',
        '[{{appName}}] Your account has been restored',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Account restored</h2><p>Hi {{userName}},</p><p>Your account is active again. Thanks for your cooperation.</p><p style="margin:24px 0"><a href="{{loginUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Sign in</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "loginUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000982, 'seed-tpl-en-email-order-created', 100001, 0,
        'email', 'order_created', 'Order created',
        '[{{appName}}] Order {{orderId}} created',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Order created</h2><p>Hi {{userName}},</p><p>Your order {{orderId}} has been created for {{amount}}.</p><p>Please complete payment before it expires, otherwise the order closes automatically.</p><p style="margin:24px 0"><a href="{{payUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Pay now</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "orderId", "userName", "amount", "payUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000983, 'seed-tpl-en-email-order-paid', 100001, 0,
        'email', 'order_paid', 'Order payment receipt',
        'Order {{orderId}} paid successfully',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Payment successful</h2><p>Hi {{userName}},</p><p>Your order {{orderId}} was paid on {{paidAt}} for {{amount}}.</p><p>You can review the order and invoices in the console.</p><p style="margin:24px 0"><a href="{{orderUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View order</a></p><p>Thank you for your business!</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["orderId", "userName", "paidAt", "amount", "orderUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000984, 'seed-tpl-en-email-payment-failed', 100001, 0,
        'email', 'payment_failed', 'Payment failed',
        '[{{appName}}] Payment for order {{orderId}} failed',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Payment failed</h2><p>Hi {{userName}},</p><p>Payment for order {{orderId}} ({{amount}}) did not go through. The payment channel may have timed out or the balance is insufficient.</p><p>Please try again, and contact support if it keeps failing.</p><p style="margin:24px 0"><a href="{{retryUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Retry payment</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "orderId", "userName", "amount", "retryUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000985, 'seed-tpl-en-email-order-shipped', 100001, 0,
        'email', 'order_shipped', 'Order shipped',
        '[{{appName}}] Order {{orderId}} has shipped',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Order shipped</h2><p>Hi {{userName}},</p><p>Your order {{orderId}} has shipped. Tracking number: {{trackingNo}}.</p><p style="margin:24px 0"><a href="{{trackUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Track shipment</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "orderId", "userName", "trackingNo", "trackUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000986, 'seed-tpl-en-email-order-completed', 100001, 0,
        'email', 'order_completed', 'Order completed',
        '[{{appName}}] Order {{orderId}} completed',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Order completed</h2><p>Hi {{userName}},</p><p>Your order {{orderId}} is complete. We look forward to serving you again.</p><p style="margin:24px 0"><a href="{{orderUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Buy again</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "orderId", "userName", "orderUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000987, 'seed-tpl-en-email-order-cancelled', 100001, 0,
        'email', 'order_cancelled', 'Order cancelled',
        '[{{appName}}] Order {{orderId}} cancelled',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Order cancelled</h2><p>Hi {{userName}},</p><p>Your order {{orderId}} has been cancelled. Any payment made will be refunded to the original method.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "orderId", "userName"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000988, 'seed-tpl-en-email-order-refunded', 100001, 0,
        'email', 'order_refunded', 'Refund issued',
        '[{{appName}}] Order {{orderId}} refunded {{amount}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Refund issued</h2><p>Hi {{userName}},</p><p>Your order {{orderId}} was refunded {{amount}}. The funds return to your original payment method, usually within 1-7 business days.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "orderId", "amount", "userName"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000989, 'seed-tpl-en-email-recharge-success', 100001, 0,
        'email', 'recharge_success', 'Top-up successful',
        '[{{appName}}] Top-up successful',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Top-up successful</h2><p>Hi {{userName}},</p><p>Your account was topped up by {{amount}}. Current balance: {{balance}}.</p><p style="margin:24px 0"><a href="{{walletUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View balance</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "amount", "balance", "walletUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000990, 'seed-tpl-en-email-balance-low', 100001, 0,
        'email', 'balance_low', 'Low balance warning',
        '[{{appName}}] Your account balance is low',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Low balance</h2><p>Hi {{userName}},</p><p>Your account balance is down to {{balance}}. Top up now to avoid service interruption.</p><p style="margin:24px 0"><a href="{{rechargeUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Top up now</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "balance", "rechargeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000991, 'seed-tpl-en-email-arrears-notice', 100001, 0,
        'email', 'arrears_notice', 'Arrears notice',
        '[{{appName}}] Account arrears notice',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Arrears notice</h2><p>Hi {{userName}},</p><p>Your account is {{amount}} in arrears. Please pay by {{dueDate}}, otherwise related services will be suspended.</p><p style="margin:24px 0"><a href="{{rechargeUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Pay arrears</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "amount", "dueDate", "rechargeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000992, 'seed-tpl-en-email-invoice-ready', 100001, 0,
        'email', 'invoice_ready', 'Invoice ready',
        '[{{appName}}] Your {{period}} invoice is ready',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Invoice ready</h2><p>Hi {{userName}},</p><p>Your {{period}} invoice is ready for {{amount}}. Please pay by {{dueDate}}.</p><p style="margin:24px 0"><a href="{{invoiceUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View invoice</a></p><p>You can request a formal tax invoice in the console.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "period", "userName", "amount", "dueDate", "invoiceUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000993, 'seed-tpl-en-email-invoice-overdue', 100001, 0,
        'email', 'invoice_overdue', 'Invoice overdue',
        '[{{appName}}] Your invoice is overdue',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Invoice overdue</h2><p>Hi {{userName}},</p><p>Your {{period}} invoice is {{overdueDays}} days overdue for {{amount}}. Please pay as soon as possible to avoid service impact.</p><p style="margin:24px 0"><a href="{{invoiceUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Pay now</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "period", "overdueDays", "amount", "invoiceUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000994, 'seed-tpl-en-email-subscription-activated', 100001, 0,
        'email', 'subscription_activated', 'Subscription activated',
        '[{{appName}}] Your {{planName}} subscription is active',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Subscription active</h2><p>Hi {{userName}},</p><p>Your {{planName}} subscription is now active until {{expireDate}}. It takes effect immediately.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Open console</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "planName", "userName", "expireDate", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000995, 'seed-tpl-en-email-subscription-expiring', 100001, 0,
        'email', 'subscription_expiring', 'Subscription expiring',
        'Your {{planName}} subscription expires on {{expireDate}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Subscription expiring</h2><p>Hi {{userName}},</p><p>Your {{planName}} subscription expires on {{expireDate}} ({{daysLeft}} days left). Renew to avoid service interruption.</p><p style="margin:24px 0"><a href="{{renewUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Renew now</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["planName", "expireDate", "userName", "daysLeft", "renewUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000996, 'seed-tpl-en-email-subscription-expired', 100001, 0,
        'email', 'subscription_expired', 'Subscription expired',
        '[{{appName}}] Your {{planName}} subscription has expired',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Subscription expired</h2><p>Hi {{userName}},</p><p>Your {{planName}} subscription expired on {{expireDate}} and service has been downgraded. Renew to restore full access.</p><p style="margin:24px 0"><a href="{{renewUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Restore access</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "planName", "userName", "expireDate", "renewUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000997, 'seed-tpl-en-email-subscription-renewed', 100001, 0,
        'email', 'subscription_renewed', 'Subscription renewed',
        '[{{appName}}] Your {{planName}} subscription was renewed',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Subscription renewed</h2><p>Hi {{userName}},</p><p>Your {{planName}} subscription was renewed and is valid until {{expireDate}}.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View subscription</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "planName", "userName", "expireDate", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000998, 'seed-tpl-en-email-subscription-cancelled', 100001, 0,
        'email', 'subscription_cancelled', 'Subscription cancelled',
        '[{{appName}}] Your subscription was cancelled',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Subscription cancelled</h2><p>Hi {{userName}},</p><p>Your {{planName}} subscription was cancelled. Service stays active until {{expireDate}} and will not renew automatically.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "planName", "expireDate"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000999, 'seed-tpl-en-email-membership-expiring', 100001, 0,
        'email', 'membership_expiring', 'Membership expiring',
        '[{{appName}}] Your membership is expiring',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Membership expiring</h2><p>Hi {{userName}},</p><p>Your membership expires on {{expireDate}}. Renew to keep your exclusive benefits and discounts.</p><p style="margin:24px 0"><a href="{{renewUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Renew now</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "expireDate", "renewUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001000, 'seed-tpl-en-email-quota-warning', 100001, 0,
        'email', 'quota_warning', 'Quota usage warning',
        '[{{appName}}] {{quotaName}} usage reached {{usagePercent}}%',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Quota usage warning</h2><p>Hi {{userName}},</p><p>Your {{quotaName}} has reached {{usagePercent}}%, with {{remaining}} left. Upgrade your plan or top up to avoid interruption.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Open console</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "quotaName", "usagePercent", "userName", "remaining", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001001, 'seed-tpl-en-email-quota-exhausted', 100001, 0,
        'email', 'quota_exhausted', 'Quota exhausted',
        '[{{appName}}] Your {{quotaName}} quota is used up',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Quota exhausted</h2><p>Hi {{userName}},</p><p>Your {{quotaName}} quota is used up and related calls are now limited. Expand your plan or top up to restore service.</p><p style="margin:24px 0"><a href="{{upgradeUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Upgrade plan</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "quotaName", "userName", "upgradeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001002, 'seed-tpl-en-email-maintenance-notice', 100001, 0,
        'email', 'maintenance_notice', 'Scheduled maintenance',
        '[{{appName}}] Scheduled maintenance notice',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Scheduled maintenance</h2><p>Hi {{userName}},</p><p>{{appName}} will undergo scheduled maintenance starting {{startTime}}, expected to take {{duration}}. Some features may be unavailable during that window.</p><p>We apologize for the inconvenience.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "startTime", "duration"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001003, 'seed-tpl-en-email-release-notice', 100001, 0,
        'email', 'release_notice', 'Release notice',
        '[{{appName}}] Version {{version}} is now live',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">New version released</h2><p>Hi {{userName}},</p><p>{{appName}} version {{version}} is now live, with feature improvements and bug fixes.</p><p style="margin:24px 0"><a href="{{releaseUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">See what&#39;s new</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "version", "userName", "releaseUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001004, 'seed-tpl-en-email-ticket-replied', 100001, 0,
        'email', 'ticket_replied', 'Support ticket reply',
        '[{{appName}}] New reply on ticket {{ticketNo}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Ticket updated</h2><p>Hi {{userName}},</p><p>There is a new reply on your ticket {{ticketNo}}.</p><p style="margin:24px 0"><a href="{{ticketUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View ticket</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "ticketNo", "userName", "ticketUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001005, 'seed-tpl-en-email-partner-approved', 100001, 0,
        'email', 'partner_approved', 'Partner application approved',
        '[{{appName}}] Your partner application was approved',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Application approved</h2><p>Hi {{userName}},</p><p>Congratulations! Your partner application was approved. Sign in to the partner center to get your referral links and commission terms.</p><p style="margin:24px 0"><a href="{{partnerUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Open partner center</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "partnerUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001006, 'seed-tpl-en-email-partner-commission-settled', 100001, 0,
        'email', 'partner_commission_settled', 'Commission settled',
        '[{{appName}}] Commission of {{amount}} settled',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Commission settled</h2><p>Hi {{userName}},</p><p>Your commission of {{amount}} has been settled to your balance. See the details in the partner center.</p><p style="margin:24px 0"><a href="{{partnerUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View details</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "amount", "userName", "partnerUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001007, 'seed-tpl-en-email-marketing-campaign', 100001, 0,
        'email', 'marketing_campaign', 'Marketing campaign',
        '{{campaignTitle}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">{{campaignTitle}}</h2><p>Hi {{userName}},</p><p>{{campaignBody}}</p><p style="margin:24px 0"><a href="{{ctaUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">{{ctaLabel}}</a></p><p style="font-size:12px;color:#64748b">If you no longer want these emails, <a href="{{unsubscribeUrl}}">unsubscribe</a>.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">Sent by {{appName}}. Unsubscribe at any time using the link above.</p></div>',
        '["campaignTitle", "userName", "campaignBody", "ctaUrl", "ctaLabel", "unsubscribeUrl", "appName"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001008, 'seed-tpl-en-email-marketing-promotion', 100001, 0,
        'email', 'marketing_promotion', 'Limited-time promotion',
        '[Limited time] {{campaignTitle}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Limited-time offer</h2><p>Hi {{userName}},</p><p>{{campaignBody}}</p><p>The offer ends {{expireDate}}. Do not miss out.</p><p style="margin:24px 0"><a href="{{ctaUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Join the offer</a></p><p style="font-size:12px;color:#64748b">If you no longer want these emails, <a href="{{unsubscribeUrl}}">unsubscribe</a>.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">Sent by {{appName}}. Unsubscribe at any time using the link above.</p></div>',
        '["campaignTitle", "userName", "campaignBody", "expireDate", "ctaUrl", "unsubscribeUrl", "appName"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000901, 'seed-tpl-en-sms-verification-code', 100001, 0,
        'sms', 'verification_code', 'Sign-in verification code SMS',
        NULL,
        'Your sign-in verification code is {{code}}. It expires in {{ttlMinutes}} minutes. Never share it.',
        '["code", "ttlMinutes"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000902, 'seed-tpl-en-sms-register-verification-code', 100001, 0,
        'sms', 'register_verification_code', 'Registration verification code SMS',
        NULL,
        'Your registration code is {{code}}. It expires in {{ttlMinutes}} minutes.',
        '["code", "ttlMinutes"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000903, 'seed-tpl-en-sms-password-reset', 100001, 0,
        'sms', 'password_reset', 'Password reset code SMS',
        NULL,
        'Your password reset code is {{code}}. If this was not you, ignore it and reset your password.',
        '["code"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000904, 'seed-tpl-en-sms-password-changed', 100001, 0,
        'sms', 'password_changed', 'Password changed SMS',
        NULL,
        'Your account password was changed at {{changeTime}}. If this was not you, contact support now.',
        '["changeTime"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000905, 'seed-tpl-en-sms-register-welcome', 100001, 0,
        'sms', 'register_welcome', 'Welcome SMS',
        NULL,
        'Welcome to {{appName}}. Your account is ready. Sign in to get started.',
        '["appName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000906, 'seed-tpl-en-sms-account-frozen', 100001, 0,
        'sms', 'account_frozen', 'Account suspended SMS',
        NULL,
        'Your account was suspended for {{reason}}. Contact support if you need help.',
        '["reason"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000907, 'seed-tpl-en-sms-security-alert', 100001, 0,
        'sms', 'security_alert', 'Suspicious sign-in SMS',
        NULL,
        'Your account signed in at {{loginTime}} from {{location}}. If this was not you, reset your password.',
        '["loginTime", "location"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000908, 'seed-tpl-en-sms-new-device-login', 100001, 0,
        'sms', 'new_device_login', 'New device sign-in SMS',
        NULL,
        'Your account signed in from a new device: {{device}}. If this was not you, reset your password.',
        '["device"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000909, 'seed-tpl-en-sms-phone-bind-code', 100001, 0,
        'sms', 'phone_bind_code', 'Phone binding code SMS',
        NULL,
        'Your phone binding code is {{code}}. It expires in {{ttlMinutes}} minutes.',
        '["code", "ttlMinutes"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000910, 'seed-tpl-en-sms-phone-rebind-code', 100001, 0,
        'sms', 'phone_rebind_code', 'Phone change code SMS',
        NULL,
        'Your phone number change code is {{code}}. Never share it.',
        '["code"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000911, 'seed-tpl-en-sms-login-mfa-code', 100001, 0,
        'sms', 'login_mfa_code', 'Two-factor login code SMS',
        NULL,
        'Your two-factor login code is {{code}}. It expires in {{ttlMinutes}} minutes.',
        '["code", "ttlMinutes"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000912, 'seed-tpl-en-sms-withdraw-verification-code', 100001, 0,
        'sms', 'withdraw_verification_code', 'Withdrawal code SMS',
        NULL,
        'Your withdrawal verification code is {{code}}. Never share it with anyone.',
        '["code"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000913, 'seed-tpl-en-sms-payment-verification-code', 100001, 0,
        'sms', 'payment_verification_code', 'Payment verification code SMS',
        NULL,
        'Your payment code is {{code}} for {{amount}}. It expires in {{ttlMinutes}} minutes.',
        '["code", "amount", "ttlMinutes"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000914, 'seed-tpl-en-sms-order-created', 100001, 0,
        'sms', 'order_created', 'Order created SMS',
        NULL,
        'Your order {{orderId}} was created for {{amount}}. Please pay to confirm it.',
        '["orderId", "amount"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000915, 'seed-tpl-en-sms-order-paid', 100001, 0,
        'sms', 'order_paid', 'Order paid SMS',
        NULL,
        'Your order {{orderId}} was paid for {{amount}}. Thank you for your business.',
        '["orderId", "amount"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000916, 'seed-tpl-en-sms-payment-failed', 100001, 0,
        'sms', 'payment_failed', 'Payment failed SMS',
        NULL,
        'Payment for order {{orderId}} did not go through. Please retry in the console.',
        '["orderId"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000917, 'seed-tpl-en-sms-order-shipped', 100001, 0,
        'sms', 'order_shipped', 'Order shipped SMS',
        NULL,
        'Your order {{orderId}} has shipped. Tracking number: {{trackingNo}}.',
        '["orderId", "trackingNo"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000918, 'seed-tpl-en-sms-order-completed', 100001, 0,
        'sms', 'order_completed', 'Order completed SMS',
        NULL,
        'Your order {{orderId}} is complete. Thanks for choosing us.',
        '["orderId"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000919, 'seed-tpl-en-sms-order-cancelled', 100001, 0,
        'sms', 'order_cancelled', 'Order cancelled SMS',
        NULL,
        'Your order {{orderId}} was cancelled. Any payment will be refunded to the original method.',
        '["orderId"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000920, 'seed-tpl-en-sms-order-refunded', 100001, 0,
        'sms', 'order_refunded', 'Order refunded SMS',
        NULL,
        'Your order {{orderId}} was refunded {{amount}} to your original payment method.',
        '["orderId", "amount"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000921, 'seed-tpl-en-sms-recharge-success', 100001, 0,
        'sms', 'recharge_success', 'Top-up success SMS',
        NULL,
        'Your account was topped up by {{amount}}. Current balance: {{balance}}.',
        '["amount", "balance"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000922, 'seed-tpl-en-sms-balance-low', 100001, 0,
        'sms', 'balance_low', 'Low balance SMS',
        NULL,
        'Your account balance is down to {{balance}}. Top up now to avoid interruption.',
        '["balance"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000923, 'seed-tpl-en-sms-arrears-notice', 100001, 0,
        'sms', 'arrears_notice', 'Arrears notice SMS',
        NULL,
        'Your account is {{amount}} in arrears. Pay by {{dueDate}} to avoid suspension.',
        '["amount", "dueDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000924, 'seed-tpl-en-sms-service-suspended', 100001, 0,
        'sms', 'service_suspended', 'Service suspended SMS',
        NULL,
        'Your service is suspended due to unpaid balance. It resumes automatically after top-up.',
        '[]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000925, 'seed-tpl-en-sms-invoice-ready', 100001, 0,
        'sms', 'invoice_ready', 'Invoice issued SMS',
        NULL,
        'Your {{period}} invoice is ready for {{amount}}. Pay by {{dueDate}}.',
        '["period", "amount", "dueDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000926, 'seed-tpl-en-sms-invoice-overdue', 100001, 0,
        'sms', 'invoice_overdue', 'Invoice overdue SMS',
        NULL,
        'Your {{period}} invoice is {{overdueDays}} days overdue. Please pay as soon as possible.',
        '["period", "overdueDays"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000927, 'seed-tpl-en-sms-subscription-activated', 100001, 0,
        'sms', 'subscription_activated', 'Subscription activated SMS',
        NULL,
        'Your {{planName}} subscription is active until {{expireDate}}.',
        '["planName", "expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000928, 'seed-tpl-en-sms-subscription-expiring', 100001, 0,
        'sms', 'subscription_expiring', 'Subscription expiring SMS',
        NULL,
        'Your {{planName}} subscription expires on {{expireDate}}. Renew now to avoid interruption.',
        '["planName", "expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000929, 'seed-tpl-en-sms-subscription-expired', 100001, 0,
        'sms', 'subscription_expired', 'Subscription expired SMS',
        NULL,
        'Your {{planName}} subscription has expired and service was downgraded. Renew to restore it.',
        '["planName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000930, 'seed-tpl-en-sms-subscription-renewed', 100001, 0,
        'sms', 'subscription_renewed', 'Subscription renewed SMS',
        NULL,
        'Your {{planName}} subscription was renewed and is valid until {{expireDate}}.',
        '["planName", "expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000931, 'seed-tpl-en-sms-subscription-cancelled', 100001, 0,
        'sms', 'subscription_cancelled', 'Subscription cancelled SMS',
        NULL,
        'Your {{planName}} subscription was cancelled. Service stays active until {{expireDate}}.',
        '["planName", "expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000932, 'seed-tpl-en-sms-plan-changed', 100001, 0,
        'sms', 'plan_changed', 'Plan changed SMS',
        NULL,
        'Your plan was changed to {{planName}}. The new configuration is effective now.',
        '["planName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000933, 'seed-tpl-en-sms-membership-expiring', 100001, 0,
        'sms', 'membership_expiring', 'Membership expiring SMS',
        NULL,
        'Your membership expires on {{expireDate}}. Renew to keep your member benefits.',
        '["expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000934, 'seed-tpl-en-sms-coupon-expiring', 100001, 0,
        'sms', 'coupon_expiring', 'Coupons expiring SMS',
        NULL,
        'You have {{couponCount}} coupons expiring on {{expireDate}}. Use them before they expire.',
        '["couponCount", "expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000935, 'seed-tpl-en-sms-quota-warning', 100001, 0,
        'sms', 'quota_warning', 'Quota warning SMS',
        NULL,
        'Your {{quotaName}} usage has reached {{usagePercent}}. Upgrade your plan or top up now.',
        '["quotaName", "usagePercent"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000936, 'seed-tpl-en-sms-quota-exhausted', 100001, 0,
        'sms', 'quota_exhausted', 'Quota exhausted SMS',
        NULL,
        'Your {{quotaName}} quota is used up and related calls are now limited. Please expand it.',
        '["quotaName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000937, 'seed-tpl-en-sms-rate-limit-triggered', 100001, 0,
        'sms', 'rate_limit_triggered', 'Rate limit alert SMS',
        NULL,
        'Your app {{appName}} hit its rate limit. Check your traffic or adjust the unblock time.',
        '["appName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000938, 'seed-tpl-en-sms-api-key-exhausted', 100001, 0,
        'sms', 'api_key_exhausted', 'API key balance SMS',
        NULL,
        'Your API key {{keyName}} is short on balance. Top up now to keep calls working.',
        '["keyName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000939, 'seed-tpl-en-sms-usage-spike-alert', 100001, 0,
        'sms', 'usage_spike_alert', 'Usage spike alert SMS',
        NULL,
        'Usage for {{serviceName}} jumped {{usagePercent}} in the last hour. Confirm this is expected.',
        '["serviceName", "usagePercent"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000940, 'seed-tpl-en-sms-upstream-failure', 100001, 0,
        'sms', 'upstream_failure', 'Upstream failure SMS',
        NULL,
        'Upstream provider {{providerName}} is failing. Traffic moved to a backup route automatically.',
        '["providerName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000941, 'seed-tpl-en-sms-node-offline', 100001, 0,
        'sms', 'node_offline', 'Node offline alert SMS',
        NULL,
        'Service node {{nodeName}} is offline. Please investigate right away.',
        '["nodeName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000942, 'seed-tpl-en-sms-service-degraded', 100001, 0,
        'sms', 'service_degraded', 'Service degraded SMS',
        NULL,
        '{{serviceName}} triggered its degradation policy. Some features may be affected.',
        '["serviceName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000943, 'seed-tpl-en-sms-release-published', 100001, 0,
        'sms', 'release_published', 'Release published SMS',
        NULL,
        '{{appName}} version {{version}} has been released. See the notes in the console.',
        '["appName", "version"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000944, 'seed-tpl-en-sms-maintenance-notice', 100001, 0,
        'sms', 'maintenance_notice', 'Maintenance notice SMS',
        NULL,
        'Maintenance starts at {{startTime}} and takes about {{duration}}. Some features will be unavailable.',
        '["startTime", "duration"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000945, 'seed-tpl-en-sms-data-export-ready', 100001, 0,
        'sms', 'data_export_ready', 'Export ready SMS',
        NULL,
        'Your data export is ready. Download it from the console within 24 hours.',
        '[]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000946, 'seed-tpl-en-sms-ticket-created', 100001, 0,
        'sms', 'ticket_created', 'Ticket accepted SMS',
        NULL,
        'Your ticket {{ticketNo}} was received. We will get back to you soon.',
        '["ticketNo"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000947, 'seed-tpl-en-sms-ticket-replied', 100001, 0,
        'sms', 'ticket_replied', 'Ticket reply SMS',
        NULL,
        'Your ticket {{ticketNo}} has a new reply. View it in the console.',
        '["ticketNo"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000948, 'seed-tpl-en-sms-ticket-closed', 100001, 0,
        'sms', 'ticket_closed', 'Ticket closed SMS',
        NULL,
        'Your ticket {{ticketNo}} has been closed. Reopen it any time if the issue persists.',
        '["ticketNo"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000949, 'seed-tpl-en-sms-partner-approved', 100001, 0,
        'sms', 'partner_approved', 'Partner approved SMS',
        NULL,
        'Congratulations, you are now a {{appName}} partner. Sign in to the partner center.',
        '["appName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000950, 'seed-tpl-en-sms-partner-rejected', 100001, 0,
        'sms', 'partner_rejected', 'Partner application declined SMS',
        NULL,
        'Sorry, your partner application was declined: {{reason}}.',
        '["reason"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000951, 'seed-tpl-en-sms-partner-commission-settled', 100001, 0,
        'sms', 'partner_commission_settled', 'Commission settled SMS',
        NULL,
        'Your commission of {{amount}} was settled. See the details in the partner center.',
        '["amount"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000952, 'seed-tpl-en-sms-partner-withdraw-success', 100001, 0,
        'sms', 'partner_withdraw_success', 'Partner payout success SMS',
        NULL,
        'Your payout of {{amount}} succeeded. Funds arrive within 1-3 business days.',
        '["amount"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000953, 'seed-tpl-en-sms-partner-withdraw-failed', 100001, 0,
        'sms', 'partner_withdraw_failed', 'Partner payout failed SMS',
        NULL,
        'Your payout of {{amount}} failed and the funds went back to your balance. Contact support.',
        '["amount"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000954, 'seed-tpl-en-sms-marketing-campaign', 100001, 0,
        'sms', 'marketing_campaign', 'Marketing campaign SMS',
        NULL,
        '{{campaignTitle}}: {{ctaUrl}} Reply STOP to opt out.',
        '["campaignTitle", "ctaUrl"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000955, 'seed-tpl-en-sms-marketing-promotion', 100001, 0,
        'sms', 'marketing_promotion', 'Limited-time promotion SMS',
        NULL,
        '{{campaignTitle}}. Offer ends {{expireDate}}. Reply STOP to opt out.',
        '["campaignTitle", "expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000956, 'seed-tpl-en-sms-marketing-recall', 100001, 0,
        'sms', 'marketing_recall', 'Win-back campaign SMS',
        NULL,
        'We miss you. Here is an exclusive offer just for you. Reply STOP to opt out.',
        '[]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000957, 'seed-tpl-en-sms-marketing-new-feature', 100001, 0,
        'sms', 'marketing_new_feature', 'New feature launch SMS',
        NULL,
        '{{appName}} launched {{featureName}}. Try it today. Reply STOP to opt out.',
        '["appName", "featureName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000958, 'seed-tpl-en-sms-marketing-unsubscribed', 100001, 0,
        'sms', 'marketing_unsubscribed', 'Marketing opt-out confirmed SMS',
        NULL,
        'You opted out of {{appName}} marketing texts. You will not receive them again.',
        '["appName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000959, 'seed-tpl-en-sms-content-rejected', 100001, 0,
        'sms', 'content_rejected', 'Content review rejected SMS',
        NULL,
        'Your submission was rejected for {{reason}}. Please revise and resubmit it.',
        '["reason"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000960, 'seed-tpl-en-sms-account-risk-alert', 100001, 0,
        'sms', 'account_risk_alert', 'Account risk alert SMS',
        NULL,
        'Unusual activity was detected on your account. Some features are limited until you verify.',
        '[]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000000961, 'seed-tpl-en-sms-realname-verified', 100001, 0,
        'sms', 'realname_verified', 'Identity verified SMS',
        NULL,
        'Your identity verification is complete. You now have full access.',
        '[]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001050, 'seed-tpl-en-email-api-key-created', 100001, 0,
        'email', 'api_key_created', 'API key created',
        '[{{appName}}] A new API key was created',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">API key created</h2><p>Hi {{userName}},</p><p>A new API key <strong>{{keyName}}</strong> (prefix {{keyPrefix}}) was created for your account on {{createdAt}}.</p><p>Keep it secret and never embed it in client code or a public repository. If this was not you, revoke it now and contact support.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Manage keys</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "keyName", "keyPrefix", "createdAt", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001051, 'seed-tpl-en-email-api-key-revoked', 100001, 0,
        'email', 'api_key_revoked', 'API key revoked',
        '[{{appName}}] API key {{keyName}} was revoked',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">API key revoked</h2><p>Hi {{userName}},</p><p>API key <strong>{{keyName}}</strong> was revoked on {{revokedAt}}. Calls using it will fail immediately.</p><p>If this was a mistake, create a new key in the console and update your application.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Open console</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "keyName", "userName", "revokedAt", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001052, 'seed-tpl-en-email-api-deprecation', 100001, 0,
        'email', 'api_deprecation', 'API endpoint deprecation',
        '[{{appName}}] Endpoint {{endpoint}} is being retired',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Endpoint deprecation</h2><p>Hi {{userName}},</p><p>Endpoint <code>{{endpoint}}</code> will be retired on {{deprecateDate}}.</p><p>Please migrate to {{replacementEndpoint}} before then; calls will error afterwards. See the migration guide for the changes.</p><p style="margin:24px 0"><a href="{{migrationUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Read migration guide</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "endpoint", "userName", "deprecateDate", "replacementEndpoint", "migrationUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001053, 'seed-tpl-en-email-api-rate-limited', 100001, 0,
        'email', 'api_rate_limited', 'Rate limit alert',
        '[{{appName}}] App {{appNameShort}} hit its rate limit',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Rate limit alert</h2><p>Hi {{userName}},</p><p>Your app triggered rate limiting between {{windowStart}} and {{windowEnd}}, peaking at {{peakRpm}} RPM.</p><p>Upgrade your plan for a higher quota, or request a temporary unblock in the console.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View usage</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "appNameShort", "userName", "windowStart", "windowEnd", "peakRpm", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001054, 'seed-tpl-en-email-team-member-invited', 100001, 0,
        'email', 'team_member_invited', 'Team invitation',
        '{{inviterName}} invited you to {{appName}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Team invitation</h2><p>Hi,</p><p>{{inviterName}} invited you to join <strong>{{tenantName}}</strong> on {{appName}} as "{{roleName}}".</p><p style="margin:24px 0"><a href="{{inviteUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Accept invitation</a></p><p>The link is valid for {{ttlDays}} days. If this was not meant for you, please ignore it.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["inviterName", "appName", "tenantName", "roleName", "inviteUrl", "ttlDays"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001055, 'seed-tpl-en-email-team-member-joined', 100001, 0,
        'email', 'team_member_joined', 'Member joined',
        '[{{appName}}] {{memberName}} joined your team',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">New member joined</h2><p>Hi {{userName}},</p><p>{{memberName}} ({{memberEmail}}) accepted the invitation and joined <strong>{{tenantName}}</strong> as "{{roleName}}".</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View members</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "memberName", "userName", "memberEmail", "tenantName", "roleName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001056, 'seed-tpl-en-email-role-changed', 100001, 0,
        'email', 'role_changed', 'Role changed',
        '[{{appName}}] Your role is now {{roleName}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Role changed</h2><p>Hi {{userName}},</p><p>Your role in <strong>{{tenantName}}</strong> was changed to "{{roleName}}". The new permissions apply immediately.</p><p>Contact your team administrator if this looks wrong.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View permissions</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "roleName", "userName", "tenantName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001057, 'seed-tpl-en-email-subuser-created', 100001, 0,
        'email', 'subuser_created', 'Sub-account created',
        '[{{appName}}] Sub-account {{subUserName}} created',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Sub-account created</h2><p>Hi {{userName}},</p><p>You created the sub-account <strong>{{subUserName}}</strong>, ready to assign to team members.</p><p>Sub-accounts have their own credentials; follow least privilege when granting policies.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Manage sub-accounts</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "subUserName", "userName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001058, 'seed-tpl-en-email-seat-limit-reached', 100001, 0,
        'email', 'seat_limit_reached', 'Seat limit reached',
        '[{{appName}}] Your team has reached its seat limit',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Seat limit reached</h2><p>Hi {{userName}},</p><p><strong>{{tenantName}}</strong> has reached its plan limit of {{seatLimit}} seats; no further members can join.</p><p>Upgrade the plan or remove unused seats to add more.</p><p style="margin:24px 0"><a href="{{upgradeUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Upgrade plan</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "tenantName", "seatLimit", "upgradeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001059, 'seed-tpl-en-email-domain-verified', 100001, 0,
        'email', 'domain_verified', 'Domain verified',
        '[{{appName}}] Domain {{domainName}} verified',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Domain verified</h2><p>Hi {{userName}},</p><p>Domain <strong>{{domainName}}</strong> is now verified and can be used to serve traffic and bind applications.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View domains</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "domainName", "userName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001060, 'seed-tpl-en-email-domain-expiring', 100001, 0,
        'email', 'domain_expiring', 'Domain expiring',
        '[{{appName}}] Domain {{domainName}} expires on {{expireDate}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Domain expiring</h2><p>Hi {{userName}},</p><p>Domain <strong>{{domainName}}</strong> expires on {{expireDate}}. DNS resolution stops and dependent services go down if it lapses.</p><p style="margin:24px 0"><a href="{{renewUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Renew now</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "domainName", "expireDate", "userName", "renewUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001061, 'seed-tpl-en-email-ssl-cert-expiring', 100001, 0,
        'email', 'ssl_cert_expiring', 'Certificate expiring',
        '[{{appName}}] Certificate {{certName}} expires on {{expireDate}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Certificate expiring</h2><p>Hi {{userName}},</p><p>Certificate <strong>{{certName}}</strong> (bound to {{domainName}}) expires on {{expireDate}}.</p><p>Renew or replace it to avoid browser security warnings.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Manage certificates</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "certName", "expireDate", "userName", "domainName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001062, 'seed-tpl-en-email-storage-quota-warning', 100001, 0,
        'email', 'storage_quota_warning', 'Storage warning',
        '[{{appName}}] Storage usage reached {{usagePercent}}%',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Storage warning</h2><p>Hi {{userName}},</p><p>Your storage is {{usagePercent}}% full with {{remaining}} remaining.</p><p>New writes fail once it is full; clean up or expand the quota.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Manage storage</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "usagePercent", "userName", "remaining", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001063, 'seed-tpl-en-email-payment-method-added', 100001, 0,
        'email', 'payment_method_added', 'Payment method added',
        '[{{appName}}] A new payment method was added',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Payment method added</h2><p>Hi {{userName}},</p><p>A new payment method was added on {{addedAt}}: {{methodLabel}} ending in {{methodTail}}.</p><p>If this was not you, remove it immediately and contact support.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Manage payment methods</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "addedAt", "methodLabel", "methodTail", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001064, 'seed-tpl-en-email-recharge-failed', 100001, 0,
        'email', 'recharge_failed', 'Top-up failed',
        '[{{appName}}] Top-up of {{amount}} did not complete',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Top-up failed</h2><p>Hi {{userName}},</p><p>Your top-up of {{amount}} did not complete, likely due to a channel timeout or a bank decline.</p><p>Please retry; contact support if it keeps failing.</p><p style="margin:24px 0"><a href="{{rechargeUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Retry top-up</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "amount", "userName", "rechargeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001065, 'seed-tpl-en-email-refund-created', 100001, 0,
        'email', 'refund_created', 'Refund request received',
        '[{{appName}}] Your refund request was received',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Refund request received</h2><p>Hi {{userName}},</p><p>We received your refund request for order {{orderId}}, amount {{amount}}.</p><p>Once approved the funds return to the original payment method, usually within 1-7 business days.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "orderId", "amount"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001066, 'seed-tpl-en-email-invoice-issued', 100001, 0,
        'email', 'invoice_issued', 'Invoice issued',
        '[{{appName}}] Your invoice has been issued',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Invoice issued</h2><p>Hi {{userName}},</p><p>Your invoice has been issued. Invoice number {{invoiceNo}}, amount {{amount}}.</p><p>Download the electronic invoice from the billing center.</p><p style="margin:24px 0"><a href="{{invoiceUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Download invoice</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "invoiceNo", "amount", "invoiceUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001067, 'seed-tpl-en-email-tax-info-required', 100001, 0,
        'email', 'tax_info_required', 'Tax details required',
        '[{{appName}}] Please complete your tax details',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Tax details required</h2><p>Hi {{userName}},</p><p>Your account is missing the tax details needed to issue an invoice.</p><p>Add your legal entity name, tax id and registered address, then resubmit the request.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Complete details</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001068, 'seed-tpl-en-email-contract-signed', 100001, 0,
        'email', 'contract_signed', 'Contract signed',
        '[{{appName}}] Contract {{contractNo}} is fully signed',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Contract signed</h2><p>Hi {{userName}},</p><p>Contract <strong>{{contractNo}}</strong> was signed by both parties and takes effect on {{effectiveDate}}.</p><p>You can download the signed copy from the console.</p><p style="margin:24px 0"><a href="{{contractUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View contract</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "contractNo", "userName", "effectiveDate", "contractUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001069, 'seed-tpl-en-email-trial-ending', 100001, 0,
        'email', 'trial_ending', 'Trial ending',
        '[{{appName}}] Your trial ends on {{expireDate}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Trial ending</h2><p>Hi {{userName}},</p><p>Your trial ends on {{expireDate}}. Afterwards, features above the free allowance are limited.</p><p>Purchase now to keep your current configuration and data.</p><p style="margin:24px 0"><a href="{{upgradeUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Choose a plan</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "expireDate", "userName", "upgradeUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001070, 'seed-tpl-en-email-plan-upgraded', 100001, 0,
        'email', 'plan_upgraded', 'Plan upgraded',
        '[{{appName}}] Upgraded to {{planName}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Plan upgraded</h2><p>Hi {{userName}},</p><p>Your plan was upgraded to <strong>{{planName}}</strong>; the new quotas are effective immediately.</p><p>Amount due for this change: {{amount}}. See the invoice in the console.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View plan</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "planName", "userName", "amount", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001071, 'seed-tpl-en-email-downgrade-scheduled', 100001, 0,
        'email', 'downgrade_scheduled', 'Downgrade scheduled',
        '[{{appName}}] Your plan changes on {{effectiveDate}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Downgrade scheduled</h2><p>Hi {{userName}},</p><p>Your plan will downgrade to {{planName}} on {{effectiveDate}}. Resources above the new plan''s quota will be limited afterwards.</p><p>You can cancel the downgrade before it takes effect.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Manage plan</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "effectiveDate", "userName", "planName", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001072, 'seed-tpl-en-email-subscription-paused', 100001, 0,
        'email', 'subscription_paused', 'Subscription paused',
        '[{{appName}}] Your subscription is paused',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Subscription paused</h2><p>Hi {{userName}},</p><p>Your {{planName}} subscription is paused. Service resumes after {{pauseUntil}}.</p><p>You can resume it immediately from the console.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Resume now</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "planName", "pauseUntil", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001073, 'seed-tpl-en-email-cost-alert', 100001, 0,
        'email', 'cost_alert', 'Budget alert',
        '[{{appName}}] Monthly spend reached {{usagePercent}}% of budget',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Budget alert</h2><p>Hi {{userName}},</p><p>Your monthly budget of {{budget}} is {{usagePercent}}% used; current spend is {{currentCost}}.</p><p>Adjust the budget or alert threshold to avoid overspending.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View billing</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "usagePercent", "userName", "budget", "currentCost", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001074, 'seed-tpl-en-email-membership-upgraded', 100001, 0,
        'email', 'membership_upgraded', 'Membership upgraded',
        '[{{appName}}] You are now a {{levelName}} member',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Membership upgraded</h2><p>Hi {{userName}},</p><p>Congratulations, you are now a <strong>{{levelName}}</strong> member, valid until {{expireDate}}.</p><p>All benefits of that tier are available immediately.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View benefits</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "levelName", "userName", "expireDate", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001075, 'seed-tpl-en-email-coupon-granted', 100001, 0,
        'email', 'coupon_granted', 'Coupon received',
        '[{{appName}}] You received a coupon',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Coupon received</h2><p>Hi {{userName}},</p><p>You received coupon <strong>{{couponName}}</strong>, worth {{discountAmount}} off eligible purchases.</p><p>Valid until {{expireDate}}.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Use it now</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "couponName", "discountAmount", "expireDate", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001076, 'seed-tpl-en-email-points-changed', 100001, 0,
        'email', 'points_changed', 'Points updated',
        '[{{appName}}] Your points balance changed',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Points updated</h2><p>Hi {{userName}},</p><p>Your account {{direction}} {{points}} points; your balance is now {{balance}}.</p><p>Redeem points for benefits in the rewards store.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View points</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "direction", "points", "balance", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001077, 'seed-tpl-en-email-referral-reward', 100001, 0,
        'email', 'referral_reward', 'Referral reward',
        '[{{appName}}] Your referral reward was paid',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Referral reward</h2><p>Hi {{userName}},</p><p>The friend you referred signed up and completed a first order, so {{amount}} was credited to your account.</p><p>Keep inviting to earn more.</p><p style="margin:24px 0"><a href="{{partnerUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Invite more</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "amount", "partnerUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001078, 'seed-tpl-en-email-account-deletion-scheduled', 100001, 0,
        'email', 'account_deletion_scheduled', 'Account deletion scheduled',
        '[{{appName}}] Account deletion scheduled',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Account deletion scheduled</h2><p>Hi {{userName}},</p><p>Your account deletion request was received. The account will be permanently deleted on {{deleteDate}} and the data cannot be recovered.</p><p>To cancel, sign in and revert the request before then.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Cancel deletion</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "deleteDate", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001079, 'seed-tpl-en-email-data-export-ready', 100001, 0,
        'email', 'data_export_ready', 'Data export ready',
        '[{{appName}}] Your data export is ready',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Data export ready</h2><p>Hi {{userName}},</p><p>Your requested data export is ready. Download it from the console.</p><p>The link is valid for {{ttlHours}} hours; request a new export after that.</p><p style="margin:24px 0"><a href="{{exportUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Download data</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "ttlHours", "exportUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001080, 'seed-tpl-en-email-privacy-request-received', 100001, 0,
        'email', 'privacy_request_received', 'Privacy request received',
        '[{{appName}}] Your privacy request was received',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Privacy request received</h2><p>Hi {{userName}},</p><p>We received your {{requestType}} request and will complete it within {{slaDays}} business days.</p><p>We will email you the outcome.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "requestType", "slaDays"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001081, 'seed-tpl-en-email-mfa-enabled', 100001, 0,
        'email', 'mfa_enabled', 'Two-factor enabled',
        '[{{appName}}] Two-factor authentication enabled',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Two-factor enabled</h2><p>Hi {{userName}},</p><p>Two-factor authentication ({{factorName}}) is now enabled; future sign-ins require a second step.</p><p>If this was not you, contact support immediately.</p><p style="margin:24px 0"><a href="{{securityUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Security settings</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "factorName", "securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001082, 'seed-tpl-en-email-mfa-disabled', 100001, 0,
        'email', 'mfa_disabled', 'Two-factor disabled',
        '[{{appName}}] Two-factor authentication disabled',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Two-factor disabled</h2><p>Hi {{userName}},</p><p>Two-factor authentication was disabled on your account, which lowers its security.</p><p>If this was not you, re-enable it and change your password now.</p><p style="margin:24px 0"><a href="{{securityUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Re-enable</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001083, 'seed-tpl-en-email-security-audit-log', 100001, 0,
        'email', 'security_audit_log', 'Security audit summary',
        '[{{appName}}] Your weekly security audit',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Security audit summary</h2><p>Hi {{userName}},</p><p>During {{period}} your account recorded {{eventCount}} security events, {{highRiskCount}} of them high risk.</p><p>Review the log and act on anything you do not recognise.</p><p style="margin:24px 0"><a href="{{auditUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View audit log</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "period", "eventCount", "highRiskCount", "auditUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001084, 'seed-tpl-en-email-login-new-region', 100001, 0,
        'email', 'login_new_region', 'Sign-in from a new region',
        '[{{appName}}] Sign-in from a new region detected',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">New region sign-in</h2><p>Hi {{userName}},</p><p>Your account signed in from {{location}} for the first time at {{loginAt}}, IP {{ipAddress}}.</p><p>If this was not you, change your password and enable two-factor authentication.</p><p style="margin:24px 0"><a href="{{securityUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Protect account</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "location", "loginAt", "ipAddress", "securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001085, 'seed-tpl-en-email-service-outage', 100001, 0,
        'email', 'service_outage', 'Service outage',
        '[{{appName}}] {{serviceName}} is experiencing an outage',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Service outage</h2><p>Hi {{userName}},</p><p>{{serviceName}} suffered an outage starting {{startTime}} ({{severity}}), affecting {{impactScope}}.</p><p>Our engineers are on it; updates follow on the status page.</p><p style="margin:24px 0"><a href="{{statusUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View status</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "serviceName", "userName", "startTime", "severity", "impactScope", "statusUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001086, 'seed-tpl-en-email-service-recovered', 100001, 0,
        'email', 'service_recovered', 'Service recovered',
        '[{{appName}}] {{serviceName}} has recovered',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Service recovered</h2><p>Hi {{userName}},</p><p>{{serviceName}} recovered at {{recoveredAt}}. The incident lasted {{duration}}.</p><p>We will publish a postmortem with the root cause and follow-up work.</p><p style="margin:24px 0"><a href="{{statusUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Read postmortem</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "serviceName", "userName", "recoveredAt", "duration", "statusUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001087, 'seed-tpl-en-email-sla-breach', 100001, 0,
        'email', 'sla_breach', 'SLA not met',
        '[{{appName}}] Service level miss for {{period}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Service level miss</h2><p>Hi {{userName}},</p><p>{{serviceName}} availability for {{period}} was {{availability}}, below the committed {{slaTarget}}.</p><p>Per our service agreement, the corresponding credit is applied to your account automatically.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View credit</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "period", "userName", "serviceName", "availability", "slaTarget", "consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001088, 'seed-tpl-en-email-maintenance-completed', 100001, 0,
        'email', 'maintenance_completed', 'Maintenance completed',
        '[{{appName}}] Maintenance finished early',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Maintenance completed</h2><p>Hi {{userName}},</p><p>Maintenance on {{appName}} finished early at {{completedAt}} and all services are restored.</p><p>Thanks for your patience.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName", "userName", "completedAt"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001130, 'seed-tpl-en-sms-login-new-region', 100001, 0,
        'sms', 'login_new_region', 'New region sign-in SMS',
        NULL,
        'Your account signed in from {{location}} at {{loginTime}}. If this was not you, reset your password now.',
        '["location","loginTime"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001131, 'seed-tpl-en-sms-mfa-enabled', 100001, 0,
        'sms', 'mfa_enabled', 'Two-factor enabled SMS',
        NULL,
        'Two-factor authentication is now on. Future sign-ins need a second step.',
        '[]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001132, 'seed-tpl-en-sms-mfa-disabled', 100001, 0,
        'sms', 'mfa_disabled', 'Two-factor disabled SMS',
        NULL,
        'Two-factor authentication was turned off on your account. Secure it now if this was not you.',
        '[]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001133, 'seed-tpl-en-sms-api-key-created', 100001, 0,
        'sms', 'api_key_created', 'API key created SMS',
        NULL,
        'A new API key {{keyName}} was created. Revoke it now if this was not you.',
        '["keyName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001134, 'seed-tpl-en-sms-api-key-revoked', 100001, 0,
        'sms', 'api_key_revoked', 'API key revoked SMS',
        NULL,
        'API key {{keyName}} was revoked. Calls using it will fail.',
        '["keyName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001135, 'seed-tpl-en-sms-team-member-invited', 100001, 0,
        'sms', 'team_member_invited', 'Team invitation SMS',
        NULL,
        '{{inviterName}} invited you to the {{tenantName}} team. Sign in to review it.',
        '["inviterName","tenantName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001136, 'seed-tpl-en-sms-seat-limit-reached', 100001, 0,
        'sms', 'seat_limit_reached', 'Seat limit SMS',
        NULL,
        'Your team has used all its seats. Upgrade the plan to add members.',
        '[]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001137, 'seed-tpl-en-sms-domain-verified', 100001, 0,
        'sms', 'domain_verified', 'Domain verified SMS',
        NULL,
        'Domain {{domainName}} is verified and ready to use.',
        '["domainName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001138, 'seed-tpl-en-sms-domain-expiring', 100001, 0,
        'sms', 'domain_expiring', 'Domain expiring SMS',
        NULL,
        'Domain {{domainName}} expires on {{expireDate}}. Renew it to keep services online.',
        '["domainName","expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001139, 'seed-tpl-en-sms-ssl-cert-expiring', 100001, 0,
        'sms', 'ssl_cert_expiring', 'Certificate expiring SMS',
        NULL,
        'Certificate {{certName}} expires on {{expireDate}}. Renew it to avoid warnings.',
        '["certName","expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001140, 'seed-tpl-en-sms-storage-quota-warning', 100001, 0,
        'sms', 'storage_quota_warning', 'Storage warning SMS',
        NULL,
        'Storage usage has reached {{usagePercent}}. Clean up or expand the quota.',
        '["usagePercent"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001141, 'seed-tpl-en-sms-payment-method-added', 100001, 0,
        'sms', 'payment_method_added', 'Payment method added SMS',
        NULL,
        'A new payment method was added to your account. Contact support if this was not you.',
        '[]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001142, 'seed-tpl-en-sms-recharge-failed', 100001, 0,
        'sms', 'recharge_failed', 'Top-up failed SMS',
        NULL,
        'Your top-up of {{amount}} did not complete. Please retry or contact support.',
        '["amount"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001143, 'seed-tpl-en-sms-invoice-issued', 100001, 0,
        'sms', 'invoice_issued', 'Invoice issued SMS',
        NULL,
        'Invoice {{invoiceNo}} has been issued. Download it from the billing center.',
        '["invoiceNo"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001144, 'seed-tpl-en-sms-trial-ending', 100001, 0,
        'sms', 'trial_ending', 'Trial ending SMS',
        NULL,
        'Your trial ends on {{expireDate}}. Choose a plan to keep your current setup.',
        '["expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001145, 'seed-tpl-en-sms-plan-changed-success', 100001, 0,
        'sms', 'plan_changed_success', 'Plan changed SMS',
        NULL,
        'Your plan is now {{planName}}. The new quotas apply immediately.',
        '["planName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001146, 'seed-tpl-en-sms-subscription-paused', 100001, 0,
        'sms', 'subscription_paused', 'Subscription paused SMS',
        NULL,
        'Your {{planName}} subscription is paused. Resume it from the console.',
        '["planName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001147, 'seed-tpl-en-sms-cost-alert', 100001, 0,
        'sms', 'cost_alert', 'Budget alert SMS',
        NULL,
        'Monthly spend reached {{usagePercent}} of your budget, currently {{currentCost}}.',
        '["usagePercent","currentCost"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001148, 'seed-tpl-en-sms-coupon-granted', 100001, 0,
        'sms', 'coupon_granted', 'Coupon received SMS',
        NULL,
        'You received coupon {{couponName}}, valid until {{expireDate}}.',
        '["couponName","expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001149, 'seed-tpl-en-sms-account-deletion-scheduled', 100001, 0,
        'sms', 'account_deletion_scheduled', 'Deletion scheduled SMS',
        NULL,
        'Your account will be deleted on {{deleteDate}}. Sign in now to cancel it.',
        '["deleteDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001150, 'seed-tpl-en-sms-service-outage', 100001, 0,
        'sms', 'service_outage', 'Service outage SMS',
        NULL,
        '{{serviceName}} is experiencing an outage. Our engineers are working on it.',
        '["serviceName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001151, 'seed-tpl-en-sms-service-recovered', 100001, 0,
        'sms', 'service_recovered', 'Service recovered SMS',
        NULL,
        '{{serviceName}} has recovered. Thanks for your patience.',
        '["serviceName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001240, 'seed-tpl-en-email-ticket-created', 100001, 0,
        'email', 'ticket_created', 'Ticket created',
        '[{{appName}}] Ticket {{ticketNo}} created',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Ticket created</h2><p>Hi {{userName}},</p><p>Your ticket <strong>{{ticketNo}}</strong> ({{ticketSubject}}) was created. We respond within {{slaHours}} hours.</p><p style="margin:24px 0"><a href="{{ticketUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View ticket</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName","ticketNo","userName","ticketSubject","slaHours","ticketUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001241, 'seed-tpl-en-email-ticket-closed', 100001, 0,
        'email', 'ticket_closed', 'Ticket closed',
        '[{{appName}}] Ticket {{ticketNo}} closed',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Ticket closed</h2><p>Hi {{userName}},</p><p>Ticket <strong>{{ticketNo}}</strong> is closed. If the issue persists, open a new ticket.</p><p style="margin:24px 0"><a href="{{ticketUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Rate support</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName","ticketNo","userName","ticketUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001242, 'seed-tpl-en-email-marketing-recall', 100001, 0,
        'email', 'marketing_recall', 'Welcome back offer',
        '[{{appName}}] A welcome-back gift for you',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Welcome back offer</h2><p>Hi {{userName}},</p><p>We have not seen you in a while. Here is {{discountAmount}} off, valid until {{expireDate}}.</p><p style="margin:24px 0"><a href="{{campaignUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Claim now</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName","userName","discountAmount","expireDate","campaignUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001243, 'seed-tpl-en-email-marketing-new-feature', 100001, 0,
        'email', 'marketing_new_feature', 'New feature',
        '[{{appName}}] {{featureName}} is now available',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">New feature</h2><p>Hi {{userName}},</p><p><strong>{{featureName}}</strong> is live: {{featureSummary}}</p><p style="margin:24px 0"><a href="{{releaseUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Learn more</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName","featureName","userName","featureSummary","releaseUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001244, 'seed-tpl-en-email-marketing-unsubscribed', 100001, 0,
        'email', 'marketing_unsubscribed', 'Unsubscribed',
        '[{{appName}}] You are unsubscribed from marketing email',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Unsubscribed</h2><p>Hi {{userName}},</p><p>We stopped sending marketing email. Account and transactional notices are unaffected.</p><p>You can re-subscribe in notification settings.</p><p style="margin:24px 0"><a href="{{preferencesUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Notification settings</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName","userName","preferencesUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001245, 'seed-tpl-en-email-order-invoice', 100001, 0,
        'email', 'order_invoice', 'Invoice available',
        '[{{appName}}] Invoice available for order {{orderId}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Invoice available</h2><p>Hi {{userName}},</p><p>Order <strong>{{orderId}}</strong> ({{amount}}) is complete and ready for invoicing.</p><p style="margin:24px 0"><a href="{{invoiceUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Request invoice</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName","orderId","userName","amount","invoiceUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001246, 'seed-tpl-en-email-order-delivered', 100001, 0,
        'email', 'order_delivered', 'Service delivered',
        '[{{appName}}] Order {{orderId}} delivered',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Service delivered</h2><p>Hi {{userName}},</p><p>The resources for order <strong>{{orderId}}</strong> are delivered and active. Review them in the console.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View resources</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName","orderId","userName","consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001247, 'seed-tpl-en-email-password-expiring', 100001, 0,
        'email', 'password_expiring', 'Password expiring',
        '[{{appName}}] Your password expires on {{expireDate}}',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Password expiring</h2><p>Hi {{userName}},</p><p>Under our security policy your password expires on {{expireDate}} and must be reset.</p><p style="margin:24px 0"><a href="{{securityUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Change password</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName","expireDate","userName","securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001248, 'seed-tpl-en-email-device-removed', 100001, 0,
        'email', 'device_removed', 'Device removed',
        '[{{appName}}] Device {{deviceName}} removed',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Device removed</h2><p>Hi {{userName}},</p><p>Device <strong>{{deviceName}}</strong> was removed from your account on {{removedAt}} and can no longer sign in.</p><p>If this was not you, change your password now.</p><p style="margin:24px 0"><a href="{{securityUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">Manage devices</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName","deviceName","userName","removedAt","securityUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001249, 'seed-tpl-en-email-profile-updated', 100001, 0,
        'email', 'profile_updated', 'Profile updated',
        '[{{appName}}] Your account profile was updated',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',''PingFang SC'',''Microsoft YaHei'',sans-serif;max-width:600px;margin:0 auto;color:#0f172a;line-height:1.7"><h2 style="font-size:20px;margin:0 0 16px">Profile updated</h2><p>Hi {{userName}},</p><p>Your profile ({{changedFields}}) was updated on {{changedAt}}.</p><p>Contact support immediately if this was not you.</p><p style="margin:24px 0"><a href="{{consoleUrl}}" style="display:inline-block;padding:10px 20px;background:#0369a1;color:#fff;border-radius:6px;text-decoration:none">View profile</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px" /><p style="font-size:12px;color:#64748b;margin:0">This message was sent automatically. Please do not reply; contact support if you need help.</p></div>',
        '["appName","userName","changedFields","changedAt","consoleUrl"]'::jsonb,
        'not_applicable', NULL, 'active',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001180, 'seed-tpl-en-sms-team-member-joined', 100001, 0,
        'sms', 'team_member_joined', 'Member joined SMS',
        NULL,
        '{{memberName}} joined your team {{tenantName}}.',
        '["memberName","tenantName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001181, 'seed-tpl-en-sms-role-changed', 100001, 0,
        'sms', 'role_changed', 'Role changed SMS',
        NULL,
        'Your role in {{tenantName}} is now {{roleName}}.',
        '["tenantName","roleName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001182, 'seed-tpl-en-sms-subuser-created', 100001, 0,
        'sms', 'subuser_created', 'Sub-account created SMS',
        NULL,
        'Sub-account {{subUserName}} was created. Secure it now if this was not you.',
        '["subUserName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001183, 'seed-tpl-en-sms-password-expiring', 100001, 0,
        'sms', 'password_expiring', 'Password expiring SMS',
        NULL,
        'Your password expires on {{expireDate}}. Change it in time.',
        '["expireDate"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001184, 'seed-tpl-en-sms-profile-updated', 100001, 0,
        'sms', 'profile_updated', 'Profile updated SMS',
        NULL,
        'Your profile was updated. Contact support now if this was not you.',
        '[]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001185, 'seed-tpl-en-sms-device-removed', 100001, 0,
        'sms', 'device_removed', 'Device removed SMS',
        NULL,
        'Device {{deviceName}} was removed. Reset your password if this was not you.',
        '["deviceName"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001187, 'seed-tpl-en-sms-contract-signed', 100001, 0,
        'sms', 'contract_signed', 'Contract signed SMS',
        NULL,
        'Contract {{contractNo}} is fully signed. View it in the console.',
        '["contractNo"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001188, 'seed-tpl-en-sms-referral-reward', 100001, 0,
        'sms', 'referral_reward', 'Referral reward SMS',
        NULL,
        'Your referred friend completed a first order. {{amount}} was credited.',
        '["amount"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        950000001189, 'seed-tpl-en-sms-privacy-request-received', 100001, 0,
        'sms', 'privacy_request_received', 'Privacy request SMS',
        NULL,
        'We received your {{requestType}} request and respond within {{slaDays}} business days.',
        '["requestType","slaDays"]'::jsonb,
        'pending', 'Awaiting provider approval', 'draft',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
