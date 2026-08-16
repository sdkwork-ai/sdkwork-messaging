import { messagingNotifyAdminMessagesEn } from "./en-US/notify/notify";
import { messagingNotifyAdminMessagesZh } from "./zh-CN/notify/notify";

export const messagingNotifyAdminMessages = {
  en: messagingNotifyAdminMessagesEn,
  zh: messagingNotifyAdminMessagesZh,
} as const;

export type MessagingNotifyAdminMessages = typeof messagingNotifyAdminMessages;
