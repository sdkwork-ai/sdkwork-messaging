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
export declare class MessagingTemplatesApi {
    private client;
    constructor(client: HttpClient);
    /** messaging.templates.list */
    list(params?: MessagingTemplatesListParams, requestOptions?: ApiRequestOptions): Promise<{
        items: MessagingTemplate[];
        pageInfo: PageInfo;
    }>;
    /** messaging.templates.create */
    create(body: MessagingTemplateCreateRequest, params: MessagingTemplatesCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingTemplateResponse>;
    /** messaging.templates.retrieve */
    retrieve(templateId: string, params?: MessagingTemplatesRetrieveParams, requestOptions?: ApiRequestOptions): Promise<MessagingTemplateResponse>;
    /** messaging.templates.update */
    update(templateId: string, body: MessagingTemplateUpdateRequest, params: MessagingTemplatesUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingTemplateResponse>;
    /** messaging.templates.delete */
    delete(templateId: string, params: MessagingTemplatesDeleteParams, requestOptions?: ApiRequestOptions): Promise<void>;
}
export interface MessagingChannelsRetrieveParams {
    page?: number;
    pageSize?: number;
}
export interface MessagingChannelsUpdateParams {
    idempotencyKey: string;
}
export declare class MessagingChannelsApi {
    private client;
    constructor(client: HttpClient);
    /** messaging.channels.retrieve */
    retrieve(channel: 'sms' | 'email', params?: MessagingChannelsRetrieveParams, requestOptions?: ApiRequestOptions): Promise<MessagingChannelResponse>;
    /** messaging.channels.update */
    update(channel: 'sms' | 'email', body: MessagingChannelUpdateRequest, params: MessagingChannelsUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingChannelResponse>;
}
export interface MessagingVerificationPoliciesListParams {
    page?: number;
    pageSize?: number;
}
export interface MessagingVerificationPoliciesUpdateParams {
    idempotencyKey: string;
}
export declare class MessagingVerificationPoliciesApi {
    private client;
    constructor(client: HttpClient);
    /** messaging.verificationPolicies.list */
    list(params?: MessagingVerificationPoliciesListParams, requestOptions?: ApiRequestOptions): Promise<{
        items: MessagingVerificationPolicy[];
        pageInfo: PageInfo;
    }>;
    /** messaging.verificationPolicies.update */
    update(policyId: string, body: MessagingVerificationPolicyUpdateRequest, params: MessagingVerificationPoliciesUpdateParams, requestOptions?: ApiRequestOptions): Promise<MessagingVerificationPolicyResponse>;
}
export interface MessagingOutboundMessagesListParams {
    page?: number;
    pageSize?: number;
}
export interface MessagingOutboundMessagesCreateParams {
    idempotencyKey: string;
}
export declare class MessagingOutboundMessagesApi {
    private client;
    constructor(client: HttpClient);
    /** messaging.outboundMessages.list */
    list(params?: MessagingOutboundMessagesListParams, requestOptions?: ApiRequestOptions): Promise<{
        items: MessagingOutboundMessage[];
        pageInfo: PageInfo;
    }>;
    /** messaging.outboundMessages.send */
    create(body: MessagingOutboundMessageSendRequest, params: MessagingOutboundMessagesCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingOutboundMessageResponse>;
}
export interface MessagingPushMessagesListParams {
    page?: number;
    pageSize?: number;
}
export interface MessagingPushMessagesCreateParams {
    idempotencyKey: string;
}
export declare class MessagingPushMessagesApi {
    private client;
    constructor(client: HttpClient);
    /** messaging.pushMessages.list */
    list(params?: MessagingPushMessagesListParams, requestOptions?: ApiRequestOptions): Promise<{
        items: MessagingPushMessage[];
        pageInfo: PageInfo;
    }>;
    /** messaging.pushMessages.send */
    create(body: MessagingPushMessageSendRequest, params: MessagingPushMessagesCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingPushMessageResponse>;
}
export interface MessagingAnnouncementsListParams {
    page?: number;
    pageSize?: number;
}
export interface MessagingAnnouncementsCreateParams {
    idempotencyKey: string;
}
export declare class MessagingAnnouncementsApi {
    private client;
    constructor(client: HttpClient);
    /** messaging.announcements.list */
    list(params?: MessagingAnnouncementsListParams, requestOptions?: ApiRequestOptions): Promise<{
        items: MessagingAnnouncement[];
        pageInfo: PageInfo;
    }>;
    /** messaging.announcements.publish */
    create(body: MessagingAnnouncementPublishRequest, params: MessagingAnnouncementsCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingAnnouncementResponse>;
}
export interface MessagingNotificationsListParams {
    page?: number;
    pageSize?: number;
}
export interface MessagingNotificationsCreateParams {
    idempotencyKey: string;
}
export declare class MessagingNotificationsApi {
    private client;
    constructor(client: HttpClient);
    /** messaging.notifications.list */
    list(params?: MessagingNotificationsListParams, requestOptions?: ApiRequestOptions): Promise<{
        items: MessagingNotification[];
        pageInfo: PageInfo;
    }>;
    /** messaging.notifications.create */
    create(body: MessagingNotificationCreateRequest, params: MessagingNotificationsCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingNotificationResponse>;
}
export declare class MessagingApi {
    readonly notifications: MessagingNotificationsApi;
    readonly announcements: MessagingAnnouncementsApi;
    readonly pushMessages: MessagingPushMessagesApi;
    readonly outboundMessages: MessagingOutboundMessagesApi;
    readonly verificationPolicies: MessagingVerificationPoliciesApi;
    readonly channels: MessagingChannelsApi;
    readonly templates: MessagingTemplatesApi;
    constructor(client: HttpClient);
}
export declare function createMessagingApi(client: HttpClient): MessagingApi;
//# sourceMappingURL=messaging.d.ts.map