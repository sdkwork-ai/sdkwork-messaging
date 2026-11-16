//! Provider initialization presets for the notification channels.
//!
//! The installation seeds (`database/seeds/common/002_email_provider_defaults.sql`
//! and `003_sms_provider_defaults.sql`) ship one account, one sender/signature
//! identity, and four scenario routing rules per supported provider. A deployed
//! database normally receives them through the explicit install lifecycle
//! (`cloudrouterctl install|upgrade|ensure`). This module gives the admin API the
//! same presets so an operator can repair or initialize one provider from the
//! console — and so a database that was installed before the lifecycle converged
//! the Messaging module can be brought back to a usable state without a redeploy.
//!
//! Contract with the seeds:
//! - `config_json` strings are byte-identical to the SQL literals so the
//!   checksum-based seed history and the API initialize path converge on the
//!   same config. `provider_presets_match_seed_sql` enforces it.
//! - Array order is the delivery fallback priority: the default provider is
//!   first, matching the seeded `chain_json` order.
//! - Initialization never overwrites operator edits: missing config keys are
//!   merged in, existing identities are reused, and routing chains only gain the
//!   missing step.

use serde_json::Value;

/// Canonical per-scenario routing vocabulary, identical to the frontend catalog
/// and to the seeded `messaging_*_send_rule.scenario` rows.
pub use crate::ports::SEND_RULE_SCENARIOS;

#[derive(Clone, Copy, Debug)]
pub struct EmailProviderDefault {
    pub provider: &'static str,
    pub name: &'static str,
    pub config_json: &'static str,
    pub enabled: bool,
    pub receive_enabled: bool,
    pub from_address: &'static str,
    pub from_name: &'static str,
}

/// Email provider presets in delivery priority order.
///
/// `enterprise_mail` (Tencent Enterprise Mail) is the installation default: it
/// is the only enabled account/sender and the head of every scenario chain.
/// The remaining providers stay disabled until an operator configures them.
pub const EMAIL_PROVIDER_DEFAULTS: [EmailProviderDefault; 13] = [
    EmailProviderDefault {
        provider: "enterprise_mail",
        name: "Enterprise Mail",
        config_json: r#"{"transport":"smtp","host":"smtp.exmail.qq.com","port":"465","encryption":"ssl","receiveProtocol":"imap","imapHost":"imap.exmail.qq.com","imapPort":"993","imapEncryption":"ssl","pop3Host":"pop.exmail.qq.com","pop3Port":"995","pop3Encryption":"ssl","username":"no-reply@birdcoder.com"}"#,
        enabled: true,
        receive_enabled: true,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder",
    },
    EmailProviderDefault {
        provider: "tencent_mail",
        name: "Tencent Mail",
        config_json: r#"{"transport":"smtp","host":"smtp.qq.com","port":"465","encryption":"ssl","receiveProtocol":"imap","imapHost":"imap.qq.com","imapPort":"993","imapEncryption":"ssl","pop3Host":"pop.qq.com","pop3Port":"995","pop3Encryption":"ssl"}"#,
        enabled: false,
        receive_enabled: false,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder Notifications",
    },
    EmailProviderDefault {
        provider: "mail_139",
        name: "139 Mail",
        config_json: r#"{"transport":"smtp","host":"smtp.139.com","port":"465","encryption":"ssl","receiveProtocol":"imap","imapHost":"imap.139.com","imapPort":"993","imapEncryption":"ssl","pop3Host":"pop.139.com","pop3Port":"995","pop3Encryption":"ssl"}"#,
        enabled: false,
        receive_enabled: false,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder Notifications",
    },
    EmailProviderDefault {
        provider: "gmail",
        name: "Gmail",
        config_json: r#"{"transport":"smtp","host":"smtp.gmail.com","port":"465","encryption":"ssl","receiveProtocol":"imap","imapHost":"imap.gmail.com","imapPort":"993","imapEncryption":"ssl","pop3Host":"pop.gmail.com","pop3Port":"995","pop3Encryption":"ssl"}"#,
        enabled: false,
        receive_enabled: false,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder Notifications",
    },
    EmailProviderDefault {
        provider: "microsoft",
        name: "Microsoft Mail",
        config_json: r#"{"transport":"smtp","host":"smtp.office365.com","port":"587","encryption":"starttls","receiveProtocol":"imap","imapHost":"outlook.office365.com","imapPort":"993","imapEncryption":"ssl","pop3Host":"outlook.office365.com","pop3Port":"995","pop3Encryption":"ssl"}"#,
        enabled: false,
        receive_enabled: false,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder Notifications",
    },
    EmailProviderDefault {
        provider: "aliyun",
        name: "Alibaba Cloud DirectMail",
        config_json: r#"{"transport":"smtp","host":"smtpdm.aliyun.com","port":"465","encryption":"ssl","receiveProtocol":"none"}"#,
        enabled: false,
        receive_enabled: false,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder Notifications",
    },
    EmailProviderDefault {
        provider: "tencent",
        name: "Tencent Cloud SES",
        config_json: r#"{"transport":"smtp","host":"smtp.qcloudmail.com","port":"465","encryption":"ssl","receiveProtocol":"none"}"#,
        enabled: false,
        receive_enabled: false,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder Notifications",
    },
    EmailProviderDefault {
        provider: "amazon_ses",
        name: "Amazon SES",
        config_json: r#"{"transport":"smtp","host":"email-smtp.us-east-1.amazonaws.com","port":"465","encryption":"ssl","region":"us-east-1","receiveProtocol":"none"}"#,
        enabled: false,
        receive_enabled: false,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder Notifications",
    },
    EmailProviderDefault {
        provider: "sendgrid",
        name: "SendGrid",
        config_json: r#"{"transport":"http_api","apiBaseUrl":"https://api.sendgrid.com","receiveProtocol":"none"}"#,
        enabled: false,
        receive_enabled: false,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder Notifications",
    },
    EmailProviderDefault {
        provider: "mailgun",
        name: "Mailgun",
        config_json: r#"{"transport":"http_api","apiBaseUrl":"https://api.mailgun.net","region":"us","receiveProtocol":"none"}"#,
        enabled: false,
        receive_enabled: false,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder Notifications",
    },
    EmailProviderDefault {
        provider: "postmark",
        name: "Postmark",
        config_json: r#"{"transport":"http_api","apiBaseUrl":"https://api.postmarkapp.com","receiveProtocol":"none"}"#,
        enabled: false,
        receive_enabled: false,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder Notifications",
    },
    EmailProviderDefault {
        provider: "resend",
        name: "Resend",
        config_json: r#"{"transport":"http_api","apiBaseUrl":"https://api.resend.com","receiveProtocol":"none"}"#,
        enabled: false,
        receive_enabled: false,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder Notifications",
    },
    EmailProviderDefault {
        provider: "smtp",
        name: "Generic SMTP",
        config_json: r#"{"transport":"smtp","host":"","port":"465","encryption":"ssl","receiveProtocol":"none"}"#,
        enabled: false,
        receive_enabled: false,
        from_address: "no-reply@birdcoder.com",
        from_name: "BirdCoder Notifications",
    },
];

#[derive(Clone, Copy, Debug)]
pub struct SmsProviderDefault {
    pub provider: &'static str,
    pub name: &'static str,
    pub config_json: &'static str,
    pub enabled: bool,
    pub sign_name: &'static str,
}

/// SMS provider presets in delivery priority order.
///
/// `tencent` (Tencent Cloud SMS) is the installation default: its account,
/// signature, and all four scenario rules start enabled.
pub const SMS_PROVIDER_DEFAULTS: [SmsProviderDefault; 8] = [
    SmsProviderDefault {
        provider: "tencent",
        name: "Tencent Cloud SMS",
        config_json: r#"{"region":"ap-guangzhou","endpoint":"https://sms.tencentcloudapi.com"}"#,
        enabled: true,
        sign_name: "BirdCoder",
    },
    SmsProviderDefault {
        provider: "aliyun",
        name: "Alibaba Cloud SMS",
        config_json: r#"{"region":"cn-hangzhou","endpoint":"https://dysmsapi.aliyuncs.com"}"#,
        enabled: false,
        sign_name: "BirdCoder",
    },
    SmsProviderDefault {
        provider: "huawei",
        name: "Huawei Cloud SMS",
        config_json: r#"{"region":"cn-north-4","endpoint":"https://smsapi.cn-north-4.myhuaweicloud.com"}"#,
        enabled: false,
        sign_name: "BirdCoder",
    },
    SmsProviderDefault {
        provider: "yuntongxun",
        name: "Ronglian Cloud",
        config_json: r#"{"endpoint":"https://app.cloopen.com:8883"}"#,
        enabled: false,
        sign_name: "BirdCoder",
    },
    SmsProviderDefault {
        provider: "submail",
        name: "SUBMAIL",
        config_json: r#"{"endpoint":"https://api-v4.mysubmail.com"}"#,
        enabled: false,
        sign_name: "BirdCoder",
    },
    SmsProviderDefault {
        provider: "chuanglan",
        name: "Chuanglan 253",
        config_json: r#"{"endpoint":"https://smssh1.253.com"}"#,
        enabled: false,
        sign_name: "BirdCoder",
    },
    SmsProviderDefault {
        provider: "twilio",
        name: "Twilio",
        config_json: r#"{"apiBaseUrl":"https://api.twilio.com"}"#,
        enabled: false,
        sign_name: "BirdCoder",
    },
    SmsProviderDefault {
        provider: "generic_http",
        name: "Generic HTTP SMS",
        config_json: r#"{}"#,
        enabled: false,
        sign_name: "BirdCoder",
    },
];

pub fn email_provider_default(provider: &str) -> Option<&'static EmailProviderDefault> {
    EMAIL_PROVIDER_DEFAULTS
        .iter()
        .find(|preset| preset.provider == provider)
}

pub fn sms_provider_default(provider: &str) -> Option<&'static SmsProviderDefault> {
    SMS_PROVIDER_DEFAULTS
        .iter()
        .find(|preset| preset.provider == provider)
}

/// Delivery priority of an email provider (`0` = default). Unknown providers
/// sort last so an operator-defined account never displaces the seeded order.
pub fn email_provider_priority(provider: &str) -> usize {
    EMAIL_PROVIDER_DEFAULTS
        .iter()
        .position(|preset| preset.provider == provider)
        .unwrap_or(usize::MAX)
}

pub fn sms_provider_priority(provider: &str) -> usize {
    SMS_PROVIDER_DEFAULTS
        .iter()
        .position(|preset| preset.provider == provider)
        .unwrap_or(usize::MAX)
}

/// Parses a preset config literal into the JSON value stored in `config_json`.
///
/// # Panics
///
/// The literals are compile-time constants validated by the module tests; a
/// malformed one is a programming error, not a runtime input condition.
pub fn preset_config(preset_json: &'static str) -> Value {
    serde_json::from_str(preset_json).expect("provider preset config JSON is valid")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::{parse_email_provider, parse_sms_provider};
    use std::collections::BTreeSet;

    const EMAIL_SEED: &str =
        include_str!("../../../../database/seeds/common/002_email_provider_defaults.sql");
    const SMS_SEED: &str =
        include_str!("../../../../database/seeds/common/003_sms_provider_defaults.sql");

    #[test]
    fn every_wire_provider_has_exactly_one_preset() {
        let email: BTreeSet<&str> = EMAIL_PROVIDER_DEFAULTS.iter().map(|p| p.provider).collect();
        assert_eq!(email.len(), EMAIL_PROVIDER_DEFAULTS.len());
        assert_eq!(EMAIL_PROVIDER_DEFAULTS.len(), 13);
        for provider in [
            "smtp",
            "enterprise_mail",
            "aliyun",
            "tencent",
            "tencent_mail",
            "mail_139",
            "gmail",
            "microsoft",
            "sendgrid",
            "mailgun",
            "amazon_ses",
            "postmark",
            "resend",
        ] {
            assert_eq!(parse_email_provider(provider).unwrap(), provider);
            assert!(
                email_provider_default(provider).is_some(),
                "missing email preset for {provider}"
            );
        }

        let sms: BTreeSet<&str> = SMS_PROVIDER_DEFAULTS.iter().map(|p| p.provider).collect();
        assert_eq!(sms.len(), SMS_PROVIDER_DEFAULTS.len());
        assert_eq!(SMS_PROVIDER_DEFAULTS.len(), 8);
        for provider in [
            "aliyun",
            "tencent",
            "huawei",
            "yuntongxun",
            "submail",
            "chuanglan",
            "twilio",
            "generic_http",
        ] {
            assert_eq!(parse_sms_provider(provider).unwrap(), provider);
            assert!(
                sms_provider_default(provider).is_some(),
                "missing sms preset for {provider}"
            );
        }
    }

    #[test]
    fn preset_configs_are_json_objects() {
        for preset in EMAIL_PROVIDER_DEFAULTS {
            assert!(
                preset_config(preset.config_json).is_object(),
                "{} preset must be a JSON object",
                preset.provider
            );
        }
        for preset in SMS_PROVIDER_DEFAULTS {
            assert!(
                preset_config(preset.config_json).is_object(),
                "{} preset must be a JSON object",
                preset.provider
            );
        }
    }

    #[test]
    fn installation_defaults_are_tencent_enterprise_mail_and_tencent_cloud_sms() {
        assert_eq!(EMAIL_PROVIDER_DEFAULTS[0].provider, "enterprise_mail");
        let enterprise = &EMAIL_PROVIDER_DEFAULTS[0];
        assert!(enterprise.enabled);
        assert!(enterprise.receive_enabled);
        assert_eq!(enterprise.from_address, "no-reply@birdcoder.com");
        assert_eq!(
            preset_config(enterprise.config_json)["host"],
            "smtp.exmail.qq.com"
        );
        assert!(
            EMAIL_PROVIDER_DEFAULTS[1..]
                .iter()
                .all(|preset| !preset.enabled && !preset.receive_enabled),
            "non-default email providers stay disabled until configured"
        );

        assert_eq!(SMS_PROVIDER_DEFAULTS[0].provider, "tencent");
        let tencent = &SMS_PROVIDER_DEFAULTS[0];
        assert!(tencent.enabled);
        assert_eq!(
            preset_config(tencent.config_json)["endpoint"],
            "https://sms.tencentcloudapi.com"
        );
        assert_eq!(preset_config(tencent.config_json)["region"], "ap-guangzhou");
        assert!(
            SMS_PROVIDER_DEFAULTS[1..]
                .iter()
                .all(|preset| !preset.enabled),
            "non-default sms providers stay disabled until configured"
        );
    }

    /// The presets are initialization data owned by the seeds; the API path must
    /// never drift from them. Every provider, display name, and config literal
    /// must appear verbatim in the canonical seed SQL.
    #[test]
    fn provider_presets_match_seed_sql() {
        for preset in EMAIL_PROVIDER_DEFAULTS {
            assert!(
                EMAIL_SEED.contains(preset.config_json),
                "email seed is missing the {} config preset",
                preset.provider
            );
            assert!(
                EMAIL_SEED.contains(&format!("'{}'", preset.name)),
                "email seed is missing the {} display name",
                preset.name
            );
            assert!(
                EMAIL_SEED.contains(&format!("'{}'", preset.provider)),
                "email seed is missing the {} provider id",
                preset.provider
            );
        }
        for preset in SMS_PROVIDER_DEFAULTS {
            assert!(
                SMS_SEED.contains(preset.config_json),
                "sms seed is missing the {} config preset",
                preset.provider
            );
            assert!(
                SMS_SEED.contains(&format!("'{}'", preset.name)),
                "sms seed is missing the {} display name",
                preset.name
            );
            assert!(
                SMS_SEED.contains(&format!("'{}'", preset.provider)),
                "sms seed is missing the {} provider id",
                preset.provider
            );
        }
    }

    #[test]
    fn scenario_vocabulary_matches_the_seed() {
        for scenario in SEND_RULE_SCENARIOS {
            assert!(
                EMAIL_SEED.contains(&format!("'{scenario}'")),
                "email seed must cover scenario {scenario}"
            );
            assert!(
                SMS_SEED.contains(&format!("'{scenario}'")),
                "sms seed must cover scenario {scenario}"
            );
        }
    }

    #[test]
    fn priority_order_puts_the_default_provider_first() {
        assert_eq!(email_provider_priority("enterprise_mail"), 0);
        assert_eq!(sms_provider_priority("tencent"), 0);
        assert!(email_provider_priority("smtp") > email_provider_priority("tencent_mail"));
        assert_eq!(email_provider_priority("unknown"), usize::MAX);
        assert_eq!(sms_provider_priority("unknown"), usize::MAX);
    }
}
