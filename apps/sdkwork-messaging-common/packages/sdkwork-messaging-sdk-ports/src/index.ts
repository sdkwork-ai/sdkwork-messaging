export type MessagingSdkResponse<T> = Promise<T | { code?: number | string; data?: T; message?: string; msg?: string }>;
export type MessagingSdkMethod = (...args: unknown[]) => MessagingSdkResponse<unknown>;

type MethodTree = {
  readonly [key: string]: true | MethodTree;
};

type ClientFromMethodTree<TTree extends MethodTree> = {
  readonly [TKey in keyof TTree]: TTree[TKey] extends true
    ? MessagingSdkMethod
    : TTree[TKey] extends MethodTree
      ? ClientFromMethodTree<TTree[TKey]>
      : never;
};

export const APP_MESSAGING_METHOD_TREE = {
  notifications: {
    list: true,
    markRead: true,
  },
  announcements: {
    list: true,
    acknowledge: true,
  },
  pushDevices: {
    register: true,
    unregister: true,
  },
  verificationCodes: {
    create: true,
    verify: true,
  },
} as const;

export const BACKEND_MESSAGING_METHOD_TREE = {
  notifications: {
    list: true,
    create: true,
  },
  announcements: {
    list: true,
    publish: true,
  },
  pushMessages: {
    list: true,
    send: true,
  },
  outboundMessages: {
    list: true,
    send: true,
  },
  verificationPolicies: {
    list: true,
    update: true,
  },
  channels: {
    retrieve: true,
    update: true,
  },
  templates: {
    list: true,
    create: true,
    retrieve: true,
    update: true,
    delete: true,
  },
} as const;

export interface MessagingAppSdkClient {
  readonly messaging: ClientFromMethodTree<typeof APP_MESSAGING_METHOD_TREE>;
}

export interface MessagingBackendSdkClient {
  readonly messaging: ClientFromMethodTree<typeof BACKEND_MESSAGING_METHOD_TREE>;
}

export function assertMessagingAppSdkClient(client: unknown): asserts client is MessagingAppSdkClient {
  if (
    !hasMethod(client, ["messaging", "notifications", "list"]) ||
    !hasMethod(client, ["messaging", "notifications", "markRead"]) ||
    !hasMethod(client, ["messaging", "announcements", "list"]) ||
    !hasMethod(client, ["messaging", "announcements", "acknowledge"]) ||
    !hasMethod(client, ["messaging", "pushDevices", "register"]) ||
    !hasMethod(client, ["messaging", "pushDevices", "unregister"]) ||
    !hasMethod(client, ["messaging", "verificationCodes", "create"]) ||
    !hasMethod(client, ["messaging", "verificationCodes", "verify"])
  ) {
    throw new Error("Messaging app SDK client must expose messaging notification, announcement, app push, and verification methods.");
  }
}

export function assertMessagingBackendSdkClient(client: unknown): asserts client is MessagingBackendSdkClient {
  if (
    !hasMethod(client, ["messaging", "notifications", "list"]) ||
    !hasMethod(client, ["messaging", "notifications", "create"]) ||
    !hasMethod(client, ["messaging", "announcements", "list"]) ||
    !hasMethod(client, ["messaging", "announcements", "publish"]) ||
    !hasMethod(client, ["messaging", "pushMessages", "list"]) ||
    !hasMethod(client, ["messaging", "pushMessages", "send"]) ||
    !hasMethod(client, ["messaging", "outboundMessages", "list"]) ||
    !hasMethod(client, ["messaging", "outboundMessages", "send"]) ||
    !hasMethod(client, ["messaging", "verificationPolicies", "list"]) ||
    !hasMethod(client, ["messaging", "verificationPolicies", "update"]) ||
    !hasMethod(client, ["messaging", "channels", "retrieve"]) ||
    !hasMethod(client, ["messaging", "channels", "update"]) ||
    !hasMethod(client, ["messaging", "templates", "list"]) ||
    !hasMethod(client, ["messaging", "templates", "create"]) ||
    !hasMethod(client, ["messaging", "templates", "retrieve"]) ||
    !hasMethod(client, ["messaging", "templates", "update"]) ||
    !hasMethod(client, ["messaging", "templates", "delete"])
  ) {
    throw new Error("Messaging backend SDK client must expose messaging notification, announcement, app push, SMS/email, verification, channel, and template administration methods.");
  }
}

function hasMethod(value: unknown, path: readonly string[]): boolean {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return false;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "function";
}
