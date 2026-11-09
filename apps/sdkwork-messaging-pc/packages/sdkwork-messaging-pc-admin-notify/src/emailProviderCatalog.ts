/**
 * Catalog of the email providers supported by the multi-provider channel
 * configuration.
 *
 * Two families exist:
 * - Consumer mailbox services (`tencent_mail`, `mail_139`, `gmail`,
 *   `microsoft`) document both a send endpoint and an inbound IMAP/POP3
 *   endpoint. Their whole connection profile is preset here so an operator only
 *   supplies the mailbox account and its authorization code/app password.
 * - Delivery services (`aliyun`, `tencent`, `amazon_ses`, `sendgrid`,
 *   `mailgun`, `postmark`, `resend`) and the generic `smtp` fallback are
 *   send-only; their inbound side resolves to `receiveProtocol: "none"`.
 *
 * Presets are initialization data, not policy: every value stays editable in
 * the account drawer. The same presets are seeded as default database rows by
 * `database/seeds/common/002_email_provider_defaults.sql`, and
 * `emailProviderCatalog.test.ts` keeps both sides in sync.
 */

import type {
  EmailEndpoint,
  EmailEncryption,
  EmailSendTransport,
} from "./emailAccountConfig";
import type { MessagingEmailProvider, MessagingEmailSendScenario } from "./notifyAdminService";

export interface EmailProviderReceivePreset {
  /** Preferred inbound protocol shipped by the provider. */
  protocol: "imap" | "pop3";
  imap: EmailEndpoint;
  pop3: EmailEndpoint;
}

export interface EmailProviderCatalogEntry {
  provider: MessagingEmailProvider;
  transport: EmailSendTransport;
  /** i18n key of the display name (`admin.notify.emailProviders.<id>.name`). */
  nameKey: string;
  /** i18n key of the short provider description. */
  descriptionKey: string;
  /** i18n key of the secret material stored for this provider. */
  secretLabelKey: string;
  /** i18n key of the provider-specific setup step (auth code, app password…). */
  setupHintKey?: string;
  /** Send endpoint preset; `null` for HTTP API transports. */
  send: EmailEndpoint | null;
  /** Send API base URL preset; set for HTTP API transports. */
  apiBaseUrl?: string;
  /** Fixed provider region (`us` / `eu` / cloud region). */
  region?: string;
  /** Receive (IMAP/POP3) preset; absent for send-only providers. */
  receive?: EmailProviderReceivePreset;
}

const SSL = "ssl" satisfies EmailEncryption;
const STARTTLS = "starttls" satisfies EmailEncryption;

/** Consumer mailbox presets documented by each provider. */
const MAILBOX_PRESETS = {
  tencent_mail: {
    protocol: "imap",
    imap: { host: "imap.qq.com", port: "993", encryption: SSL },
    pop3: { host: "pop.qq.com", port: "995", encryption: SSL },
  },
  mail_139: {
    protocol: "imap",
    imap: { host: "imap.139.com", port: "993", encryption: SSL },
    pop3: { host: "pop.139.com", port: "995", encryption: SSL },
  },
  gmail: {
    protocol: "imap",
    imap: { host: "imap.gmail.com", port: "993", encryption: SSL },
    pop3: { host: "pop.gmail.com", port: "995", encryption: SSL },
  },
  microsoft: {
    protocol: "imap",
    imap: { host: "outlook.office365.com", port: "993", encryption: SSL },
    pop3: { host: "outlook.office365.com", port: "995", encryption: SSL },
  },
} as const satisfies Record<string, EmailProviderReceivePreset>;

export const EMAIL_PROVIDER_CATALOG: readonly EmailProviderCatalogEntry[] = [
  {
    provider: "tencent_mail",
    transport: "smtp",
    nameKey: "admin.notify.emailProviders.tencent_mail.name",
    descriptionKey: "admin.notify.emailProviders.tencent_mail.description",
    secretLabelKey: "admin.notify.email.secretLabel.authCode",
    setupHintKey: "admin.notify.emailProviders.tencent_mail.setupHint",
    send: { host: "smtp.qq.com", port: "465", encryption: SSL },
    receive: MAILBOX_PRESETS.tencent_mail,
  },
  {
    provider: "mail_139",
    transport: "smtp",
    nameKey: "admin.notify.emailProviders.mail_139.name",
    descriptionKey: "admin.notify.emailProviders.mail_139.description",
    secretLabelKey: "admin.notify.email.secretLabel.authCode",
    setupHintKey: "admin.notify.emailProviders.mail_139.setupHint",
    send: { host: "smtp.139.com", port: "465", encryption: SSL },
    receive: MAILBOX_PRESETS.mail_139,
  },
  {
    provider: "gmail",
    transport: "smtp",
    nameKey: "admin.notify.emailProviders.gmail.name",
    descriptionKey: "admin.notify.emailProviders.gmail.description",
    secretLabelKey: "admin.notify.email.secretLabel.appPassword",
    setupHintKey: "admin.notify.emailProviders.gmail.setupHint",
    send: { host: "smtp.gmail.com", port: "465", encryption: SSL },
    receive: MAILBOX_PRESETS.gmail,
  },
  {
    provider: "microsoft",
    transport: "smtp",
    nameKey: "admin.notify.emailProviders.microsoft.name",
    descriptionKey: "admin.notify.emailProviders.microsoft.description",
    secretLabelKey: "admin.notify.email.secretLabel.appPassword",
    setupHintKey: "admin.notify.emailProviders.microsoft.setupHint",
    send: { host: "smtp.office365.com", port: "587", encryption: STARTTLS },
    receive: MAILBOX_PRESETS.microsoft,
  },
  {
    provider: "aliyun",
    transport: "smtp",
    nameKey: "admin.notify.emailProviders.aliyun.name",
    descriptionKey: "admin.notify.emailProviders.aliyun.description",
    secretLabelKey: "admin.notify.email.secretLabel.accessKeySecret",
    send: { host: "smtpdm.aliyun.com", port: "465", encryption: SSL },
  },
  {
    provider: "tencent",
    transport: "smtp",
    nameKey: "admin.notify.emailProviders.tencent.name",
    descriptionKey: "admin.notify.emailProviders.tencent.description",
    secretLabelKey: "admin.notify.email.secretLabel.smtpPassword",
    send: { host: "smtp.qcloudmail.com", port: "465", encryption: SSL },
  },
  {
    provider: "amazon_ses",
    transport: "smtp",
    nameKey: "admin.notify.emailProviders.amazon_ses.name",
    descriptionKey: "admin.notify.emailProviders.amazon_ses.description",
    secretLabelKey: "admin.notify.email.secretLabel.smtpPassword",
    send: { host: "email-smtp.us-east-1.amazonaws.com", port: "465", encryption: SSL },
    region: "us-east-1",
  },
  {
    provider: "sendgrid",
    transport: "http_api",
    nameKey: "admin.notify.emailProviders.sendgrid.name",
    descriptionKey: "admin.notify.emailProviders.sendgrid.description",
    secretLabelKey: "admin.notify.email.secretLabel.apiKey",
    send: null,
    apiBaseUrl: "https://api.sendgrid.com",
  },
  {
    provider: "mailgun",
    transport: "http_api",
    nameKey: "admin.notify.emailProviders.mailgun.name",
    descriptionKey: "admin.notify.emailProviders.mailgun.description",
    secretLabelKey: "admin.notify.email.secretLabel.apiKey",
    send: null,
    apiBaseUrl: "https://api.mailgun.net",
    region: "us",
  },
  {
    provider: "postmark",
    transport: "http_api",
    nameKey: "admin.notify.emailProviders.postmark.name",
    descriptionKey: "admin.notify.emailProviders.postmark.description",
    secretLabelKey: "admin.notify.email.secretLabel.serverToken",
    send: null,
    apiBaseUrl: "https://api.postmarkapp.com",
  },
  {
    provider: "resend",
    transport: "http_api",
    nameKey: "admin.notify.emailProviders.resend.name",
    descriptionKey: "admin.notify.emailProviders.resend.description",
    secretLabelKey: "admin.notify.email.secretLabel.apiKey",
    send: null,
    apiBaseUrl: "https://api.resend.com",
  },
  {
    provider: "smtp",
    transport: "smtp",
    nameKey: "admin.notify.emailProviders.smtp.name",
    descriptionKey: "admin.notify.emailProviders.smtp.description",
    secretLabelKey: "admin.notify.email.secretLabel.smtpPassword",
    send: { host: "", port: "465", encryption: SSL },
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

/**
 * Initialization config for a provider: exactly the JSON persisted in
 * `messaging_email_account.config_json`. It mirrors the seeded default rows.
 */
export function providerConfigDefaults(
  entry: EmailProviderCatalogEntry,
): Record<string, string> {
  const config: Record<string, string> = { transport: entry.transport };
  if (entry.transport === "smtp" && entry.send) {
    config.host = entry.send.host;
    config.port = entry.send.port;
    config.encryption = entry.send.encryption;
  } else if (entry.apiBaseUrl) {
    config.apiBaseUrl = entry.apiBaseUrl;
  }
  if (entry.region) {
    config.region = entry.region;
  }
  config.receiveProtocol = entry.receive ? entry.receive.protocol : "none";
  if (entry.receive) {
    config.imapHost = entry.receive.imap.host;
    config.imapPort = entry.receive.imap.port;
    config.imapEncryption = entry.receive.imap.encryption;
    config.pop3Host = entry.receive.pop3.host;
    config.pop3Port = entry.receive.pop3.port;
    config.pop3Encryption = entry.receive.pop3.encryption;
  }
  return config;
}

/** Fixed scenario vocabulary for per-scenario routing chains. */
export const EMAIL_SEND_SCENARIOS: readonly MessagingEmailSendScenario[] = [
  "default",
  "verification_code",
  "system_notification",
  "marketing",
];
