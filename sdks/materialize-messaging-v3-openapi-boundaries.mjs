import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { bootstrapOpenApiEnvelope } from "../../sdkwork-specs/tools/lib/migrate-openapi-legacy-envelope.mjs";
import { alignOpenApiOperationPatterns } from "../../sdkwork-specs/tools/lib/align-api-operation-patterns.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATOR_PATH = path.resolve(ROOT, "../sdkwork-sdk-generator/bin/sdkgen.js");
const VERSION = "1.2.0";
const OWNER = "sdkwork-messaging";

const FAMILIES = [
  {
    family: "sdkwork-messaging-app-sdk",
    title: "SDKWork Messaging App API",
    description: "App/client contract for in-app notifications, announcements, app push device registration, and verification codes.",
    apiAuthority: "sdkwork-messaging-app-api",
    surface: "app-api",
    sdkType: "app",
    prefix: "/app/v3/api",
    domain: "messaging",
    tag: "messaging",
    packageName: "@sdkwork/messaging-app-sdk",
    routeCrate: "sdkwork-routes-messaging-app-api",
    auth: "dual-token",
    routes: [
      route("GET", "/app/v3/api/messaging/notifications", "messaging.notifications.list", "messaging.notifications", "messaging.notifications.list", null, "MessagingNotificationListResponse", false),
      route("POST", "/app/v3/api/messaging/notifications/{notificationId}/read", "messaging.notifications.markRead", "messaging.notifications", "messaging.notifications.mark_read", null, "MessagingNotificationReceiptResponse", true, [pathParameter("notificationId")]),
      route("GET", "/app/v3/api/messaging/announcements", "messaging.announcements.list", "messaging.announcements", "messaging.announcements.list", null, "MessagingAnnouncementListResponse", false),
      route("POST", "/app/v3/api/messaging/announcements/{announcementId}/acknowledge", "messaging.announcements.acknowledge", "messaging.announcements", "messaging.announcements.acknowledge", null, "MessagingAnnouncementReceiptResponse", true, [pathParameter("announcementId")]),
      route("POST", "/app/v3/api/messaging/push_devices", "messaging.pushDevices.register", "messaging.pushDevices", "messaging.push_devices.register", "MessagingPushDeviceRegisterRequest", "MessagingPushDeviceResponse", true),
      route("DELETE", "/app/v3/api/messaging/push_devices/{deviceId}", "messaging.pushDevices.unregister", "messaging.pushDevices", "messaging.push_devices.unregister", null, "MessagingPushDeviceUnregisterResponse", true, [pathParameter("deviceId")]),
      route("POST", "/app/v3/api/messaging/verification_codes", "messaging.verificationCodes.create", "messaging.verificationCodes", "messaging.verification_codes.create", "MessagingVerificationCodeCreateRequest", "MessagingVerificationCodeResponse", true),
      route("POST", "/app/v3/api/messaging/verification_codes/verify", "messaging.verificationCodes.verify", "messaging.verificationCodes", "messaging.verification_codes.verify", "MessagingVerificationCodeVerifyRequest", "MessagingVerificationCodeVerifyResponse", true),
    ],
  },
  {
    family: "sdkwork-messaging-backend-sdk",
    title: "SDKWork Messaging Backend API",
    description: "Backend/admin contract for notification creation, announcement publishing, app push delivery, SMS/email sends, verification policies, channel configuration, and message templates.",
    apiAuthority: "sdkwork-messaging-backend-api",
    surface: "backend-api",
    sdkType: "backend",
    prefix: "/backend/v3/api",
    domain: "messaging",
    tag: "messaging",
    packageName: "@sdkwork/messaging-backend-sdk",
    routeCrate: "sdkwork-routes-messaging-backend-api",
    auth: "dual-token",
    routes: [
      route("GET", "/backend/v3/api/messaging/notifications", "messaging.notifications.list", "messaging.notifications", "messaging.notifications.list", null, "MessagingNotificationListResponse", false),
      route("POST", "/backend/v3/api/messaging/notifications", "messaging.notifications.create", "messaging.notifications", "messaging.notifications.create", "MessagingNotificationCreateRequest", "MessagingNotificationResponse", true),
      route("GET", "/backend/v3/api/messaging/announcements", "messaging.announcements.list", "messaging.announcements", "messaging.announcements.list", null, "MessagingAnnouncementListResponse", false),
      route("POST", "/backend/v3/api/messaging/announcements", "messaging.announcements.publish", "messaging.announcements", "messaging.announcements.publish", "MessagingAnnouncementPublishRequest", "MessagingAnnouncementResponse", true),
      route("GET", "/backend/v3/api/messaging/push_messages", "messaging.pushMessages.list", "messaging.pushMessages", "messaging.push_messages.list", null, "MessagingPushMessageListResponse", false),
      route("POST", "/backend/v3/api/messaging/push_messages", "messaging.pushMessages.send", "messaging.pushMessages", "messaging.push_messages.send", "MessagingPushMessageSendRequest", "MessagingPushMessageResponse", true),
      route("GET", "/backend/v3/api/messaging/outbound_messages", "messaging.outboundMessages.list", "messaging.outboundMessages", "messaging.outbound_messages.list", null, "MessagingOutboundMessageListResponse", false),
      route("POST", "/backend/v3/api/messaging/outbound_messages", "messaging.outboundMessages.send", "messaging.outboundMessages", "messaging.outbound_messages.send", "MessagingOutboundMessageSendRequest", "MessagingOutboundMessageResponse", true),
      route("GET", "/backend/v3/api/messaging/verification_policies", "messaging.verificationPolicies.list", "messaging.verificationPolicies", "messaging.verification_policies.list", null, "MessagingVerificationPolicyListResponse", false),
      route("PUT", "/backend/v3/api/messaging/verification_policies/{policyId}", "messaging.verificationPolicies.update", "messaging.verificationPolicies", "messaging.verification_policies.update", "MessagingVerificationPolicyUpdateRequest", "MessagingVerificationPolicyResponse", true, [pathParameter("policyId")]),
      route("GET", "/backend/v3/api/messaging/email/accounts", "messaging.emailAccounts.list", "messaging.emailAccounts", "messaging.emailAccounts.list", null, "MessagingEmailAccountListResponse", false),
      route("POST", "/backend/v3/api/messaging/email/accounts", "messaging.emailAccounts.create", "messaging.emailAccounts", "messaging.emailAccounts.create", "MessagingEmailAccountCreateRequest", "MessagingEmailAccountResponse", true),
      route("GET", "/backend/v3/api/messaging/email/accounts/{accountId}", "messaging.emailAccounts.retrieve", "messaging.emailAccounts", "messaging.emailAccounts.retrieve", null, "MessagingEmailAccountResponse", false, [accountIdParameter()]),
      route("PUT", "/backend/v3/api/messaging/email/accounts/{accountId}", "messaging.emailAccounts.update", "messaging.emailAccounts", "messaging.emailAccounts.update", "MessagingEmailAccountUpdateRequest", "MessagingEmailAccountResponse", true, [accountIdParameter()]),
      route("DELETE", "/backend/v3/api/messaging/email/accounts/{accountId}", "messaging.emailAccounts.delete", "messaging.emailAccounts", "messaging.emailAccounts.delete", null, null, true, [accountIdParameter()]),
      route("GET", "/backend/v3/api/messaging/email/senders", "messaging.emailSenders.list", "messaging.emailSenders", "messaging.emailSenders.list", null, "MessagingEmailSenderListResponse", false, [accountIdQueryParameter()]),
      route("POST", "/backend/v3/api/messaging/email/senders", "messaging.emailSenders.create", "messaging.emailSenders", "messaging.emailSenders.create", "MessagingEmailSenderCreateRequest", "MessagingEmailSenderResponse", true),
      route("GET", "/backend/v3/api/messaging/email/senders/{senderId}", "messaging.emailSenders.retrieve", "messaging.emailSenders", "messaging.emailSenders.retrieve", null, "MessagingEmailSenderResponse", false, [senderIdParameter()]),
      route("PUT", "/backend/v3/api/messaging/email/senders/{senderId}", "messaging.emailSenders.update", "messaging.emailSenders", "messaging.emailSenders.update", "MessagingEmailSenderUpdateRequest", "MessagingEmailSenderResponse", true, [senderIdParameter()]),
      route("DELETE", "/backend/v3/api/messaging/email/senders/{senderId}", "messaging.emailSenders.delete", "messaging.emailSenders", "messaging.emailSenders.delete", null, null, true, [senderIdParameter()]),
      // Bounded collection: exactly four scenario rows exist per scope (schema-enforced
      // by uk_messaging_email_send_rule_scope_scenario); pagination omitted per PAGINATION_SPEC §11.
      route("GET", "/backend/v3/api/messaging/email/send_rules", "messaging.emailSendRules.list", "messaging.emailSendRules", "messaging.emailSendRules.list", null, "MessagingEmailSendRuleListResponse", false),
      route("PUT", "/backend/v3/api/messaging/email/send_rules/{scenario}", "messaging.emailSendRules.update", "messaging.emailSendRules", "messaging.emailSendRules.update", "MessagingEmailSendRuleUpdateRequest", "MessagingEmailSendRuleResponse", true, [scenarioParameter()]),
      route("GET", "/backend/v3/api/messaging/sms/accounts", "messaging.smsAccounts.list", "messaging.smsAccounts", "messaging.smsAccounts.list", null, "MessagingSmsAccountListResponse", false),
      route("POST", "/backend/v3/api/messaging/sms/accounts", "messaging.smsAccounts.create", "messaging.smsAccounts", "messaging.smsAccounts.create", "MessagingSmsAccountCreateRequest", "MessagingSmsAccountResponse", true),
      route("GET", "/backend/v3/api/messaging/sms/accounts/{accountId}", "messaging.smsAccounts.retrieve", "messaging.smsAccounts", "messaging.smsAccounts.retrieve", null, "MessagingSmsAccountResponse", false, [accountIdParameter()]),
      route("PUT", "/backend/v3/api/messaging/sms/accounts/{accountId}", "messaging.smsAccounts.update", "messaging.smsAccounts", "messaging.smsAccounts.update", "MessagingSmsAccountUpdateRequest", "MessagingSmsAccountResponse", true, [accountIdParameter()]),
      route("DELETE", "/backend/v3/api/messaging/sms/accounts/{accountId}", "messaging.smsAccounts.delete", "messaging.smsAccounts", "messaging.smsAccounts.delete", null, null, true, [accountIdParameter()]),
      route("GET", "/backend/v3/api/messaging/sms/signatures", "messaging.smsSignatures.list", "messaging.smsSignatures", "messaging.smsSignatures.list", null, "MessagingSmsSignatureListResponse", false, [accountIdQueryParameter()]),
      route("POST", "/backend/v3/api/messaging/sms/signatures", "messaging.smsSignatures.create", "messaging.smsSignatures", "messaging.smsSignatures.create", "MessagingSmsSignatureCreateRequest", "MessagingSmsSignatureResponse", true),
      route("GET", "/backend/v3/api/messaging/sms/signatures/{signatureId}", "messaging.smsSignatures.retrieve", "messaging.smsSignatures", "messaging.smsSignatures.retrieve", null, "MessagingSmsSignatureResponse", false, [signatureIdParameter()]),
      route("PUT", "/backend/v3/api/messaging/sms/signatures/{signatureId}", "messaging.smsSignatures.update", "messaging.smsSignatures", "messaging.smsSignatures.update", "MessagingSmsSignatureUpdateRequest", "MessagingSmsSignatureResponse", true, [signatureIdParameter()]),
      route("DELETE", "/backend/v3/api/messaging/sms/signatures/{signatureId}", "messaging.smsSignatures.delete", "messaging.smsSignatures", "messaging.smsSignatures.delete", null, null, true, [signatureIdParameter()]),
      // Bounded collection: exactly four scenario rows exist per scope (schema-enforced
      // by uk_messaging_sms_send_rule_scope_scenario); pagination omitted per PAGINATION_SPEC §11.
      route("GET", "/backend/v3/api/messaging/sms/send_rules", "messaging.smsSendRules.list", "messaging.smsSendRules", "messaging.smsSendRules.list", null, "MessagingSmsSendRuleListResponse", false),
      route("PUT", "/backend/v3/api/messaging/sms/send_rules/{scenario}", "messaging.smsSendRules.update", "messaging.smsSendRules", "messaging.smsSendRules.update", "MessagingSmsSendRuleUpdateRequest", "MessagingSmsSendRuleResponse", true, [scenarioParameter()]),
      route("GET", "/backend/v3/api/messaging/templates", "messaging.templates.list", "messaging.templates", "messaging.templates.list", null, "MessagingTemplateListResponse", false, [
        queryParameter("channel", { type: "string", enum: ["sms", "email"] }),
        queryParameter("status", { type: "string", enum: ["draft", "active", "disabled"] }),
        queryParameter("q", { type: "string", maxLength: 128 }),
      ]),
      route("POST", "/backend/v3/api/messaging/templates", "messaging.templates.create", "messaging.templates", "messaging.templates.create", "MessagingTemplateCreateRequest", "MessagingTemplateResponse", true),
      route("GET", "/backend/v3/api/messaging/templates/{templateId}", "messaging.templates.retrieve", "messaging.templates", "messaging.templates.retrieve", null, "MessagingTemplateResponse", false, [pathParameter("templateId")]),
      route("PUT", "/backend/v3/api/messaging/templates/{templateId}", "messaging.templates.update", "messaging.templates", "messaging.templates.update", "MessagingTemplateUpdateRequest", "MessagingTemplateResponse", true, [pathParameter("templateId")]),
      route("DELETE", "/backend/v3/api/messaging/templates/{templateId}", "messaging.templates.delete", "messaging.templates", "messaging.templates.delete", null, null, true, [pathParameter("templateId")]),
    ],
  },
];

async function ensureDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function writeJson(filePath, value) {
  await ensureDir(filePath);
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath, value) {
  await ensureDir(filePath);
  await writeFile(filePath, value, "utf8");
}

function route(method, routePath, operationId, resource, auditEvent, requestSchema, responseSchema, idempotent, parameters = []) {
  return {
    method,
    path: routePath,
    operationId,
    resource,
    auditEvent,
    requestSchema,
    responseSchema,
    idempotent,
    parameters,
  };
}

function pathParameter(name) {
  return {
    name,
    in: "path",
    required: true,
    schema: { type: "string", minLength: 1 },
  };
}

function accountIdParameter() {
  return pathParameter("accountId");
}

function signatureIdParameter() {
  return pathParameter("signatureId");
}

function senderIdParameter() {
  return pathParameter("senderId");
}

function scenarioParameter() {
  return {
    name: "scenario",
    in: "path",
    required: true,
    schema: {
      type: "string",
      enum: ["default", "verification_code", "system_notification", "marketing"],
    },
  };
}

function accountIdQueryParameter() {
  return queryParameter("account_id", { type: "string", pattern: "^[0-9]+$" });
}

function queryParameter(name, schema) {
  return {
    name,
    in: "query",
    required: false,
    schema,
  };
}

function idempotencyHeaderParameter() {
  return {
    name: "Idempotency-Key",
    in: "header",
    required: true,
    description: "Client-provided retry key for this command. It is scoped by tenant, principal, method, and path.",
    schema: {
      type: "string",
      minLength: 8,
      maxLength: 256,
    },
    "x-sdkwork-idempotency-key": true,
  };
}

function pageParameters() {
  return [
    {
      name: "page",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 1, default: 1 },
    },
    {
      name: "page_size",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 1, maximum: 200, default: 20 },
    },
  ];
}

function problemResponses() {
  const response = (description) => ({
    description,
    content: {
      "application/problem+json": {
        schema: { $ref: "#/components/schemas/ProblemDetail" },
      },
    },
  });
  return {
    400: response("Bad request"),
    401: response("Unauthorized"),
    403: response("Forbidden"),
    404: response("Not found"),
    409: response("Conflict"),
    429: response("Rate limit exceeded"),
    500: response("Internal server error"),
  };
}

function noContentResponse() {
  return {
    description: "Deleted",
  };
}

function jsonResponse(schemaRef) {
  return {
    description: "Success",
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaRef}` },
      },
    },
  };
}

function requestBody(schemaRef) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaRef}` },
      },
    },
  };
}

function security() {
  return [{ AuthToken: [], AccessToken: [] }];
}

function securitySchemes() {
  return {
    AuthToken: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
    AccessToken: {
      type: "apiKey",
      in: "header",
      name: "Access-Token",
    },
  };
}

function schemas() {
  const requestId = { type: "string", format: "uuid", description: "Server-owned request correlation id." };
  const id = { type: "string", minLength: 1 };
  const int64 = {
    type: "string",
    format: "int64",
    pattern: "^[0-9]+$",
    "x-sdkwork-int64-string": true,
    "x-sdkwork-rust-type": "i64",
  };
  const pageInfo = object(["page", "pageSize", "totalItems", "totalPages"], {
    page: { type: "integer", minimum: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 200 },
    totalItems: { type: "integer", minimum: 0 },
    totalPages: { type: "integer", minimum: 0 },
  });
  const envelope = (name, itemRef) => ({
    type: "object",
    additionalProperties: false,
    required: ["items", "pageInfo", "requestId"],
    properties: {
      items: { type: "array", items: { $ref: `#/components/schemas/${itemRef}` } },
      pageInfo: { $ref: "#/components/schemas/PageInfo" },
      requestId,
    },
    "x-sdkwork-schema-name": name,
  });
  const metadata = { type: "object", additionalProperties: true };
  const pushData = { type: "object", additionalProperties: { type: "string" } };
  const audienceKind = { type: "string", enum: ["all_users", "tenant", "organization", "role", "user_segment", "explicit_users"] };
  const notificationPriority = { type: "string", enum: ["low", "normal", "high", "urgent"] };
  const notificationStatus = { type: "string", enum: ["unread", "read", "archived"] };
  const announcementStatus = { type: "string", enum: ["draft", "scheduled", "published", "expired", "cancelled"] };
  const pushStatus = { type: "string", enum: ["accepted", "queued", "sent", "delivered", "failed", "opened", "cancelled", "expired"] };
  const verificationChallengeStatus = { type: "string", enum: ["pending", "verified", "failed", "locked", "expired"] };
  const directChannel = { type: "string", enum: ["sms", "email"] };
  /**
   * Email provider catalog. Providers are grouped as (a) consumer mailbox
   * services configured through SMTP/IMAP/POP3 presets, (b) cloud delivery
   * APIs, and (c) the generic SMTP fallback. The list is the wire authority for
   * `messaging_email_account.provider` and must stay in sync with
   * `database/migrations/postgres/0006_email_provider_expansion.up.sql`.
   */
  const emailProvider = {
    type: "string",
    enum: [
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
    ],
  };

  return {
    ProblemDetail: {
      type: "object",
      additionalProperties: true,
      required: ["type", "title", "status"],
      properties: {
        type: { type: "string", format: "uri-reference" },
        title: { type: "string" },
        status: { type: "integer", minimum: 100, maximum: 599 },
        detail: { type: "string" },
        requestId,
      },
    },
    PageInfo: pageInfo,
    MessagingNotification: object(["id", "title", "body", "priority", "status", "createdAt"], {
      id,
      title: { type: "string", minLength: 1, maxLength: 256 },
      body: { type: "string", minLength: 1 },
      category: { type: "string" },
      priority: notificationPriority,
      status: notificationStatus,
      actionUrl: { type: "string", format: "uri-reference" },
      metadata,
      createdAt: { type: "string", format: "date-time" },
      readAt: { type: "string", format: "date-time" },
    }),
    MessagingNotificationCreateRequest: object(["recipientUserIds", "title", "body"], {
      recipientUserIds: { type: "array", minItems: 1, items: int64 },
      title: { type: "string", minLength: 1, maxLength: 256 },
      body: { type: "string", minLength: 1 },
      category: { type: "string" },
      priority: notificationPriority,
      actionUrl: { type: "string", format: "uri-reference" },
      metadata,
    }),
    MessagingNotificationResponse: object(["item", "requestId"], {
      item: { $ref: "#/components/schemas/MessagingNotification" },
      requestId,
    }),
    MessagingNotificationReceiptResponse: object(["notificationId", "status", "requestId"], {
      notificationId: id,
      status: notificationStatus,
      requestId,
    }),
    MessagingNotificationListResponse: envelope("MessagingNotificationListResponse", "MessagingNotification"),
    MessagingAnnouncement: object(["id", "title", "body", "status"], {
      id,
      title: { type: "string", minLength: 1, maxLength: 256 },
      body: { type: "string", minLength: 1 },
      severity: { type: "string", enum: ["info", "success", "warning", "critical"] },
      status: announcementStatus,
      requireAck: { type: "boolean" },
      publishAt: { type: "string", format: "date-time" },
      expireAt: { type: "string", format: "date-time" },
      acknowledgedAt: { type: "string", format: "date-time" },
      metadata,
    }),
    MessagingAnnouncementPublishRequest: object(["title", "body", "audiences"], {
      title: { type: "string", minLength: 1, maxLength: 256 },
      body: { type: "string", minLength: 1 },
      severity: { type: "string", enum: ["info", "success", "warning", "critical"] },
      requireAck: { type: "boolean" },
      publishAt: { type: "string", format: "date-time" },
      expireAt: { type: "string", format: "date-time" },
      audiences: {
        type: "array",
        minItems: 1,
        items: { $ref: "#/components/schemas/MessagingAudience" },
      },
      metadata,
    }),
    MessagingAudience: object(["kind", "value"], {
      kind: audienceKind,
      value: { type: "string", minLength: 1 },
    }),
    MessagingAnnouncementResponse: object(["item", "requestId"], {
      item: { $ref: "#/components/schemas/MessagingAnnouncement" },
      requestId,
    }),
    MessagingAnnouncementReceiptResponse: object(["announcementId", "acknowledged", "requestId"], {
      announcementId: id,
      acknowledged: { type: "boolean" },
      requestId,
    }),
    MessagingAnnouncementListResponse: envelope("MessagingAnnouncementListResponse", "MessagingAnnouncement"),
    MessagingPushDeviceRegisterRequest: object(["deviceKey", "platform", "provider", "token"], {
      deviceKey: { type: "string", minLength: 1, maxLength: 192 },
      platform: { type: "string", enum: ["ios", "android", "web"] },
      provider: { type: "string", enum: ["apns", "fcm", "web_push", "vendor"] },
      token: { type: "string", minLength: 1, writeOnly: true, "x-sensitive": true },
      appVersion: { type: "string" },
      locale: { type: "string" },
      timezone: { type: "string" },
    }),
    MessagingPushDeviceResponse: object(["deviceId", "enabled", "requestId"], {
      deviceId: id,
      enabled: { type: "boolean" },
      requestId,
    }),
    MessagingPushDeviceUnregisterResponse: object(["deviceId", "removed", "requestId"], {
      deviceId: id,
      removed: { type: "boolean" },
      requestId,
    }),
    MessagingPushMessage: object(["id", "title", "body", "status"], {
      id,
      title: { type: "string", minLength: 1, maxLength: 256 },
      body: { type: "string", minLength: 1 },
      status: pushStatus,
      badge: { type: "integer", minimum: 0 },
      collapseKey: { type: "string" },
      data: pushData,
      scheduledAt: { type: "string", format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
    }),
    MessagingPushMessageSendRequest: object(["recipientUserIds", "title", "body"], {
      recipientUserIds: { type: "array", minItems: 1, items: int64 },
      title: { type: "string", minLength: 1, maxLength: 256 },
      body: { type: "string", minLength: 1 },
      badge: { type: "integer", minimum: 0 },
      collapseKey: { type: "string" },
      data: pushData,
      scheduledAt: { type: "string", format: "date-time" },
    }),
    MessagingPushMessageResponse: object(["item", "requestId"], {
      item: { $ref: "#/components/schemas/MessagingPushMessage" },
      requestId,
    }),
    MessagingPushMessageListResponse: envelope("MessagingPushMessageListResponse", "MessagingPushMessage"),
    MessagingOutboundMessage: object(["id", "channel", "targetMasked", "body", "status"], {
      id,
      channel: directChannel,
      targetMasked: { type: "string", readOnly: true },
      subject: { type: "string" },
      body: { type: "string", minLength: 1 },
      status: pushStatus,
      createdAt: { type: "string", format: "date-time" },
    }),
    MessagingOutboundMessageSendRequest: object(["channel", "target", "body"], {
      channel: directChannel,
      target: { type: "string", minLength: 1, writeOnly: true, "x-sensitive": true },
      subject: { type: "string" },
      body: { type: "string", minLength: 1 },
      payload: metadata,
    }),
    MessagingOutboundMessageResponse: object(["item", "requestId"], {
      item: { $ref: "#/components/schemas/MessagingOutboundMessage" },
      requestId,
    }),
    MessagingOutboundMessageListResponse: envelope("MessagingOutboundMessageListResponse", "MessagingOutboundMessage"),
    MessagingVerificationCodeCreateRequest: object(["sceneCode", "target"], {
      sceneCode: { type: "string", minLength: 1, maxLength: 160 },
      target: { type: "string", minLength: 1, writeOnly: true, "x-sensitive": true },
      channel: directChannel,
    }),
    MessagingVerificationCodeResponse: object(["codeId", "expiresAt", "requestId"], {
      codeId: id,
      expiresAt: { type: "string", format: "date-time" },
      status: verificationChallengeStatus,
      requestId,
    }),
    MessagingVerificationCodeVerifyRequest: object(["codeId", "code"], {
      codeId: id,
      code: { type: "string", minLength: 4, maxLength: 12, writeOnly: true, "x-sensitive": true },
    }),
    MessagingVerificationCodeVerifyResponse: object(["verified", "status", "requestId"], {
      verified: { type: "boolean" },
      status: verificationChallengeStatus,
      remainingAttempts: { type: "integer", minimum: 0 },
      requestId,
    }),
    MessagingVerificationPolicy: object(["id", "sceneCode", "channel", "ttlSeconds", "maxAttempts", "enabled", "version"], {
      id,
      sceneCode: { type: "string", minLength: 1, maxLength: 160 },
      channel: directChannel,
      ttlSeconds: { type: "integer", minimum: 30 },
      maxAttempts: { type: "integer", minimum: 1, maximum: 20 },
      messageSubject: { type: "string" },
      messageBodyPattern: { type: "string", minLength: 1 },
      enabled: { type: "boolean" },
      version: int64,
    }),
    MessagingVerificationPolicyUpdateRequest: object(["messageBodyPattern", "expectedVersion"], {
      ttlSeconds: { type: "integer", minimum: 30 },
      maxAttempts: { type: "integer", minimum: 1, maximum: 20 },
      messageSubject: { type: "string" },
      messageBodyPattern: { type: "string", minLength: 1 },
      enabled: { type: "boolean" },
      expectedVersion: int64,
    }),
    MessagingVerificationPolicyResponse: object(["item", "requestId"], {
      item: { $ref: "#/components/schemas/MessagingVerificationPolicy" },
      requestId,
    }),
    MessagingVerificationPolicyListResponse: envelope("MessagingVerificationPolicyListResponse", "MessagingVerificationPolicy"),
    MessagingSmsAccount: object(["id", "name", "provider", "hasSecret", "enabled", "version"], {
      id,
      name: { type: "string", minLength: 1, maxLength: 128 },
      provider: { type: "string", enum: ["aliyun", "tencent", "huawei", "yuntongxun", "submail", "chuanglan", "twilio", "generic_http"] },
      config: { type: "object", additionalProperties: true },
      hasSecret: { type: "boolean" },
      keyDisplayMasked: { type: "string", readOnly: true },
      enabled: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      version: int64,
    }),
    MessagingSmsAccountCreateRequest: object(["name", "provider", "config", "enabled"], {
      name: { type: "string", minLength: 1, maxLength: 128 },
      provider: { type: "string", enum: ["aliyun", "tencent", "huawei", "yuntongxun", "submail", "chuanglan", "twilio", "generic_http"] },
      config: { type: "object", additionalProperties: true },
      secret: { type: "string", writeOnly: true, "x-sensitive": true },
      enabled: { type: "boolean" },
    }),
    MessagingSmsAccountUpdateRequest: object(["name", "provider", "config", "enabled", "expectedVersion"], {
      name: { type: "string", minLength: 1, maxLength: 128 },
      provider: { type: "string", enum: ["aliyun", "tencent", "huawei", "yuntongxun", "submail", "chuanglan", "twilio", "generic_http"] },
      config: { type: "object", additionalProperties: true },
      secret: { type: "string", writeOnly: true, "x-sensitive": true },
      enabled: { type: "boolean" },
      expectedVersion: int64,
    }),
    MessagingSmsAccountResponse: object(["item", "requestId"], {
      item: { $ref: "#/components/schemas/MessagingSmsAccount" },
      requestId,
    }),
    MessagingSmsAccountListResponse: envelope("MessagingSmsAccountListResponse", "MessagingSmsAccount"),
    MessagingSmsSignature: object(["id", "accountId", "accountName", "signName", "enabled", "version"], {
      id,
      accountId: id,
      accountName: { type: "string", minLength: 1 },
      signName: { type: "string", minLength: 1, maxLength: 64 },
      enabled: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      version: int64,
    }),
    MessagingSmsSignatureCreateRequest: object(["accountId", "signName", "enabled"], {
      accountId: id,
      signName: { type: "string", minLength: 1, maxLength: 64 },
      enabled: { type: "boolean" },
    }),
    MessagingSmsSignatureUpdateRequest: object(["signName", "enabled", "expectedVersion"], {
      signName: { type: "string", minLength: 1, maxLength: 64 },
      enabled: { type: "boolean" },
      expectedVersion: int64,
    }),
    MessagingSmsSignatureResponse: object(["item", "requestId"], {
      item: { $ref: "#/components/schemas/MessagingSmsSignature" },
      requestId,
    }),
    MessagingSmsSignatureListResponse: envelope("MessagingSmsSignatureListResponse", "MessagingSmsSignature"),
    MessagingSmsSendRuleStep: object(["signatureId", "accountId", "accountName", "signName"], {
      signatureId: id,
      accountId: id,
      accountName: { type: "string", minLength: 1 },
      signName: { type: "string", minLength: 1, maxLength: 64 },
      enabled: { type: "boolean" },
    }),
    MessagingSmsSendRule: object(["scenario", "chain", "enabled", "version"], {
      scenario: { type: "string", enum: ["default", "verification_code", "system_notification", "marketing"] },
      chain: {
        type: "array",
        items: { $ref: "#/components/schemas/MessagingSmsSendRuleStep" },
      },
      enabled: { type: "boolean" },
      updatedAt: { type: "string", format: "date-time" },
      version: int64,
    }),
    MessagingSmsSendRuleUpdateRequest: object(["signatureIds", "enabled", "expectedVersion"], {
      signatureIds: {
        type: "array",
        maxItems: 50,
        items: id,
      },
      enabled: { type: "boolean" },
      expectedVersion: int64,
    }),
    MessagingSmsSendRuleResponse: object(["item", "requestId"], {
      item: { $ref: "#/components/schemas/MessagingSmsSendRule" },
      requestId,
    }),
    MessagingSmsSendRuleListResponse: envelope("MessagingSmsSendRuleListResponse", "MessagingSmsSendRule"),
    MessagingEmailAccount: object(["id", "name", "provider", "hasSecret", "enabled", "receiveEnabled", "version"], {
      id,
      name: { type: "string", minLength: 1, maxLength: 128 },
      provider: emailProvider,
      config: { type: "object", additionalProperties: true },
      hasSecret: { type: "boolean" },
      keyDisplayMasked: { type: "string", readOnly: true },
      enabled: { type: "boolean" },
      receiveEnabled: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      version: int64,
    }),
    MessagingEmailAccountCreateRequest: object(["name", "provider", "config", "enabled"], {
      name: { type: "string", minLength: 1, maxLength: 128 },
      provider: emailProvider,
      config: { type: "object", additionalProperties: true },
      secret: { type: "string", writeOnly: true, "x-sensitive": true },
      enabled: { type: "boolean" },
      receiveEnabled: { type: "boolean" },
    }),
    MessagingEmailAccountUpdateRequest: object(["name", "provider", "config", "enabled", "expectedVersion"], {
      name: { type: "string", minLength: 1, maxLength: 128 },
      provider: emailProvider,
      config: { type: "object", additionalProperties: true },
      secret: { type: "string", writeOnly: true, "x-sensitive": true },
      enabled: { type: "boolean" },
      receiveEnabled: { type: "boolean" },
      expectedVersion: int64,
    }),
    MessagingEmailAccountResponse: object(["item", "requestId"], {
      item: { $ref: "#/components/schemas/MessagingEmailAccount" },
      requestId,
    }),
    MessagingEmailAccountListResponse: envelope("MessagingEmailAccountListResponse", "MessagingEmailAccount"),
    MessagingEmailSender: object(["id", "accountId", "accountName", "fromAddress", "enabled", "version"], {
      id,
      accountId: id,
      accountName: { type: "string", minLength: 1 },
      fromAddress: { type: "string", minLength: 3, maxLength: 320 },
      fromName: { type: "string", maxLength: 192 },
      enabled: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      version: int64,
    }),
    MessagingEmailSenderCreateRequest: object(["accountId", "fromAddress", "enabled"], {
      accountId: id,
      fromAddress: { type: "string", minLength: 3, maxLength: 320 },
      fromName: { type: "string", maxLength: 192 },
      enabled: { type: "boolean" },
    }),
    MessagingEmailSenderUpdateRequest: object(["fromAddress", "enabled", "expectedVersion"], {
      fromAddress: { type: "string", minLength: 3, maxLength: 320 },
      fromName: { type: "string", maxLength: 192 },
      enabled: { type: "boolean" },
      expectedVersion: int64,
    }),
    MessagingEmailSenderResponse: object(["item", "requestId"], {
      item: { $ref: "#/components/schemas/MessagingEmailSender" },
      requestId,
    }),
    MessagingEmailSenderListResponse: envelope("MessagingEmailSenderListResponse", "MessagingEmailSender"),
    MessagingEmailSendRuleStep: object(["senderId", "accountId", "accountName", "fromAddress"], {
      senderId: id,
      accountId: id,
      accountName: { type: "string", minLength: 1 },
      fromAddress: { type: "string", minLength: 3, maxLength: 320 },
      fromName: { type: "string", maxLength: 192 },
      enabled: { type: "boolean" },
    }),
    MessagingEmailSendRule: object(["scenario", "chain", "enabled", "version"], {
      scenario: { type: "string", enum: ["default", "verification_code", "system_notification", "marketing"] },
      chain: {
        type: "array",
        items: { $ref: "#/components/schemas/MessagingEmailSendRuleStep" },
      },
      enabled: { type: "boolean" },
      updatedAt: { type: "string", format: "date-time" },
      version: int64,
    }),
    MessagingEmailSendRuleUpdateRequest: object(["senderIds", "enabled", "expectedVersion"], {
      senderIds: {
        type: "array",
        maxItems: 50,
        items: id,
      },
      enabled: { type: "boolean" },
      expectedVersion: int64,
    }),
    MessagingEmailSendRuleResponse: object(["item", "requestId"], {
      item: { $ref: "#/components/schemas/MessagingEmailSendRule" },
      requestId,
    }),
    MessagingEmailSendRuleListResponse: envelope("MessagingEmailSendRuleListResponse", "MessagingEmailSendRule"),
    MessagingTemplate: object(["id", "channel", "templateCode", "name", "content", "approvalStatus", "status", "version"], {
      id,
      channel: directChannel,
      templateCode: { type: "string", minLength: 1, maxLength: 128 },
      name: { type: "string", minLength: 1, maxLength: 192 },
      subject: { type: "string" },
      content: { type: "string", minLength: 1 },
      variables: { type: "array", items: { type: "string" } },
      approvalStatus: { type: "string", enum: ["not_applicable", "pending", "approved", "rejected"] },
      approvalNote: { type: "string" },
      status: { type: "string", enum: ["draft", "active", "disabled"] },
      version: int64,
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      createdBy: { type: "string" },
    }),
    MessagingTemplateCreateRequest: object(["channel", "templateCode", "name", "content"], {
      channel: directChannel,
      templateCode: { type: "string", minLength: 1, maxLength: 128 },
      name: { type: "string", minLength: 1, maxLength: 192 },
      subject: { type: "string" },
      content: { type: "string", minLength: 1 },
      variables: { type: "array", items: { type: "string" } },
      approvalStatus: { type: "string", enum: ["not_applicable", "pending", "approved", "rejected"] },
      approvalNote: { type: "string" },
      status: { type: "string", enum: ["draft", "active", "disabled"] },
    }),
    MessagingTemplateUpdateRequest: object(["name", "content", "expectedVersion"], {
      name: { type: "string", minLength: 1, maxLength: 192 },
      subject: { type: "string" },
      content: { type: "string", minLength: 1 },
      variables: { type: "array", items: { type: "string" } },
      approvalStatus: { type: "string", enum: ["not_applicable", "pending", "approved", "rejected"] },
      approvalNote: { type: "string" },
      status: { type: "string", enum: ["draft", "active", "disabled"] },
      expectedVersion: int64,
    }),
    MessagingTemplateResponse: object(["item", "requestId"], {
      item: { $ref: "#/components/schemas/MessagingTemplate" },
      requestId,
    }),
    MessagingTemplateListResponse: envelope("MessagingTemplateListResponse", "MessagingTemplate"),
  };
}

function object(required, properties) {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties,
  };
}

function collectSchemaRefs(value, refs = new Set()) {
  if (!value || typeof value !== "object") {
    return refs;
  }

  if (typeof value.$ref === "string") {
    const match = value.$ref.match(/^#\/components\/schemas\/(.+)$/u);
    if (match) {
      refs.add(match[1]);
    }
  }

  for (const nested of Object.values(value)) {
    collectSchemaRefs(nested, refs);
  }

  return refs;
}

function schemasForFamily(family) {
  const allSchemas = schemas();
  const pending = ["ProblemDetail"];

  for (const routeItem of family.routes) {
    if (routeItem.requestSchema) {
      pending.push(routeItem.requestSchema);
    }
    pending.push(routeItem.responseSchema);
  }

  const selected = new Set();
  while (pending.length > 0) {
    const schemaName = pending.pop();
    if (!schemaName || selected.has(schemaName)) {
      continue;
    }
    const schema = allSchemas[schemaName];
    if (!schema) {
      throw new Error(`Schema ${schemaName} is referenced by ${family.family} but is not declared`);
    }
    selected.add(schemaName);
    for (const referencedSchema of collectSchemaRefs(schema)) {
      if (!selected.has(referencedSchema)) {
        pending.push(referencedSchema);
      }
    }
  }

  return Object.fromEntries([...selected].sort().map((schemaName) => [schemaName, allSchemas[schemaName]]));
}

function operation(family, routeItem) {
  const op = {
    tags: [family.tag],
    summary: routeItem.operationId,
    operationId: routeItem.operationId,
    parameters: [
      ...routeItem.parameters,
      ...(routeItem.idempotent ? [idempotencyHeaderParameter()] : []),
      ...(routeItem.method === "GET" ? pageParameters() : []),
    ],
    responses:
      routeItem.method === "DELETE"
        ? {
            204: noContentResponse(),
            ...problemResponses(),
          }
        : {
            200: jsonResponse(routeItem.responseSchema),
            ...problemResponses(),
          },
    security: security(),
    "x-sdkwork-owner": OWNER,
    "x-sdkwork-api-authority": family.apiAuthority,
    "x-sdkwork-domain": family.domain,
    "x-sdkwork-resource": routeItem.resource,
    "x-sdkwork-permission": `${routeItem.resource}.${routeItem.method.toLowerCase()}`,
    "x-sdkwork-tenant-scope": "tenant",
    "x-sdkwork-data-scope": "organization",
    "x-sdkwork-audit-event": routeItem.auditEvent,
    "x-sdkwork-idempotent": routeItem.idempotent,
    "x-sdkwork-deployment": "all",
    "x-sdkwork-source": `crates/${family.routeCrate}`,
    "x-sdkwork-source-route-crate": family.routeCrate,
    "x-sdkwork-server-request-id": true,
  };
  if (routeItem.requestSchema) {
    op.requestBody = requestBody(routeItem.requestSchema);
  }
  return op;
}

function buildOpenApi(family) {
  const paths = {};
  for (const routeItem of family.routes) {
    paths[routeItem.path] = {
      ...(paths[routeItem.path] ?? {}),
      [routeItem.method.toLowerCase()]: operation(family, routeItem),
    };
  }
  return {
    openapi: "3.1.2",
    info: {
      title: family.title,
      version: VERSION,
      description: family.description,
      "x-sdkwork-api-authority": family.apiAuthority,
      "x-sdkwork-sdk-family": family.family,
    },
    servers: [
      {
        url: "http://localhost:8080",
        description: "Local sdkwork-messaging runtime",
      },
    ],
    tags: [
      {
        name: family.tag,
        description: `${family.title} resources.`,
        "x-sdk-nested-resource-surface": true,
      },
    ],
    security: security(),
    paths,
    components: {
      securitySchemes: securitySchemes(),
      schemas: schemasForFamily(family),
    },
  };
}

function routeManifest(family) {
  return {
    schemaVersion: 1,
    kind: "sdkwork.route.manifest",
    packageName: family.routeCrate,
    surface: family.surface,
    owner: OWNER,
    domain: family.domain,
    capability: family.tag,
    apiAuthority: family.apiAuthority,
    sdkFamily: family.family,
    prefix: family.prefix,
    source: {
      crateRoot: `crates/${family.routeCrate}`,
      crateImport: family.routeCrate.replaceAll("-", "_"),
    },
    routes: family.routes.map((routeItem) => ({
      method: routeItem.method,
      path: routeItem.path,
      operationId: routeItem.operationId,
      tags: [family.tag],
      auth: {
        mode: family.auth,
        required: true,
      },
      handler: {
        module: "crate::handlers",
        name: routeItem.operationId.replaceAll(".", "_"),
      },
      schemas: {
        request: routeItem.requestSchema,
        response: routeItem.responseSchema,
        problem: "ProblemDetail",
      },
      idempotency: {
        required: routeItem.idempotent,
        header: routeItem.idempotent ? "Idempotency-Key" : null,
      },
      ownership: {
        owner: OWNER,
        apiAuthority: family.apiAuthority,
      },
      source: {
        file: "src/lib.rs",
        routeCrate: family.routeCrate,
      },
    })),
  };
}

function assembly(family) {
  return {
    workspace: family.family,
    title: family.title,
    apiVersion: VERSION,
    openapiVersion: "3.1.2",
    authoritySpec: `openapi/${family.apiAuthority}.openapi.yaml`,
    generationInputSpec: `openapi/${family.apiAuthority}.sdkgen.yaml`,
    derivedSpecs: {
      default: `openapi/${family.apiAuthority}.sdkgen.yaml`,
    },
    sdkOwner: OWNER,
    apiAuthority: family.apiAuthority,
    sdkDependencies: [],
    discoverySurface: {
      sdkTarget: family.sdkType,
      apiPrefix: family.prefix,
      schemaUrl: `${family.prefix.replace(/\/api$/, "")}/openapi.json`,
      generatedProtocols: ["http-openapi"],
      manualTransports: [],
    },
    languages: [
      {
        language: "typescript",
        workspace: `${family.family}-typescript`,
        generationState: "ready",
        releaseState: "not_published",
        packagePath: `${family.family}-typescript/generated/server-openapi`,
        manifestPath: `${family.family}-typescript/generated/server-openapi/package.json`,
        name: family.packageName,
        version: VERSION,
        generatedPath: `${family.family}-typescript/generated/server-openapi`,
      },
    ],
    metadata: {
      managedBy: "sdks/materialize-messaging-v3-openapi-boundaries.mjs",
      standardVersion: "2026-06-06",
    },
  };
}

function component(family) {
  return {
    schemaVersion: 1,
    name: family.family,
    type: "sdk-family",
    domain: family.domain,
    apiAuthority: family.apiAuthority,
    apiPrefix: family.prefix,
    sdkType: family.sdkType,
    languages: ["typescript"],
    generator: {
      package: "@sdkwork/sdk-generator",
      entrypoint: GENERATOR_PATH,
      standardProfile: "sdkwork-v3",
    },
    contracts: {
      sdkDependencies: [],
    },
    auth: {
      mode: family.auth,
      requestIdOwnership: "server",
    },
  };
}

function generateSdkScript(family) {
  return `param(
    [string[]]$Languages = @("typescript"),
    [string]$BaseUrl = "http://localhost:8080",
    [string]$SdkVersion = "1.0.0"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FamilyRoot = (Get-Item $ScriptDir).Parent.FullName
$MessagingRoot = (Get-Item $FamilyRoot).Parent.Parent.FullName
$GeneratorPath = "${GENERATOR_PATH}"
$InputPath = Join-Path $FamilyRoot "openapi\\${family.apiAuthority}.sdkgen.yaml"
$SdkName = "${family.family}"
$ApiPrefix = "${family.prefix}"
$PackageName = "${family.packageName}"

if (-not (Test-Path $GeneratorPath)) {
    throw "Canonical SDK generator not found: $GeneratorPath"
}
if (-not (Test-Path $InputPath)) {
    & node (Join-Path $MessagingRoot "sdks\\materialize-messaging-v3-openapi-boundaries.mjs")
}
if (-not (Test-Path $InputPath)) {
    throw "OpenAPI sdkgen input not found: $InputPath"
}

foreach ($LanguageValue in $Languages) {
    foreach ($LanguagePart in "$LanguageValue".Split(",")) {
        $Language = $LanguagePart.Trim()
        if ([string]::IsNullOrWhiteSpace($Language)) {
            continue
        }

        $LanguageWorkspace = Join-Path $FamilyRoot "$SdkName-$Language"
        $OutputPath = Join-Path $LanguageWorkspace "generated\\server-openapi"
        $ResolvedLanguageWorkspace = [System.IO.Path]::GetFullPath($LanguageWorkspace)
        $ResolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)
        $LanguageWorkspacePrefix = $ResolvedLanguageWorkspace.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

        if (-not $ResolvedOutputPath.StartsWith($LanguageWorkspacePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to clean SDK output outside language workspace: $ResolvedOutputPath"
        }

        if (Test-Path $OutputPath) {
            Remove-Item -LiteralPath $OutputPath -Recurse -Force
        }
        & node $GeneratorPath generate \`
            -i $InputPath \`
            -o $OutputPath \`
            -n $SdkName \`
            -t ${family.sdkType} \`
            -l $Language \`
            --fixed-sdk-version $SdkVersion \`
            --base-url $BaseUrl \`
            --api-prefix $ApiPrefix \`
            --package-name $PackageName \`
            --standard-profile sdkwork-v3 \`
            --sdk-root $FamilyRoot \`
            --sdk-name $SdkName \`
            --no-sync-published-version

        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
    }
}
`;
}

async function main() {
  for (const family of FAMILIES) {
    const openApi = alignOpenApiOperationPatterns(bootstrapOpenApiEnvelope(buildOpenApi(family))).document;
    const alignedFamily = {
      ...family,
      routes: family.routes.map((route) => ({
        ...route,
        operationId: openApi.paths[route.path][route.method.toLowerCase()].operationId,
      })),
    };
    await writeJson(
      path.join(ROOT, "sdks", "_route-manifests", family.surface, `${family.routeCrate}.route-manifest.json`),
      routeManifest(alignedFamily),
    );
    await writeJson(path.join(ROOT, "sdks", family.family, "openapi", `${family.apiAuthority}.openapi.yaml`), openApi);
    await writeJson(
      path.join(ROOT, "sdks", family.family, "openapi", `${family.apiAuthority}.sdkgen.yaml`),
      {
        ...openApi,
        "x-sdkwork-derived-from": `openapi/${family.apiAuthority}.openapi.yaml`,
      },
    );
    await writeJson(path.join(ROOT, "sdks", family.family, "sdk-manifest.json"), assembly(family));
    await writeJson(path.join(ROOT, "sdks", family.family, "specs", "component.spec.json"), component(family));
    await writeText(path.join(ROOT, "sdks", family.family, "bin", "generate-sdk.ps1"), generateSdkScript(family));
    await writeText(path.join(ROOT, "sdks", family.family, "README.md"), `# ${family.family}\n\n${family.description}\n`);
  }

  console.log(
    `Materialized sdkwork-messaging OpenAPI boundaries: ${FAMILIES.map((family) => `${family.family}: ${family.routes.length} routes`).join(", ")}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
