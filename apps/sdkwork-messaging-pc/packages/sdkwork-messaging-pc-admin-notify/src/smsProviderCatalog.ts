/**
 * Catalog of well-known SMS delivery providers supported by the multi-provider
 * SMS channel configuration. Mirrors `emailProviderCatalog.ts`: each entry
 * presets the non-secret config fields (credentials, endpoints, regions) and
 * labels the secret material stored for the account. Delivery transports are
 * a follow-up concern — this catalog only shapes the admin configuration
 * surface.
 */

import type { MessagingEmailSendScenario, MessagingSmsProvider } from "./notifyAdminService";

export interface SmsProviderFieldSpec {
  /** Config JSON key this field populates. */
  key: string;
  /** i18n key of the field label (`admin.notify.sms.fields.<key>`). */
  labelKey: string;
  /** Optional preset value applied on provider pick. */
  preset?: string;
  /** Optional i18n key of the placeholder. */
  placeholderKey?: string;
}

export interface SmsProviderCatalogEntry {
  provider: MessagingSmsProvider;
  /** i18n key of the display name (`admin.notify.smsProviders.<id>.name`). */
  nameKey: string;
  /** i18n key of the short provider description. */
  descriptionKey: string;
  /** Non-secret credential/endpoint fields rendered for this provider. */
  fields: readonly SmsProviderFieldSpec[];
  /** i18n key describing the secret material stored for this provider. */
  secretLabelKey: string;
}

export const SMS_PROVIDER_CATALOG: readonly SmsProviderCatalogEntry[] = [
  {
    provider: "aliyun",
    nameKey: "admin.notify.smsProviders.aliyun.name",
    descriptionKey: "admin.notify.smsProviders.aliyun.description",
    fields: [
      { key: "accessKeyId", labelKey: "admin.notify.sms.fields.accessKeyId" },
      { key: "region", labelKey: "admin.notify.sms.fields.region", preset: "cn-hangzhou" },
    ],
    secretLabelKey: "admin.notify.sms.secretLabel.accessKeySecret",
  },
  {
    provider: "tencent",
    nameKey: "admin.notify.smsProviders.tencent.name",
    descriptionKey: "admin.notify.smsProviders.tencent.description",
    fields: [
      { key: "secretId", labelKey: "admin.notify.sms.fields.secretId" },
      { key: "appId", labelKey: "admin.notify.sms.fields.appId", placeholderKey: "admin.notify.sms.fields.appIdPlaceholder" },
      { key: "region", labelKey: "admin.notify.sms.fields.region", preset: "ap-guangzhou" },
    ],
    secretLabelKey: "admin.notify.sms.secretLabel.secretKey",
  },
  {
    provider: "huawei",
    nameKey: "admin.notify.smsProviders.huawei.name",
    descriptionKey: "admin.notify.smsProviders.huawei.description",
    fields: [
      { key: "appKey", labelKey: "admin.notify.sms.fields.appKey" },
      {
        key: "endpoint",
        labelKey: "admin.notify.sms.fields.endpoint",
        preset: "https://smsapi.cn-north-4.myhuaweicloud.com",
      },
    ],
    secretLabelKey: "admin.notify.sms.secretLabel.appSecret",
  },
  {
    provider: "yuntongxun",
    nameKey: "admin.notify.smsProviders.yuntongxun.name",
    descriptionKey: "admin.notify.smsProviders.yuntongxun.description",
    fields: [
      { key: "accountSid", labelKey: "admin.notify.sms.fields.accountSid" },
      { key: "appId", labelKey: "admin.notify.sms.fields.appId", placeholderKey: "admin.notify.sms.fields.appIdPlaceholder" },
      {
        key: "endpoint",
        labelKey: "admin.notify.sms.fields.endpoint",
        preset: "https://app.cloopen.com:8883",
      },
    ],
    secretLabelKey: "admin.notify.sms.secretLabel.authToken",
  },
  {
    provider: "submail",
    nameKey: "admin.notify.smsProviders.submail.name",
    descriptionKey: "admin.notify.smsProviders.submail.description",
    fields: [{ key: "appId", labelKey: "admin.notify.sms.fields.appId" }],
    secretLabelKey: "admin.notify.sms.secretLabel.appKey",
  },
  {
    provider: "chuanglan",
    nameKey: "admin.notify.smsProviders.chuanglan.name",
    descriptionKey: "admin.notify.smsProviders.chuanglan.description",
    fields: [{ key: "account", labelKey: "admin.notify.sms.fields.account" }],
    secretLabelKey: "admin.notify.sms.secretLabel.password",
  },
  {
    provider: "twilio",
    nameKey: "admin.notify.smsProviders.twilio.name",
    descriptionKey: "admin.notify.smsProviders.twilio.description",
    fields: [
      { key: "accountSid", labelKey: "admin.notify.sms.fields.accountSid" },
      {
        key: "apiBaseUrl",
        labelKey: "admin.notify.sms.fields.apiBaseUrl",
        preset: "https://api.twilio.com",
      },
    ],
    secretLabelKey: "admin.notify.sms.secretLabel.authToken",
  },
  {
    provider: "generic_http",
    nameKey: "admin.notify.smsProviders.generic_http.name",
    descriptionKey: "admin.notify.smsProviders.generic_http.description",
    fields: [
      { key: "endpoint", labelKey: "admin.notify.sms.fields.endpoint", placeholderKey: "admin.notify.sms.fields.endpointPlaceholder" },
    ],
    secretLabelKey: "admin.notify.sms.secretLabel.token",
  },
];

export const SMS_PROVIDER_IDS: readonly MessagingSmsProvider[] = SMS_PROVIDER_CATALOG.map(
  (entry) => entry.provider,
);

export function smsProviderCatalogEntry(provider: string): SmsProviderCatalogEntry | undefined {
  return SMS_PROVIDER_CATALOG.find((entry) => entry.provider === provider);
}

/** Fixed scenario vocabulary for per-scenario routing chains (shared with email). */
export const SMS_SEND_SCENARIOS: readonly MessagingEmailSendScenario[] = [
  "default",
  "verification_code",
  "system_notification",
  "marketing",
];
