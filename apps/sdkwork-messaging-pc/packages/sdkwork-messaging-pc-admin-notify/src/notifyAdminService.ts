//! Messaging admin service: multi-provider channel configuration and message
//! templates through the injected `@sdkwork/messaging-backend-sdk` client.

import type {
  MessagingEmailAccount,
  MessagingEmailAccountCreateRequest,
  MessagingEmailAccountUpdateRequest,
  MessagingEmailSendRule,
  MessagingEmailSendRuleUpdateRequest,
  MessagingEmailSender,
  MessagingEmailSenderCreateRequest,
  MessagingEmailSenderUpdateRequest,
  MessagingSmsAccount,
  MessagingSmsAccountCreateRequest,
  MessagingSmsAccountUpdateRequest,
  MessagingSmsSendRule,
  MessagingSmsSendRuleUpdateRequest,
  MessagingSmsSignature,
  MessagingSmsSignatureCreateRequest,
  MessagingSmsSignatureUpdateRequest,
  MessagingTemplate,
  MessagingTemplateCreateRequest,
  MessagingTemplateUpdateRequest,
} from "@sdkwork/messaging-pc-core";

import { messagingBackendSdkClient } from "./sdk-client";

export type {
  MessagingEmailAccount,
  MessagingEmailAccountCreateRequest,
  MessagingEmailAccountUpdateRequest,
  MessagingEmailSendRule,
  MessagingEmailSendRuleStep,
  MessagingEmailSendRuleUpdateRequest,
  MessagingEmailSender,
  MessagingEmailSenderCreateRequest,
  MessagingEmailSenderUpdateRequest,
  MessagingSmsAccount,
  MessagingSmsAccountCreateRequest,
  MessagingSmsAccountUpdateRequest,
  MessagingSmsSendRule,
  MessagingSmsSendRuleStep,
  MessagingSmsSendRuleUpdateRequest,
  MessagingSmsSignature,
  MessagingSmsSignatureCreateRequest,
  MessagingSmsSignatureUpdateRequest,
} from "@sdkwork/messaging-pc-core";

export type MessagingChannelType = "sms" | "email";

export type MessagingEmailProvider =
  | "smtp"
  | "aliyun"
  | "tencent"
  | "tencent_mail"
  | "mail_139"
  | "gmail"
  | "microsoft"
  | "sendgrid"
  | "mailgun"
  | "amazon_ses"
  | "postmark"
  | "resend";

export type MessagingSmsProvider =
  | "aliyun"
  | "tencent"
  | "huawei"
  | "yuntongxun"
  | "submail"
  | "chuanglan"
  | "twilio"
  | "generic_http";

export type MessagingEmailSendScenario =
  | "default"
  | "verification_code"
  | "system_notification"
  | "marketing";

export type MessagingTemplateStatus = "draft" | "active" | "disabled";

export type MessagingTemplateApprovalStatus = "not_applicable" | "pending" | "approved" | "rejected";

export interface MessagingTemplatePage {
  items: MessagingTemplate[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

export interface MessagingEmailAccountPage {
  items: MessagingEmailAccount[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

export interface MessagingEmailSenderPage {
  items: MessagingEmailSender[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

export interface MessagingSmsAccountPage {
  items: MessagingSmsAccount[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

export interface MessagingSmsSignaturePage {
  items: MessagingSmsSignature[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * True when the transport error is an optimistic-concurrency conflict
 * (HTTP 409 / problem code 40901, DATABASE_SPEC §17). Duck-typed on the
 * transport SDK's `SdkError` to keep this package free of a direct
 * dependency on `@sdkwork/sdk-common`.
 */
export function isConflictError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const status = (error as { httpStatus?: unknown }).httpStatus;
  if (status === 409) {
    return true;
  }
  const problem = (error as { problem?: { code?: unknown } }).problem;
  return problem?.code === 40901;
}

function nextIdempotencyKey(): string {
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toPage<T>(response: { items: T[]; pageInfo: { page?: number; pageSize?: number; totalItems?: unknown; totalPages?: number; hasMore?: boolean } }): {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
} {
  const pageInfo = response.pageInfo;
  return {
    items: response.items,
    page: pageInfo.page ?? 1,
    pageSize: pageInfo.pageSize ?? 20,
    totalItems: Number(pageInfo.totalItems ?? 0),
    totalPages: pageInfo.totalPages ?? 0,
    hasMore: pageInfo.hasMore ?? false,
  };
}

async function listEmailAccounts(params: {
  page?: number;
  pageSize?: number;
}): Promise<MessagingEmailAccountPage> {
  const response = await messagingBackendSdkClient().messaging.emailAccounts.list({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 50,
  });
  return toPage(response);
}

async function createEmailAccount(
  input: MessagingEmailAccountCreateRequest,
): Promise<MessagingEmailAccount> {
  const response = await messagingBackendSdkClient().messaging.emailAccounts.create(
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function updateEmailAccount(
  accountId: string,
  input: MessagingEmailAccountUpdateRequest,
): Promise<MessagingEmailAccount> {
  const response = await messagingBackendSdkClient().messaging.emailAccounts.update(
    accountId,
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function deleteEmailAccount(accountId: string): Promise<void> {
  await messagingBackendSdkClient().messaging.emailAccounts.delete(accountId, {
    idempotencyKey: nextIdempotencyKey(),
  });
}

async function listEmailSenders(params: {
  accountId?: string;
  page?: number;
  pageSize?: number;
}): Promise<MessagingEmailSenderPage> {
  const response = await messagingBackendSdkClient().messaging.emailSenders.list({
    accountId: params.accountId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 100,
  });
  return toPage(response);
}

async function createEmailSender(
  input: MessagingEmailSenderCreateRequest,
): Promise<MessagingEmailSender> {
  const response = await messagingBackendSdkClient().messaging.emailSenders.create(
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function updateEmailSender(
  senderId: string,
  input: MessagingEmailSenderUpdateRequest,
): Promise<MessagingEmailSender> {
  const response = await messagingBackendSdkClient().messaging.emailSenders.update(
    senderId,
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function deleteEmailSender(senderId: string): Promise<void> {
  await messagingBackendSdkClient().messaging.emailSenders.delete(senderId, {
    idempotencyKey: nextIdempotencyKey(),
  });
}

async function listEmailSendRules(): Promise<MessagingEmailSendRule[]> {
  const response = await messagingBackendSdkClient().messaging.emailSendRules.list();
  return response.items;
}

async function updateEmailSendRule(
  scenario: MessagingEmailSendScenario,
  input: MessagingEmailSendRuleUpdateRequest,
): Promise<MessagingEmailSendRule> {
  const response = await messagingBackendSdkClient().messaging.emailSendRules.update(
    scenario,
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function listSmsAccounts(params: {
  page?: number;
  pageSize?: number;
}): Promise<MessagingSmsAccountPage> {
  const response = await messagingBackendSdkClient().messaging.smsAccounts.list({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 50,
  });
  return toPage(response);
}

async function createSmsAccount(
  input: MessagingSmsAccountCreateRequest,
): Promise<MessagingSmsAccount> {
  const response = await messagingBackendSdkClient().messaging.smsAccounts.create(
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function updateSmsAccount(
  accountId: string,
  input: MessagingSmsAccountUpdateRequest,
): Promise<MessagingSmsAccount> {
  const response = await messagingBackendSdkClient().messaging.smsAccounts.update(
    accountId,
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function deleteSmsAccount(accountId: string): Promise<void> {
  await messagingBackendSdkClient().messaging.smsAccounts.delete(accountId, {
    idempotencyKey: nextIdempotencyKey(),
  });
}

async function listSmsSignatures(params: {
  accountId?: string;
  page?: number;
  pageSize?: number;
}): Promise<MessagingSmsSignaturePage> {
  const response = await messagingBackendSdkClient().messaging.smsSignatures.list({
    accountId: params.accountId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 100,
  });
  return toPage(response);
}

async function createSmsSignature(
  input: MessagingSmsSignatureCreateRequest,
): Promise<MessagingSmsSignature> {
  const response = await messagingBackendSdkClient().messaging.smsSignatures.create(
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function updateSmsSignature(
  signatureId: string,
  input: MessagingSmsSignatureUpdateRequest,
): Promise<MessagingSmsSignature> {
  const response = await messagingBackendSdkClient().messaging.smsSignatures.update(
    signatureId,
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function deleteSmsSignature(signatureId: string): Promise<void> {
  await messagingBackendSdkClient().messaging.smsSignatures.delete(signatureId, {
    idempotencyKey: nextIdempotencyKey(),
  });
}

async function listSmsSendRules(): Promise<MessagingSmsSendRule[]> {
  const response = await messagingBackendSdkClient().messaging.smsSendRules.list();
  return response.items;
}

async function updateSmsSendRule(
  scenario: MessagingEmailSendScenario,
  input: MessagingSmsSendRuleUpdateRequest,
): Promise<MessagingSmsSendRule> {
  const response = await messagingBackendSdkClient().messaging.smsSendRules.update(
    scenario,
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function listTemplates(params: {
  channel?: MessagingChannelType;
  status?: MessagingTemplateStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<MessagingTemplatePage> {
  const response = await messagingBackendSdkClient().messaging.templates.list({
    channel: params.channel,
    status: params.status,
    q: params.q,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  });
  return toPage(response);
}

async function createTemplate(input: MessagingTemplateCreateRequest): Promise<MessagingTemplate> {
  const response = await messagingBackendSdkClient().messaging.templates.create(
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function retrieveTemplate(templateId: string): Promise<MessagingTemplate> {
  const response = await messagingBackendSdkClient().messaging.templates.retrieve(templateId);
  return response.item;
}

async function updateTemplate(
  templateId: string,
  input: MessagingTemplateUpdateRequest,
): Promise<MessagingTemplate> {
  const response = await messagingBackendSdkClient().messaging.templates.update(
    templateId,
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function deleteTemplate(templateId: string): Promise<void> {
  await messagingBackendSdkClient().messaging.templates.delete(templateId, {
    idempotencyKey: nextIdempotencyKey(),
  });
}

export interface NotifyAdminService {
  listEmailAccounts(params: { page?: number; pageSize?: number }): Promise<MessagingEmailAccountPage>;
  createEmailAccount(input: MessagingEmailAccountCreateRequest): Promise<MessagingEmailAccount>;
  updateEmailAccount(
    accountId: string,
    input: MessagingEmailAccountUpdateRequest,
  ): Promise<MessagingEmailAccount>;
  deleteEmailAccount(accountId: string): Promise<void>;
  listEmailSenders(params: {
    accountId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<MessagingEmailSenderPage>;
  createEmailSender(input: MessagingEmailSenderCreateRequest): Promise<MessagingEmailSender>;
  updateEmailSender(
    senderId: string,
    input: MessagingEmailSenderUpdateRequest,
  ): Promise<MessagingEmailSender>;
  deleteEmailSender(senderId: string): Promise<void>;
  listEmailSendRules(): Promise<MessagingEmailSendRule[]>;
  updateEmailSendRule(
    scenario: MessagingEmailSendScenario,
    input: MessagingEmailSendRuleUpdateRequest,
  ): Promise<MessagingEmailSendRule>;
  listSmsAccounts(params: { page?: number; pageSize?: number }): Promise<MessagingSmsAccountPage>;
  createSmsAccount(input: MessagingSmsAccountCreateRequest): Promise<MessagingSmsAccount>;
  updateSmsAccount(
    accountId: string,
    input: MessagingSmsAccountUpdateRequest,
  ): Promise<MessagingSmsAccount>;
  deleteSmsAccount(accountId: string): Promise<void>;
  listSmsSignatures(params: {
    accountId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<MessagingSmsSignaturePage>;
  createSmsSignature(input: MessagingSmsSignatureCreateRequest): Promise<MessagingSmsSignature>;
  updateSmsSignature(
    signatureId: string,
    input: MessagingSmsSignatureUpdateRequest,
  ): Promise<MessagingSmsSignature>;
  deleteSmsSignature(signatureId: string): Promise<void>;
  listSmsSendRules(): Promise<MessagingSmsSendRule[]>;
  updateSmsSendRule(
    scenario: MessagingEmailSendScenario,
    input: MessagingSmsSendRuleUpdateRequest,
  ): Promise<MessagingSmsSendRule>;
  listTemplates(params: {
    channel?: MessagingChannelType;
    status?: MessagingTemplateStatus;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<MessagingTemplatePage>;
  createTemplate(input: MessagingTemplateCreateRequest): Promise<MessagingTemplate>;
  retrieveTemplate(templateId: string): Promise<MessagingTemplate>;
  updateTemplate(
    templateId: string,
    input: MessagingTemplateUpdateRequest,
  ): Promise<MessagingTemplate>;
  deleteTemplate(templateId: string): Promise<void>;
}

export function createNotifyAdminService(): NotifyAdminService {
  return {
    listEmailAccounts,
    createEmailAccount,
    updateEmailAccount,
    deleteEmailAccount,
    listEmailSenders,
    createEmailSender,
    updateEmailSender,
    deleteEmailSender,
    listEmailSendRules,
    updateEmailSendRule,
    listSmsAccounts,
    createSmsAccount,
    updateSmsAccount,
    deleteSmsAccount,
    listSmsSignatures,
    createSmsSignature,
    updateSmsSignature,
    deleteSmsSignature,
    listSmsSendRules,
    updateSmsSendRule,
    listTemplates,
    createTemplate,
    retrieveTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

/**
 * Process-wide default service instance for pages that are not given an
 * injected `service` prop. The underlying transport client is resolved through
 * the holder at call time, so this instance stays valid even when the host
 * configures the SDK client after module load; creating it per render would
 * change callback identities every render and retrigger page load effects.
 */
export const defaultNotifyAdminService: NotifyAdminService = createNotifyAdminService();

export function extractTemplateVariables(content: string): string[] {
  const variables: string[] = [];
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/gu;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    if (!variables.includes(name)) {
      variables.push(name);
    }
  }
  return variables;
}
