//! Messaging notify admin page exports for the cloudrouter admin host.

import type { NotifyAdminService } from "./notifyAdminService";
import type { SdkworkMessagingTemplateListPageProps } from "./pages/TemplateListPage";
import { TemplateListPage } from "./pages/TemplateListPage";

export { EmailChannelPage } from "./pages/EmailChannelPage";
export { SmsChannelPage } from "./pages/SmsChannelPage";
export { TemplateListPage } from "./pages/TemplateListPage";
export { configureMessagingBackendSdkClient } from "./sdk-client";

export type { SdkworkMessagingEmailChannelPageProps } from "./pages/EmailChannelPage";
export type { SdkworkMessagingSmsChannelPageProps } from "./pages/SmsChannelPage";
export type { SdkworkMessagingTemplateListPageProps } from "./pages/TemplateListPage";
export type { NotifyAdminService };

/** Email template management page (screen `email-templates`). */
export function EmailTemplatesPage({ service }: SdkworkMessagingTemplateListPageProps) {
  return <TemplateListPage channel="email" service={service} />;
}

/** SMS template management page (screen `sms-templates`). */
export function SmsTemplatesPage({ service }: SdkworkMessagingTemplateListPageProps) {
  return <TemplateListPage channel="sms" service={service} />;
}
