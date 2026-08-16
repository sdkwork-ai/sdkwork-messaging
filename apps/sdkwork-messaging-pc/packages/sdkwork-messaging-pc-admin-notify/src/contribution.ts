import {
  Mail,
  MailCheck,
  MessageSquareText,
  MessageSquareDashed,
  Send,
  type LucideIcon,
} from "lucide-react";
/**
 * Messaging notify admin contribution metadata.
 *
 * Route records, menu records, and permission hints for a backend-admin
 * domain package stay in the owning package (`sdkwork-messaging`); embedding
 * hosts only compose them by spreading these records into their module
 * registry, permission hints, and route table (same pattern as the IAM, RTC,
 * and TRADE contributions consumed by `sdkwork-cloudrouter`).
 */

export const MESSAGING_ADMIN_DEFAULT_PATH = "/admin/notify/email";

export interface SdkworkMessagingAdminNotifyModuleDef {
  id: "notifyCenter";
  nameKey: string;
  icon: LucideIcon;
  defaultPath: string;
  pathPrefixes: string[];
}

export const MESSAGING_ADMIN_MODULE_DEF: SdkworkMessagingAdminNotifyModuleDef = {
  id: "notifyCenter",
  nameKey: "admin.header.notifyCenter",
  icon: Send,
  defaultPath: MESSAGING_ADMIN_DEFAULT_PATH,
  pathPrefixes: ["/admin/notify"],
};

export interface SdkworkMessagingAdminNotifyMenuItem {
  path: string;
  labelKey: string;
  icon: LucideIcon;
  iconColor?: string;
}

export interface SdkworkMessagingAdminNotifyMenuGroup {
  groupKey: string;
  items: SdkworkMessagingAdminNotifyMenuItem[];
}

export interface SdkworkMessagingAdminNotifyMenu {
  moduleId: "notifyCenter";
  groups: SdkworkMessagingAdminNotifyMenuGroup[];
}

export const MESSAGING_ADMIN_MENU: SdkworkMessagingAdminNotifyMenu = {
  moduleId: "notifyCenter",
  groups: [
    {
      groupKey: "admin.menu.notify.channels",
      items: [
        {
          path: "/admin/notify/email",
          labelKey: "admin.menu.notify.emailChannel",
          icon: Mail,
          iconColor: "text-cyan-500",
        },
        {
          path: "/admin/notify/sms",
          labelKey: "admin.menu.notify.smsChannel",
          icon: MessageSquareText,
          iconColor: "text-emerald-500",
        },
      ],
    },
    {
      groupKey: "admin.menu.notify.templates",
      items: [
        {
          path: "/admin/notify/email-templates",
          labelKey: "admin.menu.notify.emailTemplates",
          icon: MailCheck,
          iconColor: "text-sky-500",
        },
        {
          path: "/admin/notify/sms-templates",
          labelKey: "admin.menu.notify.smsTemplates",
          icon: MessageSquareDashed,
          iconColor: "text-teal-500",
        },
      ],
    },
  ],
};

export interface SdkworkMessagingAdminNotifyRouteRecord {
  path: string;
  requiredPermission: string;
  redirectTo?: string;
  screen: "email-channel" | "sms-channel" | "email-templates" | "sms-templates";
}

export const MESSAGING_ADMIN_ROUTE_RECORDS: readonly SdkworkMessagingAdminNotifyRouteRecord[] = [
  {
    path: "notify",
    requiredPermission: "cloudrouter.admin.access",
    redirectTo: MESSAGING_ADMIN_DEFAULT_PATH,
    screen: "email-channel",
  },
  {
    path: "notify/email",
    requiredPermission: "cloudrouter.admin.access",
    screen: "email-channel",
  },
  {
    path: "notify/sms",
    requiredPermission: "cloudrouter.admin.access",
    screen: "sms-channel",
  },
  {
    path: "notify/email-templates",
    requiredPermission: "cloudrouter.admin.access",
    screen: "email-templates",
  },
  {
    path: "notify/sms-templates",
    requiredPermission: "cloudrouter.admin.access",
    screen: "sms-templates",
  },
];

export interface SdkworkMessagingAdminNotifyPermissionHint {
  pathPrefix: string;
  requiredPermission: string;
}

export const MESSAGING_ADMIN_PERMISSION_HINTS: readonly SdkworkMessagingAdminNotifyPermissionHint[] = [
  { pathPrefix: "/admin/notify", requiredPermission: "cloudrouter.admin.access" },
  { pathPrefix: "/admin/notify/email", requiredPermission: "cloudrouter.admin.access" },
  { pathPrefix: "/admin/notify/sms", requiredPermission: "cloudrouter.admin.access" },
  { pathPrefix: "/admin/notify/email-templates", requiredPermission: "cloudrouter.admin.access" },
  { pathPrefix: "/admin/notify/sms-templates", requiredPermission: "cloudrouter.admin.access" },
];
