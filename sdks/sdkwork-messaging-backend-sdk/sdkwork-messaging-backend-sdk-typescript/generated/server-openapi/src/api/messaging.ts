import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { MessagingAnnouncement, MessagingAnnouncementPublishRequest, MessagingAnnouncementResponse, MessagingChannelResponse, MessagingChannelUpdateRequest, MessagingNotification, MessagingNotificationCreateRequest, MessagingNotificationResponse, MessagingOutboundMessage, MessagingOutboundMessageResponse, MessagingOutboundMessageSendRequest, MessagingPushMessage, MessagingPushMessageResponse, MessagingPushMessageSendRequest, MessagingTemplate, MessagingTemplateCreateRequest, MessagingTemplateResponse, MessagingTemplateUpdateRequest, MessagingVerificationPolicy, MessagingVerificationPolicyResponse, MessagingVerificationPolicyUpdateRequest, PageInfo } from '../types';


export interface MessagingTemplatesListParams {
  channel?: 'sms' | 'email';
  status?: 'draft' | 'active' | 'disabled';
  keyword?: string;
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
      { name: 'keyword', value: params?.keyword, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<{ items: MessagingTemplate[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/templates`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.templates.create */
  async create(body: MessagingTemplateCreateRequest, params: MessagingTemplatesCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingTemplateResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingTemplateResponse>(backendApiPath(`/messaging/templates`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** messaging.templates.retrieve */
  async retrieve(templateId: string, params?: MessagingTemplatesRetrieveParams, requestOptions?: ApiRequestOptions): Promise<MessagingTemplateResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<MessagingTemplateResponse>(appendQueryString(backendApiPath(`/messaging/templates/${serializePathParameter(templateId, { name: 'templateId', style: 'simple', explode: false })}`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** messaging.templates.update */
  async update(templateId: string, body: MessagingTemplateUpdateRequest, params: MessagingTemplatesUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingTemplateResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingTemplateResponse>(backendApiPath(`/messaging/templates/${serializePathParameter(templateId, { name: 'templateId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** messaging.templates.delete */
  async delete(templateId: string, params: MessagingTemplatesDeleteParams, requestOptions?: ApiRequestOptions): Promise<void> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<void>(backendApiPath(`/messaging/templates/${serializePathParameter(templateId, { name: 'templateId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any, headers: requestHeaders });
  }
}

export interface MessagingChannelsRetrieveParams {
  page?: number;
  pageSize?: number;
}

export interface MessagingChannelsUpdateParams {
  idempotencyKey: string;
}

export class MessagingChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** messaging.channels.retrieve */
  async retrieve(channel: 'sms' | 'email', params?: MessagingChannelsRetrieveParams, requestOptions?: ApiRequestOptions): Promise<MessagingChannelResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<MessagingChannelResponse>(appendQueryString(backendApiPath(`/messaging/channels/${serializePathParameter(channel, { name: 'channel', style: 'simple', explode: false })}`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** messaging.channels.update */
  async update(channel: 'sms' | 'email', body: MessagingChannelUpdateRequest, params: MessagingChannelsUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingChannelResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingChannelResponse>(backendApiPath(`/messaging/channels/${serializePathParameter(channel, { name: 'channel', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
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
    return this.client.request<{ items: MessagingVerificationPolicy[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/verification_policies`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.verificationPolicies.update */
  async update(policyId: string, body: MessagingVerificationPolicyUpdateRequest, params: MessagingVerificationPoliciesUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingVerificationPolicyResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingVerificationPolicyResponse>(backendApiPath(`/messaging/verification_policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
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
    return this.client.request<{ items: MessagingOutboundMessage[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/outbound_messages`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.outboundMessages.send */
  async create(body: MessagingOutboundMessageSendRequest, params: MessagingOutboundMessagesCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingOutboundMessageResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingOutboundMessageResponse>(backendApiPath(`/messaging/outbound_messages`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
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
    return this.client.request<{ items: MessagingPushMessage[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/push_messages`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.pushMessages.send */
  async create(body: MessagingPushMessageSendRequest, params: MessagingPushMessagesCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingPushMessageResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingPushMessageResponse>(backendApiPath(`/messaging/push_messages`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
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
    return this.client.request<{ items: MessagingAnnouncement[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/announcements`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.announcements.publish */
  async create(body: MessagingAnnouncementPublishRequest, params: MessagingAnnouncementsCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingAnnouncementResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingAnnouncementResponse>(backendApiPath(`/messaging/announcements`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
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
    return this.client.request<{ items: MessagingNotification[]; pageInfo: PageInfo; }>(appendQueryString(backendApiPath(`/messaging/notifications`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** messaging.notifications.create */
  async create(body: MessagingNotificationCreateRequest, params: MessagingNotificationsCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingNotificationResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<MessagingNotificationResponse>(backendApiPath(`/messaging/notifications`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export class MessagingApi {
  private client: HttpClient;
  public readonly notifications: MessagingNotificationsApi;
  public readonly announcements: MessagingAnnouncementsApi;
  public readonly pushMessages: MessagingPushMessagesApi;
  public readonly outboundMessages: MessagingOutboundMessagesApi;
  public readonly verificationPolicies: MessagingVerificationPoliciesApi;
  public readonly channels: MessagingChannelsApi;
  public readonly templates: MessagingTemplatesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.notifications = new MessagingNotificationsApi(client);
    this.announcements = new MessagingAnnouncementsApi(client);
    this.pushMessages = new MessagingPushMessagesApi(client);
    this.outboundMessages = new MessagingOutboundMessagesApi(client);
    this.verificationPolicies = new MessagingVerificationPoliciesApi(client);
    this.channels = new MessagingChannelsApi(client);
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
