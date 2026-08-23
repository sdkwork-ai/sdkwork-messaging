import type {
  MessagingNotification,
  MessagingNotificationListResponse,
  MessagingNotificationReceiptResponse,
  SdkworkAppClient,
} from "@sdkwork/messaging-app-sdk";
import { uuid } from "@sdkwork/utils/id";

export type {
  MessagingNotification,
  MessagingNotificationListResponse,
  MessagingNotificationReceiptResponse,
};

export interface NotificationPageQuery {
  page: number;
  pageSize: number;
}

export interface NotificationCenterService {
  listNotifications(query: NotificationPageQuery): Promise<MessagingNotificationListResponse>;
  markRead(notificationId: string): Promise<MessagingNotificationReceiptResponse>;
}

export interface CreateNotificationCenterServiceOptions {
  createIdempotencyKey?: () => string;
}

export function createNotificationCenterService(
  client: Pick<SdkworkAppClient, "messaging">,
  options: CreateNotificationCenterServiceOptions = {},
): NotificationCenterService {
  const createIdempotencyKey = options.createIdempotencyKey ?? uuid;

  return {
    listNotifications(query) {
      return client.messaging.notifications.list({
        page: normalizePositiveInteger(query.page, "page"),
        pageSize: normalizePageSize(query.pageSize),
      });
    },
    markRead(notificationId) {
      const normalizedId = notificationId.trim();
      if (!normalizedId) throw new Error("notificationId is required");
      return client.messaging.notifications.markRead(normalizedId, {
        idempotencyKey: createIdempotencyKey(),
      });
    },
  };
}

function normalizePageSize(value: number): number {
  const normalized = normalizePositiveInteger(value, "pageSize");
  if (normalized > 200) throw new Error("pageSize must not exceed 200");
  return normalized;
}

function normalizePositiveInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${field} must be a positive integer`);
  return value;
}

