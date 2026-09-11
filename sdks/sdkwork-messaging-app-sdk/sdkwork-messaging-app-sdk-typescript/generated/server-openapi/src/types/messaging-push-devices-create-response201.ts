import type { MessagingPushDeviceResponse } from './messaging-push-device-response';

export interface MessagingPushDevicesCreateResponse201 {
  code: 0;
  data: unknown & { item: MessagingPushDeviceResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}
