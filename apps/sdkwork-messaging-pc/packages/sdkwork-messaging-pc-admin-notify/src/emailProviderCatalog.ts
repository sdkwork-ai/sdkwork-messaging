/**
 * Catalog of well-known email delivery providers supported by the
 * multi-provider email channel configuration.
 *
 * SMTP-transport providers receive host/port/encryption presets; HTTP-API
 * providers receive an API endpoint preset and store their key material in
 * the account secret. Delivery transports are a follow-up concern — this
 * catalog only shapes the admin configuration surface.
 */

import type { MessagingEmailProvider, MessagingEmailSendScenario } from "./notifyAdminService";

export type EmailProviderTransport = "smtp" | "http_api";

export interface EmailProviderCatalogEntry {
  provider: MessagingEmailProvider;
  transport: EmailProviderTransport;
  /** i18n key of the display name (`admin.notify.emailProviders.<id>.name`). */
  nameKey: string;
  /** i18n key of the short provider description. */
  descriptionKey: string;
  /** Preset `config` values applied when the admin picks this provider. */
  configDefaults: Record<string, string>;
  /** i18n key describing the secret material stored for this provider. */
  secretLabelKey: string;
}

export const EMAIL_PROVIDER_CATALOG: readonly EmailProviderCatalogEntry[] = [
  {
    provider: "smtp",
    transport: "smtp",
    nameKey: "admin.notify.emailProviders.smtp.name",
    descriptionKey: "admin.notify.emailProviders.smtp.description",
    configDefaults: { host: "", port: "465", encryption: "smtps" },
    secretLabelKey: "admin.notify.email.secretLabel.smtp",
  },
  {
    provider: "aliyun",
    transport: "smtp",
    nameKey: "admin.notify.emailProviders.aliyun.name",
    descriptionKey: "admin.notify.emailProviders.aliyun.description",
    configDefaults: { host: "smtpdm.aliyun.com", port: "465", encryption: "smtps" },
    secretLabelKey: "admin.notify.email.secretLabel.smtpPassword",
  },
  {
    provider: "tencent",
    transport: "smtp",
    nameKey: "admin.notify.emailProviders.tencent.name",
    descriptionKey: "admin.notify.emailProviders.tencent.description",
    configDefaults: { host: "smtp.qcloudmail.com", port: "465", encryption: "smtps" },
    secretLabelKey: "admin.notify.email.secretLabel.smtpPassword",
  },
  {
    provider: "sendgrid",
    transport: "http_api",
    nameKey: "admin.notify.emailProviders.sendgrid.name",
    descriptionKey: "admin.notify.emailProviders.sendgrid.description",
    configDefaults: { apiBaseUrl: "https://api.sendgrid.com" },
    secretLabelKey: "admin.notify.email.secretLabel.apiKey",
  },
  {
    provider: "mailgun",
    transport: "http_api",
    nameKey: "admin.notify.emailProviders.mailgun.name",
    descriptionKey: "admin.notify.emailProviders.mailgun.description",
    configDefaults: { apiBaseUrl: "https://api.mailgun.net", region: "us" },
    secretLabelKey: "admin.notify.email.secretLabel.apiKey",
  },
  {
    provider: "amazon_ses",
    transport: "smtp",
    nameKey: "admin.notify.emailProviders.amazon_ses.name",
    descriptionKey: "admin.notify.emailProviders.amazon_ses.description",
    configDefaults: {
      host: "email-smtp.us-east-1.amazonaws.com",
      port: "465",
      encryption: "smtps",
      region: "us-east-1",
    },
    secretLabelKey: "admin.notify.email.secretLabel.smtpPassword",
  },
  {
    provider: "postmark",
    transport: "http_api",
    nameKey: "admin.notify.emailProviders.postmark.name",
    descriptionKey: "admin.notify.emailProviders.postmark.description",
    configDefaults: { apiBaseUrl: "https://api.postmarkapp.com" },
    secretLabelKey: "admin.notify.email.secretLabel.serverToken",
  },
  {
    provider: "resend",
    transport: "http_api",
    nameKey: "admin.notify.emailProviders.resend.name",
    descriptionKey: "admin.notify.emailProviders.resend.description",
    configDefaults: { apiBaseUrl: "https://api.resend.com" },
    secretLabelKey: "admin.notify.email.secretLabel.apiKey",
  },
];

export const EMAIL_PROVIDER_IDS: readonly MessagingEmailProvider[] = EMAIL_PROVIDER_CATALOG.map(
  (entry) => entry.provider,
);

export function emailProviderCatalogEntry(
  provider: string,
): EmailProviderCatalogEntry | undefined {
  return EMAIL_PROVIDER_CATALOG.find((entry) => entry.provider === provider);
}

/** Fixed scenario vocabulary for per-scenario routing chains. */
export const EMAIL_SEND_SCENARIOS: readonly MessagingEmailSendScenario[] = [
  "default",
  "verification_code",
  "system_notification",
  "marketing",
];
