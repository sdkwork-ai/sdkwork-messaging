export interface MessagingNotificationReceiptResponse {
  notificationId: string;
  status: 'unread' | 'read' | 'archived';
}
