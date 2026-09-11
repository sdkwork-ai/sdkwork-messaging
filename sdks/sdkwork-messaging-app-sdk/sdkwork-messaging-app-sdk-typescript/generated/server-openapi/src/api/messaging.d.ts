import type { HttpClient } from '../http/client';
import type { MessagingAnnouncementListResponse, MessagingAnnouncementReceiptResponse, MessagingNotificationListResponse, MessagingNotificationReceiptResponse, MessagingPushDeviceRegisterRequest, MessagingPushDeviceResponse, MessagingPushDeviceUnregisterResponse, MessagingVerificationCodeCreateRequest, MessagingVerificationCodeResponse, MessagingVerificationCodeVerifyRequest, MessagingVerificationCodeVerifyResponse } from '../types';
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
    create(body: MessagingVerificationCodeCreateRequest, params: MessagingVerificationCodesCreateParams): Promise<MessagingVerificationCodeResponse>;
    /** messaging.verificationCodes.verify */
    verify(body: MessagingVerificationCodeVerifyRequest, params: MessagingVerificationCodesVerifyParams): Promise<MessagingVerificationCodeVerifyResponse>;
}
export interface MessagingPushDevicesRegisterParams {
    idempotencyKey: string;
}
export interface MessagingPushDevicesUnregisterParams {
    idempotencyKey: string;
}
export declare class MessagingPushDevicesApi {
    private client;
    constructor(client: HttpClient);
    /** messaging.pushDevices.register */
    register(body: MessagingPushDeviceRegisterRequest, params: MessagingPushDevicesRegisterParams): Promise<MessagingPushDeviceResponse>;
    /** messaging.pushDevices.unregister */
    unregister(deviceId: string, params: MessagingPushDevicesUnregisterParams): Promise<MessagingPushDeviceUnregisterResponse>;
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
    list(params?: MessagingAnnouncementsListParams): Promise<MessagingAnnouncementListResponse>;
    /** messaging.announcements.acknowledge */
    acknowledge(announcementId: string, params: MessagingAnnouncementsAcknowledgeParams): Promise<MessagingAnnouncementReceiptResponse>;
}
export interface MessagingNotificationsListParams {
    page?: number;
    pageSize?: number;
}
export interface MessagingNotificationsMarkReadParams {
    idempotencyKey: string;
}
export declare class MessagingNotificationsApi {
    private client;
    constructor(client: HttpClient);
    /** messaging.notifications.list */
    list(params?: MessagingNotificationsListParams): Promise<MessagingNotificationListResponse>;
    /** messaging.notifications.markRead */
    markRead(notificationId: string, params: MessagingNotificationsMarkReadParams): Promise<MessagingNotificationReceiptResponse>;
}
export declare class MessagingApi {
    private client;
    readonly notifications: MessagingNotificationsApi;
    readonly announcements: MessagingAnnouncementsApi;
    readonly pushDevices: MessagingPushDevicesApi;
    readonly verificationCodes: MessagingVerificationCodesApi;
    constructor(client: HttpClient);
}
export declare function createMessagingApi(client: HttpClient): MessagingApi;
//# sourceMappingURL=messaging.d.ts.map