import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { MessagingAnnouncement, MessagingAnnouncementPublishRequest, MessagingAnnouncementResponse, MessagingEmailAccount, MessagingEmailAccountCreateRequest, MessagingEmailAccountResponse, MessagingEmailAccountUpdateRequest, MessagingEmailSender, MessagingEmailSenderCreateRequest, MessagingEmailSenderResponse, MessagingEmailSenderUpdateRequest, MessagingEmailSendRule, MessagingEmailSendRuleResponse, MessagingEmailSendRuleUpdateRequest, MessagingNotification, MessagingNotificationCreateRequest, MessagingNotificationResponse, MessagingOutboundMessage, MessagingOutboundMessageResponse, MessagingOutboundMessageSendRequest, MessagingPushMessage, MessagingPushMessageResponse, MessagingPushMessageSendRequest, MessagingSmsAccount, MessagingSmsAccountCreateRequest, MessagingSmsAccountResponse, MessagingSmsAccountUpdateRequest, MessagingSmsSendRule, MessagingSmsSendRuleResponse, MessagingSmsSendRuleUpdateRequest, MessagingSmsSignature, MessagingSmsSignatureCreateRequest, MessagingSmsSignatureResponse, MessagingSmsSignatureUpdateRequest, MessagingTemplate, MessagingTemplateCreateRequest, MessagingTemplateResponse, MessagingTemplateUpdateRequest, MessagingVerificationPolicy, MessagingVerificationPolicyResponse, MessagingVerificationPolicyUpdateRequest, PageInfo } from '../types';


export interface MessagingTemplatesListParams {
  channel?: 'sms' | 'email';
  status?: 'draft' | 'active' | 'disabled';
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface MessagingTemplatesCreateParams {
  idempotencyKey: string;
}

export interface MessagingTemplatesRetrieveParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingTemplatesUpdateParams {
  idempotencyKey: string;
}

export interface MessagingTemplatesDeleteParams {
  idempotencyKey: string;
}

export class MessagingTemplatesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.templates.list */
  async list(params?: MessagingTemplatesListParams, requestOptions?: ApiRequestOptions): Promise<{ items: MessagingTemplate[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'channel', value: params?.channel, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingTemplate[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/templates`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.templates.create */
  async create(body: MessagingTemplateCreateRequest, params: MessagingTemplatesCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingTemplateResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingTemplateResponse>(backendApiPath(`/messaging/templates`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }

/** messaging.templates.retrieve */
  async retrieve(templateId: string, params?: MessagingTemplatesRetrieveParams, requestOptions?: ApiRequestOptions): Promise<MessagingTemplateResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<MessagingTemplateResponse>(appendQueryString(backendApiPath(`/messaging/templates/${serializePathParameter(templateId, { name: 'templateId', style: 'simple', explode: false })}`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** messaging.templates.update */
  async update(templateId: string, body: MessagingTemplateUpdateRequest, params: MessagingTemplatesUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingTemplateResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingTemplateResponse>(backendApiPath(`/messaging/templates/${serializePathParameter(templateId, { name: 'templateId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }

/** messaging.templates.delete */
  async delete(templateId: string, params: MessagingTemplatesDeleteParams, requestOptions?: ApiRequestOptions): Promise<void> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<void>(backendApiPath(`/messaging/templates/${serializePathParameter(templateId, { name: 'templateId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any, ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export interface MessagingSmsSendRulesListParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingSmsSendRulesUpdateParams {
  idempotencyKey: string;
}

export class MessagingSmsSendRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.smsSendRules.list */
  async list(params?: MessagingSmsSendRulesListParams, requestOptions?: ApiRequestOptions): Promise<{ items: MessagingSmsSendRule[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingSmsSendRule[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/sms/send_rules`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.smsSendRules.update */
  async update(scenario: 'default' | 'verification_code' | 'system_notification' | 'marketing', body: MessagingSmsSendRuleUpdateRequest, params: MessagingSmsSendRulesUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingSmsSendRuleResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingSmsSendRuleResponse>(backendApiPath(`/messaging/sms/send_rules/${serializePathParameter(scenario, { name: 'scenario', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface MessagingSmsSignaturesListParams {
  accountId?: string;
  page?: number;
  pageSize?: number;
}

export interface MessagingSmsSignaturesCreateParams {
  idempotencyKey: string;
}

export interface MessagingSmsSignaturesRetrieveParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingSmsSignaturesUpdateParams {
  idempotencyKey: string;
}

export interface MessagingSmsSignaturesDeleteParams {
  idempotencyKey: string;
}

export class MessagingSmsSignaturesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.smsSignatures.list */
  async list(params?: MessagingSmsSignaturesListParams, requestOptions?: ApiRequestOptions): Promise<{ items: MessagingSmsSignature[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'account_id', value: params?.accountId, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingSmsSignature[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/sms/signatures`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.smsSignatures.create */
  async create(body: MessagingSmsSignatureCreateRequest, params: MessagingSmsSignaturesCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingSmsSignatureResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingSmsSignatureResponse>(backendApiPath(`/messaging/sms/signatures`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }

/** messaging.smsSignatures.retrieve */
  async retrieve(signatureId: string, params?: MessagingSmsSignaturesRetrieveParams, requestOptions?: ApiRequestOptions): Promise<MessagingSmsSignatureResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<MessagingSmsSignatureResponse>(appendQueryString(backendApiPath(`/messaging/sms/signatures/${serializePathParameter(signatureId, { name: 'signatureId', style: 'simple', explode: false })}`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** messaging.smsSignatures.update */
  async update(signatureId: string, body: MessagingSmsSignatureUpdateRequest, params: MessagingSmsSignaturesUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingSmsSignatureResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingSmsSignatureResponse>(backendApiPath(`/messaging/sms/signatures/${serializePathParameter(signatureId, { name: 'signatureId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }

/** messaging.smsSignatures.delete */
  async delete(signatureId: string, params: MessagingSmsSignaturesDeleteParams, requestOptions?: ApiRequestOptions): Promise<void> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<void>(backendApiPath(`/messaging/sms/signatures/${serializePathParameter(signatureId, { name: 'signatureId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any, ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export interface MessagingSmsAccountsListParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingSmsAccountsCreateParams {
  idempotencyKey: string;
}

export interface MessagingSmsAccountsRetrieveParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingSmsAccountsUpdateParams {
  idempotencyKey: string;
}

export interface MessagingSmsAccountsDeleteParams {
  idempotencyKey: string;
}

export class MessagingSmsAccountsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.smsAccounts.list */
  async list(params?: MessagingSmsAccountsListParams, requestOptions?: ApiRequestOptions): Promise<{ items: MessagingSmsAccount[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingSmsAccount[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/sms/accounts`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.smsAccounts.create */
  async create(body: MessagingSmsAccountCreateRequest, params: MessagingSmsAccountsCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingSmsAccountResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingSmsAccountResponse>(backendApiPath(`/messaging/sms/accounts`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }

/** messaging.smsAccounts.retrieve */
  async retrieve(accountId: string, params?: MessagingSmsAccountsRetrieveParams, requestOptions?: ApiRequestOptions): Promise<MessagingSmsAccountResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<MessagingSmsAccountResponse>(appendQueryString(backendApiPath(`/messaging/sms/accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** messaging.smsAccounts.update */
  async update(accountId: string, body: MessagingSmsAccountUpdateRequest, params: MessagingSmsAccountsUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingSmsAccountResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingSmsAccountResponse>(backendApiPath(`/messaging/sms/accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }

/** messaging.smsAccounts.delete */
  async delete(accountId: string, params: MessagingSmsAccountsDeleteParams, requestOptions?: ApiRequestOptions): Promise<void> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<void>(backendApiPath(`/messaging/sms/accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any, ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export interface MessagingEmailSendRulesListParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingEmailSendRulesUpdateParams {
  idempotencyKey: string;
}

export class MessagingEmailSendRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.emailSendRules.list */
  async list(params?: MessagingEmailSendRulesListParams, requestOptions?: ApiRequestOptions): Promise<{ items: MessagingEmailSendRule[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingEmailSendRule[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/email/send_rules`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.emailSendRules.update */
  async update(scenario: 'default' | 'verification_code' | 'system_notification' | 'marketing', body: MessagingEmailSendRuleUpdateRequest, params: MessagingEmailSendRulesUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingEmailSendRuleResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingEmailSendRuleResponse>(backendApiPath(`/messaging/email/send_rules/${serializePathParameter(scenario, { name: 'scenario', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface MessagingEmailSendersListParams {
  accountId?: string;
  page?: number;
  pageSize?: number;
}

export interface MessagingEmailSendersCreateParams {
  idempotencyKey: string;
}

export interface MessagingEmailSendersRetrieveParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingEmailSendersUpdateParams {
  idempotencyKey: string;
}

export interface MessagingEmailSendersDeleteParams {
  idempotencyKey: string;
}

export class MessagingEmailSendersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.emailSenders.list */
  async list(params?: MessagingEmailSendersListParams, requestOptions?: ApiRequestOptions): Promise<{ items: MessagingEmailSender[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'account_id', value: params?.accountId, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingEmailSender[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/email/senders`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.emailSenders.create */
  async create(body: MessagingEmailSenderCreateRequest, params: MessagingEmailSendersCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingEmailSenderResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingEmailSenderResponse>(backendApiPath(`/messaging/email/senders`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }

/** messaging.emailSenders.retrieve */
  async retrieve(senderId: string, params?: MessagingEmailSendersRetrieveParams, requestOptions?: ApiRequestOptions): Promise<MessagingEmailSenderResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<MessagingEmailSenderResponse>(appendQueryString(backendApiPath(`/messaging/email/senders/${serializePathParameter(senderId, { name: 'senderId', style: 'simple', explode: false })}`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** messaging.emailSenders.update */
  async update(senderId: string, body: MessagingEmailSenderUpdateRequest, params: MessagingEmailSendersUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingEmailSenderResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingEmailSenderResponse>(backendApiPath(`/messaging/email/senders/${serializePathParameter(senderId, { name: 'senderId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }

/** messaging.emailSenders.delete */
  async delete(senderId: string, params: MessagingEmailSendersDeleteParams, requestOptions?: ApiRequestOptions): Promise<void> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<void>(backendApiPath(`/messaging/email/senders/${serializePathParameter(senderId, { name: 'senderId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any, ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export interface MessagingEmailAccountsListParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingEmailAccountsCreateParams {
  idempotencyKey: string;
}

export interface MessagingEmailAccountsRetrieveParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingEmailAccountsUpdateParams {
  idempotencyKey: string;
}

export interface MessagingEmailAccountsDeleteParams {
  idempotencyKey: string;
}

export class MessagingEmailAccountsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.emailAccounts.list */
  async list(params?: MessagingEmailAccountsListParams, requestOptions?: ApiRequestOptions): Promise<{ items: MessagingEmailAccount[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingEmailAccount[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/email/accounts`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.emailAccounts.create */
  async create(body: MessagingEmailAccountCreateRequest, params: MessagingEmailAccountsCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingEmailAccountResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingEmailAccountResponse>(backendApiPath(`/messaging/email/accounts`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }

/** messaging.emailAccounts.retrieve */
  async retrieve(accountId: string, params?: MessagingEmailAccountsRetrieveParams, requestOptions?: ApiRequestOptions): Promise<MessagingEmailAccountResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<MessagingEmailAccountResponse>(appendQueryString(backendApiPath(`/messaging/email/accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** messaging.emailAccounts.update */
  async update(accountId: string, body: MessagingEmailAccountUpdateRequest, params: MessagingEmailAccountsUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingEmailAccountResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingEmailAccountResponse>(backendApiPath(`/messaging/email/accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }

/** messaging.emailAccounts.delete */
  async delete(accountId: string, params: MessagingEmailAccountsDeleteParams, requestOptions?: ApiRequestOptions): Promise<void> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<void>(backendApiPath(`/messaging/email/accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any, ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export interface MessagingVerificationPoliciesListParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingVerificationPoliciesUpdateParams {
  idempotencyKey: string;
}

export class MessagingVerificationPoliciesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.verificationPolicies.list */
  async list(params?: MessagingVerificationPoliciesListParams, requestOptions?: ApiRequestOptions): Promise<{ items: MessagingVerificationPolicy[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingVerificationPolicy[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/verification_policies`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.verificationPolicies.update */
  async update(policyId: string, body: MessagingVerificationPolicyUpdateRequest, params: MessagingVerificationPoliciesUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingVerificationPolicyResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingVerificationPolicyResponse>(backendApiPath(`/messaging/verification_policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PUT' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface MessagingOutboundMessagesListParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingOutboundMessagesCreateParams {
  idempotencyKey: string;
}

export class MessagingOutboundMessagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.outboundMessages.list */
  async list(params?: MessagingOutboundMessagesListParams, requestOptions?: ApiRequestOptions): Promise<{ items: MessagingOutboundMessage[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingOutboundMessage[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/outbound_messages`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.outboundMessages.send */
  async create(body: MessagingOutboundMessageSendRequest, params: MessagingOutboundMessagesCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingOutboundMessageResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingOutboundMessageResponse>(backendApiPath(`/messaging/outbound_messages`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface MessagingPushMessagesListParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingPushMessagesCreateParams {
  idempotencyKey: string;
}

export class MessagingPushMessagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.pushMessages.list */
  async list(params?: MessagingPushMessagesListParams, requestOptions?: ApiRequestOptions): Promise<{ items: MessagingPushMessage[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingPushMessage[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/push_messages`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.pushMessages.send */
  async create(body: MessagingPushMessageSendRequest, params: MessagingPushMessagesCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingPushMessageResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingPushMessageResponse>(backendApiPath(`/messaging/push_messages`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface MessagingAnnouncementsListParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingAnnouncementsCreateParams {
  idempotencyKey: string;
}

export class MessagingAnnouncementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.announcements.list */
  async list(params?: MessagingAnnouncementsListParams, requestOptions?: ApiRequestOptions): Promise<{ items: MessagingAnnouncement[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingAnnouncement[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/announcements`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.announcements.publish */
  async create(body: MessagingAnnouncementPublishRequest, params: MessagingAnnouncementsCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingAnnouncementResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingAnnouncementResponse>(backendApiPath(`/messaging/announcements`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export interface MessagingNotificationsListParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingNotificationsCreateParams {
  idempotencyKey: string;
}

export class MessagingNotificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.notifications.list */
  async list(params?: MessagingNotificationsListParams, requestOptions?: ApiRequestOptions): Promise<{ items: MessagingNotification[]; pageInfo: PageInfo; }> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingNotification[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/notifications`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.notifications.create */
  async create(body: MessagingNotificationCreateRequest, params: MessagingNotificationsCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingNotificationResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingNotificationResponse>(backendApiPath(`/messaging/notifications`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}), sdkworkUnwrapKind: 'item' });
  }
}

export class MessagingApi {
  public readonly notifications: MessagingNotificationsApi;
  public readonly announcements: MessagingAnnouncementsApi;
  public readonly pushMessages: MessagingPushMessagesApi;
  public readonly outboundMessages: MessagingOutboundMessagesApi;
  public readonly verificationPolicies: MessagingVerificationPoliciesApi;
  public readonly emailAccounts: MessagingEmailAccountsApi;
  public readonly emailSenders: MessagingEmailSendersApi;
  public readonly emailSendRules: MessagingEmailSendRulesApi;
  public readonly smsAccounts: MessagingSmsAccountsApi;
  public readonly smsSignatures: MessagingSmsSignaturesApi;
  public readonly smsSendRules: MessagingSmsSendRulesApi;
  public readonly templates: MessagingTemplatesApi;

  constructor(client: HttpClient) {
    this.notifications = new MessagingNotificationsApi(client);
    this.announcements = new MessagingAnnouncementsApi(client);
    this.pushMessages = new MessagingPushMessagesApi(client);
    this.outboundMessages = new MessagingOutboundMessagesApi(client);
    this.verificationPolicies = new MessagingVerificationPoliciesApi(client);
    this.emailAccounts = new MessagingEmailAccountsApi(client);
    this.emailSenders = new MessagingEmailSendersApi(client);
    this.emailSendRules = new MessagingEmailSendRulesApi(client);
    this.smsAccounts = new MessagingSmsAccountsApi(client);
    this.smsSignatures = new MessagingSmsSignaturesApi(client);
    this.smsSendRules = new MessagingSmsSendRulesApi(client);
    this.templates = new MessagingTemplatesApi(client);
  }

}

export function createMessagingApi(client: HttpClient): MessagingApi {
  return new MessagingApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
function buildRequestHeaders(
  headers: Record<string, HeaderParameterSpec | undefined>,
  cookies: Record<string, HeaderParameterSpec | undefined> = {},
): Record<string, string> | undefined {
  const requestHeaders: Record<string, string> = {};

  for (const [name, parameter] of Object.entries(headers)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== undefined) {
      requestHeaders[name] = serialized;
    }
  }

  const cookieHeader = buildCookieHeader(cookies);
  if (cookieHeader) {
    requestHeaders.Cookie = requestHeaders.Cookie
      ? `${requestHeaders.Cookie}; ${cookieHeader}`
      : cookieHeader;
  }

  return Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined;
}

interface HeaderParameterSpec {
  value: unknown;
  style: string;
  explode: boolean;
  contentType?: string;
}

function buildCookieHeader(cookies: Record<string, HeaderParameterSpec | undefined>): string | undefined {
  const pairs: string[] = [];
  for (const [name, parameter] of Object.entries(cookies)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== undefined) {
      pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(serialized)}`);
    }
  }
  return pairs.length > 0 ? pairs.join('; ') : undefined;
}

function serializeParameterValue(parameter: HeaderParameterSpec | undefined): string | undefined {
  const value = parameter?.value;
  if (value === undefined || value === null) {
    return undefined;
  }
  if (parameter?.contentType) {
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeHeaderPrimitive(item)).join(',');
  }
  if (typeof value === 'object' && value !== null) {
    return serializeHeaderObject(value as Record<string, unknown>, parameter?.explode === true);
  }
  return serializeHeaderPrimitive(value);
}

function serializeHeaderObject(value: Record<string, unknown>, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (explode) {
    return entries.map(([key, entryValue]) => `${key}=${serializeHeaderPrimitive(entryValue)}`).join(',');
  }
  return entries.flatMap(([key, entryValue]) => [key, serializeHeaderPrimitive(entryValue)]).join(',');
}

function serializeHeaderPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}
