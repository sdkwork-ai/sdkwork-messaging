use sdkwork_messaging_delivery_service::{
    MessagingAudienceKind, MessagingChannel, MessagingDeliveryStatus, MessagingDirectChannel,
    MessagingOutboundMessageRequest, MessagingPushDeliveryRequest, MessagingPushPlatform,
    MessagingPushProvider, MessagingVerificationChallengeStatus, MessagingVerificationCodeRequest,
    SDKWORK_MESSAGING_DOMAIN,
};

#[test]
fn exposes_app_notification_announcement_and_push_contracts() {
    assert_eq!(SDKWORK_MESSAGING_DOMAIN, "messaging");

    let request = MessagingPushDeliveryRequest {
        device_id: "device_1".to_string(),
        idempotency_key: "push-order-1".to_string(),
        title: "Order shipped".to_string(),
        body: "Your package is on the way.".to_string(),
        audience_kind: MessagingAudienceKind::ExplicitUsers,
        channel: MessagingChannel::AppPush,
    };

    assert_eq!(request.channel, MessagingChannel::AppPush);
    assert_eq!(request.audience_kind, MessagingAudienceKind::ExplicitUsers);
    assert_eq!(MessagingDeliveryStatus::Delivered.as_str(), "delivered");
    assert_eq!(MessagingDeliveryStatus::Opened.as_str(), "opened");
    assert_eq!(MessagingDeliveryStatus::Expired.as_str(), "expired");

    let sms = MessagingOutboundMessageRequest {
        body: "Your code is 123456".to_string(),
        channel: MessagingDirectChannel::Sms,
        idempotency_key: "sms-1".to_string(),
        subject: None,
        target: "+15550000000".to_string(),
        template_code: Some("verification_code".to_string()),
        provider: Some("tencent".to_string()),
        provider_template_id: Some("1234567".to_string()),
    };
    assert_eq!(sms.channel, MessagingDirectChannel::Sms);
    assert_eq!(sms.provider_template_id.as_deref(), Some("1234567"));

    let verification = MessagingVerificationCodeRequest {
        channel: MessagingDirectChannel::Email,
        scene_code: "login".to_string(),
        target: "user@example.com".to_string(),
    };
    assert_eq!(verification.channel, MessagingDirectChannel::Email);

    assert_eq!(
        MessagingVerificationChallengeStatus::Pending.as_str(),
        "pending"
    );
    assert_eq!(
        MessagingVerificationChallengeStatus::Verified.as_str(),
        "verified"
    );
    assert_eq!(
        MessagingVerificationChallengeStatus::Locked.as_str(),
        "locked"
    );
    assert_eq!(
        MessagingVerificationChallengeStatus::Expired.as_str(),
        "expired"
    );
}

#[test]
fn models_direct_delivery_and_app_push_without_reusing_generic_channels() {
    assert_eq!(MessagingDirectChannel::Sms.as_str(), "sms");
    assert_eq!(MessagingDirectChannel::Email.as_str(), "email");
    assert_eq!(MessagingPushPlatform::Ios.as_str(), "ios");
    assert_eq!(MessagingPushPlatform::Android.as_str(), "android");
    assert_eq!(MessagingPushPlatform::Web.as_str(), "web");
    assert_eq!(MessagingPushProvider::Apns.as_str(), "apns");
    assert_eq!(MessagingPushProvider::Fcm.as_str(), "fcm");
    assert_eq!(MessagingPushProvider::WebPush.as_str(), "web_push");
    assert_eq!(MessagingPushProvider::Vendor.as_str(), "vendor");
}
