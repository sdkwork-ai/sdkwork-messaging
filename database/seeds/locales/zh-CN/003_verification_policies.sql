-- Default verification-code policies for the canonical installation tenant
-- (100001) / organization (0), zh-CN locale set.
--
-- Why this file exists: `messaging_verification_policy` is the contract every
-- verification challenge is created against —
-- `messaging_verification_challenge` holds a composite foreign key on
-- (tenant_id, organization_id, scene_code, channel) referencing this table. With
-- no policy rows a verification challenge cannot be inserted at all, so
-- login / register / password-reset OTP flows fail with a foreign-key error
-- instead of working out of the box. These rows close that gap.
--
-- Contract rules honored here:
--   * DATABASE_SPEC §6.4 — reserved, deterministic ids in the `9500000xxxxx`
--     block and stable uuids, so retries and upgrades stay idempotent.
--   * DATABASE_FRAMEWORK_SPEC §8.2 — the message text is localized, so this
--     lives in `seeds/locales/{locale}/`; en-US has a sibling file with the same
--     (scene_code, channel) keys.
--   * DATABASE_FRAMEWORK_SPEC §8.3 — `ON CONFLICT DO NOTHING` keeps re-seeds
--     idempotent and never overwrites an operator's tuned TTL/attempt values.
--
-- Tuned defaults: short-lived codes for high-risk scenes (password reset,
-- payment), longer windows and more attempts for ordinary sign-in, and one
-- attempt fewer for bulk-ish flows. The operator only needs to adjust these
-- numbers, or the body copy, and the flow works immediately.
--
-- `message_body_pattern` uses the same `{{code}}` / `{{ttlMinutes}}` tokens as
-- the `verification_code` / `password_reset` message templates, so a policy and
-- its channel template stay visually consistent when both are rendered.
--
-- Reserved id block:
--   9500000001050..9500000001063  zh-CN verification policies
-- (the en-US file owns 9500000001070..9500000001083 and keeps the same
--  (scene_code, channel) key set)

INSERT INTO messaging_verification_policy (
    id, uuid, tenant_id, organization_id, scene_code, channel, ttl_seconds,
    max_attempts, message_subject, message_body_pattern, enabled,
    created_at, updated_at
)
VALUES
    -- SMS policies
    (
        9500000001050, 'seed-vpolicy-zh-login-sms', 100001, 0, 'login', 'sms',
        300, 5, NULL,
        '您的登录验证码为 {{code}}，{{ttlMinutes}} 分钟内有效，请勿告知他人。',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001051, 'seed-vpolicy-zh-register-sms', 100001, 0, 'register', 'sms',
        600, 5, NULL,
        '您正在注册账号，验证码为 {{code}}，{{ttlMinutes}} 分钟内有效。',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001052, 'seed-vpolicy-zh-password-reset-sms', 100001, 0, 'password_reset', 'sms',
        300, 3, NULL,
        '您正在重置密码，验证码 {{code}}，{{ttlMinutes}} 分钟内有效，如非本人请忽略。',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001053, 'seed-vpolicy-zh-bind-phone-sms', 100001, 0, 'bind_phone', 'sms',
        300, 5, NULL,
        '您正在绑定手机号，验证码为 {{code}}，{{ttlMinutes}} 分钟内有效。',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001054, 'seed-vpolicy-zh-payment-sms', 100001, 0, 'payment', 'sms',
        180, 3, NULL,
        '您的支付验证码为 {{code}}，{{ttlMinutes}} 分钟内有效，请勿告知他人。',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001055, 'seed-vpolicy-zh-withdraw-sms', 100001, 0, 'withdraw', 'sms',
        180, 3, NULL,
        '您正在发起提现，验证码为 {{code}}，{{ttlMinutes}} 分钟内有效。',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001056, 'seed-vpolicy-zh-login-mfa-sms', 100001, 0, 'login_mfa', 'sms',
        300, 5, NULL,
        '您的登录二次验证码为 {{code}}，{{ttlMinutes}} 分钟内有效。',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    -- Email policies (subject is present because email renders a subject line)
    (
        9500000001057, 'seed-vpolicy-zh-login-email', 100001, 0, 'login', 'email',
        600, 5, '【{{appName}}】您的登录验证码为 {{code}}',
        '<p>您好，</p><p>您正在登录 <strong>{{appName}}</strong>，本次验证码为：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>验证码 {{ttlMinutes}} 分钟内有效。请勿向任何人透露。</p><p>如非本人操作，请忽略本邮件并尽快修改密码。</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001058, 'seed-vpolicy-zh-register-email', 100001, 0, 'register', 'email',
        600, 5, '【{{appName}}】完成注册的验证码',
        '<p>您好，</p><p>感谢您注册 <strong>{{appName}}</strong>，请使用以下验证码完成注册：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>验证码 {{ttlMinutes}} 分钟内有效。</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001059, 'seed-vpolicy-zh-password-reset-email', 100001, 0, 'password_reset', 'email',
        600, 3, '【{{appName}}】重置密码验证码',
        '<p>您好，</p><p>我们收到了重置 <strong>{{appName}}</strong> 账户密码的请求，请在重置页面输入以下验证码：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>验证码 {{ttlMinutes}} 分钟内有效。如非本人操作，请忽略本邮件。</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001060, 'seed-vpolicy-zh-bind-phone-email', 100001, 0, 'bind_phone', 'email',
        600, 5, '【{{appName}}】绑定手机号的验证码',
        '<p>您好，</p><p>您正在为 <strong>{{appName}}</strong> 账户绑定手机号，验证码为：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>验证码 {{ttlMinutes}} 分钟内有效。</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001061, 'seed-vpolicy-zh-payment-email', 100001, 0, 'payment', 'email',
        300, 3, '【{{appName}}】支付验证码',
        '<p>您好，</p><p>您的支付验证码为：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>验证码 {{ttlMinutes}} 分钟内有效。请勿向任何人透露。</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001062, 'seed-vpolicy-zh-withdraw-email', 100001, 0, 'withdraw', 'email',
        300, 3, '【{{appName}}】提现验证码',
        '<p>您好，</p><p>您正在发起提现，验证码为：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>验证码 {{ttlMinutes}} 分钟内有效。如非本人操作，请立即联系客服。</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001063, 'seed-vpolicy-zh-login-mfa-email', 100001, 0, 'login_mfa', 'email',
        600, 5, '【{{appName}}】登录二次验证',
        '<p>您好，</p><p>您的登录二次验证码为：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>验证码 {{ttlMinutes}} 分钟内有效。</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
