-- Default verification-code policies for the canonical installation tenant
-- (100001) / organization (0), en-US locale set.
--
-- Mirrors the zh-CN file: same `scene_code` values, same `channel` values, same
-- TTL and attempt tuning. Only the rendered copy differs, because
-- `message_body_pattern` / `message_subject` are user-facing text.
--
-- An installation seeds exactly ONE locale (an installation language), so this
-- file and its zh-CN sibling are never applied together.

INSERT INTO messaging_verification_policy (
    id, uuid, tenant_id, organization_id, scene_code, channel, ttl_seconds,
    max_attempts, message_subject, message_body_pattern, enabled,
    created_at, updated_at
)
VALUES
    -- SMS policies
    (
        9500000001070, 'seed-vpolicy-en-login-sms', 100001, 0, 'login', 'sms',
        300, 5, NULL,
        'Your sign-in verification code is {{code}}. It expires in {{ttlMinutes}} minutes. Never share it.',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001071, 'seed-vpolicy-en-register-sms', 100001, 0, 'register', 'sms',
        600, 5, NULL,
        'Your registration code is {{code}}. It expires in {{ttlMinutes}} minutes.',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001072, 'seed-vpolicy-en-password-reset-sms', 100001, 0, 'password_reset', 'sms',
        300, 3, NULL,
        'Your password reset code is {{code}}. It expires in {{ttlMinutes}} minutes.',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001073, 'seed-vpolicy-en-bind-phone-sms', 100001, 0, 'bind_phone', 'sms',
        300, 5, NULL,
        'Your phone binding code is {{code}}. It expires in {{ttlMinutes}} minutes.',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001074, 'seed-vpolicy-en-payment-sms', 100001, 0, 'payment', 'sms',
        180, 3, NULL,
        'Your payment verification code is {{code}}. It expires in {{ttlMinutes}} minutes.',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001075, 'seed-vpolicy-en-withdraw-sms', 100001, 0, 'withdraw', 'sms',
        180, 3, NULL,
        'Your withdrawal verification code is {{code}}. It expires in {{ttlMinutes}} minutes.',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001076, 'seed-vpolicy-en-login-mfa-sms', 100001, 0, 'login_mfa', 'sms',
        300, 5, NULL,
        'Your two-factor login code is {{code}}. It expires in {{ttlMinutes}} minutes.',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    -- Email policies
    (
        9500000001077, 'seed-vpolicy-en-login-email', 100001, 0, 'login', 'email',
        600, 5, '[{{appName}}] Your login verification code is {{code}}',
        '<p>Hi,</p><p>You are signing in to <strong>{{appName}}</strong>. Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>The code expires in {{ttlMinutes}} minutes. Never share it with anyone.</p><p>If this was not you, ignore this email and change your password.</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001078, 'seed-vpolicy-en-register-email', 100001, 0, 'register', 'email',
        600, 5, '[{{appName}}] Verify your email to finish signing up',
        '<p>Hi,</p><p>Thanks for signing up for <strong>{{appName}}</strong>. Use this code to finish your registration:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>The code expires in {{ttlMinutes}} minutes.</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001079, 'seed-vpolicy-en-password-reset-email', 100001, 0, 'password_reset', 'email',
        600, 3, '[{{appName}}] Reset your password',
        '<p>Hi,</p><p>We received a request to reset the password for your <strong>{{appName}}</strong> account. Enter this code on the reset page:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>The code expires in {{ttlMinutes}} minutes. If you did not request this, ignore this email.</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001080, 'seed-vpolicy-en-bind-phone-email', 100001, 0, 'bind_phone', 'email',
        600, 5, '[{{appName}}] Verify the phone number you are linking',
        '<p>Hi,</p><p>You are linking a phone number to your <strong>{{appName}}</strong> account. Your code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>The code expires in {{ttlMinutes}} minutes.</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001081, 'seed-vpolicy-en-payment-email', 100001, 0, 'payment', 'email',
        300, 3, '[{{appName}}] Payment verification code',
        '<p>Hi,</p><p>Your payment verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>The code expires in {{ttlMinutes}} minutes. Never share it with anyone.</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001082, 'seed-vpolicy-en-withdraw-email', 100001, 0, 'withdraw', 'email',
        300, 3, '[{{appName}}] Withdrawal verification code',
        '<p>Hi,</p><p>You are requesting a withdrawal. Your code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>The code expires in {{ttlMinutes}} minutes. If this was not you, contact support immediately.</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        9500000001083, 'seed-vpolicy-en-login-mfa-email', 100001, 0, 'login_mfa', 'email',
        600, 5, '[{{appName}}] Your two-factor login code',
        '<p>Hi,</p><p>Your two-factor login code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0369a1">{{code}}</p><p>The code expires in {{ttlMinutes}} minutes.</p>',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;
