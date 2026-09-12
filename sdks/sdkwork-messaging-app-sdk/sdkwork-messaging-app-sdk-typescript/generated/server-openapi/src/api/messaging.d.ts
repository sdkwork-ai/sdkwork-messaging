import type { ApiRequestOptions, HttpClient } from '../http/client';
import type { MessagingAnnouncement, MessagingAnnouncementReceiptResponse, MessagingNotification, MessagingNotificationReceiptResponse, MessagingPushDeviceRegisterRequest, MessagingPushDeviceResponse, MessagingVerificationCodeCreateRequest, MessagingVerificationCodeResponse, MessagingVerificationCodeVerifyRequest, MessagingVerificationCodeVerifyResponse, PageInfo } from '../types';
export interface MessagingVerificationCodesCreateParams {
    idempotencyKey: string;
}
export interface MessagingVerificationCodesVerifyParams {
    idempotencyKey: string;
}
export declare class MessagingVerificationCodesApi {
    private client;
    constructor(client: HttpClient);
    /** messaging.verificationCodes.create */
    create(body: MessagingVerificationCodeCreateRequest, params: MessagingVerificationCodesCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingVerificationCodeResponse>;
    /** messaging.verificationCodes.verify */
    verify(body: MessagingVerificationCodeVerifyRequest, params: MessagingVerificationCodesVerifyParams, requestOptions?: ApiRequestOptions): Promise<MessagingVerificationCodeVerifyResponse>;
}
export interface MessagingPushDevicesCreateParams {
    idempotencyKey: string;
}
export interface MessagingPushDevicesDeleteParams {
    idempotencyKey: string;
}
export declare class MessagingPushDevicesApi {
    private client;
    constructor(client: HttpClient);
    /** messaging.pushDevices.register */
    create(body: MessagingPushDeviceRegisterRequest, params: MessagingPushDevicesCreateParams, requestOptions?: ApiRequestOptions): Promise<MessagingPushDeviceResponse>;
    /** messaging.pushDevices.unregister */
    delete(deviceId: string, params: MessagingPushDevicesDeleteParams, requestOptions?: ApiRequestOptions): Promise<void>;
}
export interface MessagingAnnouncementsListParams {
    page?: number;
    pageSize?: number;
}
export interface MessagingAnnouncementsAcknowledgeParams {
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
    /** messaging.announcements.acknowledge */
    acknowledge(announcementId: string, params: MessagingAnnouncementsAcknowledgeParams, requestOptions?: ApiRequestOptions): Promise<MessagingAnnouncementReceiptResponse>;
}
export interface MessagingNotificationsListParams {
    page?: number;
    pageSize?: number;
}
export interface MessagingNotificationsReadParams {
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
    /** messaging.notifications.markRead */
    read(notificationId: string, params: MessagingNotificationsReadParams, requestOptions?: ApiRequestOptions): Promise<MessagingNotificationReceiptResponse>;
}
export declare class MessagingApi {
    readonly notifications: MessagingNotificationsApi;
    readonly announcements: MessagingAnnouncementsApi;
    readonly pushDevices: MessagingPushDevicesApi;
    readonly verificationCodes: MessagingVerificationCodesApi;
    constructor(client: HttpClient);
}
export declare function createMessagingApi(client: HttpClient): MessagingApi;
//# sourceMappingURL=messaging.d.ts.map