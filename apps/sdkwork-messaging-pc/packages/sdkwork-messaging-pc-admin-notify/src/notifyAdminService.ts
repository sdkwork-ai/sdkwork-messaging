//! Messaging admin service: channel configuration and message templates
//! through the injected `@sdkwork/messaging-backend-sdk` client.

import type {
  MessagingChannel,
  MessagingChannelUpdateRequest,
  MessagingTemplate,
  MessagingTemplateCreateRequest,
  MessagingTemplateUpdateRequest,
} from "@sdkwork/messaging-backend-sdk";

import { messagingBackendSdkClient } from "./sdk-client";

export type MessagingChannelType = "sms" | "email";

export type MessagingChannelProvider = "smtp" | "aliyun" | "tencent" | "generic_http";

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

function nextIdempotencyKey(): string {
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function retrieveChannel(channel: MessagingChannelType): Promise<MessagingChannel> {
  const response = await messagingBackendSdkClient().messaging.channels.retrieve(channel);
  return response.item;
}

async function updateChannel(
  channel: MessagingChannelType,
  input: MessagingChannelUpdateRequest,
): Promise<MessagingChannel> {
  const response = await messagingBackendSdkClient().messaging.channels.update(
    channel,
    input,
    { idempotencyKey: nextIdempotencyKey() },
  );
  return response.item;
}

async function listTemplates(params: {
  channel?: MessagingChannelType;
  status?: MessagingTemplateStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
}): Promise<MessagingTemplatePage> {
  const response = await messagingBackendSdkClient().messaging.templates.list({
    channel: params.channel,
    status: params.status,
    keyword: params.keyword,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  });
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
  retrieveChannel(channel: MessagingChannelType): Promise<MessagingChannel>;
  updateChannel(
    channel: MessagingChannelType,
    input: MessagingChannelUpdateRequest,
  ): Promise<MessagingChannel>;
  listTemplates(params: {
    channel?: MessagingChannelType;
    status?: MessagingTemplateStatus;
    keyword?: string;
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
    retrieveChannel,
    updateChannel,
    listTemplates,
    createTemplate,
    retrieveTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

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
