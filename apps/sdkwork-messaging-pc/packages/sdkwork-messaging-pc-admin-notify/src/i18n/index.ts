import { messagingNotifyAdminMessagesEn } from "./en-US/messaging/admin-notify/notify";
import { messagingNotifyAdminMessagesZh } from "./zh-CN/messaging/admin-notify/notify";

export const messagingNotifyAdminMessages = {
  en: messagingNotifyAdminMessagesEn,
  zh: messagingNotifyAdminMessagesZh,
} as const;

export type MessagingNotifyAdminMessages = typeof messagingNotifyAdminMessages;
