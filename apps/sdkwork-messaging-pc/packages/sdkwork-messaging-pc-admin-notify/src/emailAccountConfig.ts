/**
 * Typed access to the per-provider email account configuration stored in
 * `messaging_email_account.config_json`.
 *
 * The wire shape stays a flat JSON object of scalar strings so the backend can
 * keep `config` as an open `additionalProperties` object while the admin
 * surface still gets one coherent model for the send (SMTP or HTTP API) and
 * receive (IMAP/POP3) sides.
 *
 * Persisted keys:
 * - `transport`  `smtp` | `http_api`
 * - send SMTP    `host`, `port`, `encryption`
 * - send API     `apiBaseUrl`
 * - shared       `username`, `region`
 * - receive      `receiveProtocol` (`imap` | `pop3` | `none`),
 *                `imapHost`/`imapPort`/`imapEncryption`,
 *                `pop3Host`/`pop3Port`/`pop3Encryption`
 *
 * Legacy rows written before this model used the same `host`/`port`/
 * `encryption` keys for sending and `encryption: "smtps"`; both keep reading
 * correctly through {@link parseEmailAccountConfig}.
 */

export type EmailSendTransport = "smtp" | "http_api";

export type EmailReceiveProtocol = "imap" | "pop3" | "none";

/** TLS mode. `smtps` is the retired spelling of `ssl` and maps onto it. */
export type EmailEncryption = "ssl" | "starttls" | "none";

export interface EmailEndpoint {
  readonly host: string;
  readonly port: string;
  readonly encryption: EmailEncryption;
}

export interface EmailAccountConfig {
  readonly transport: EmailSendTransport;
  /** Send endpoint for SMTP transports; `null` for HTTP API providers. */
  readonly send: EmailEndpoint | null;
  readonly apiBaseUrl: string;
  /** Preferred inbound protocol; `none` when the provider is send-only. */
  readonly receiveProtocol: EmailReceiveProtocol;
  /** IMAP preset, present whenever the provider documents one. */
  readonly imap: EmailEndpoint | null;
  /** POP3 preset, present whenever the provider documents one. */
  readonly pop3: EmailEndpoint | null;
  readonly username: string;
  readonly region: string;
}

export const EMPTY_ENDPOINT: EmailEndpoint = { host: "", port: "", encryption: "ssl" };

function readString(config: Record<string, unknown> | undefined, key: string): string {
  const value = config?.[key];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
}

/** Normalizes the retired `smtps` spelling and unknown values to a TLS mode. */
export function normalizeEncryption(value: string): EmailEncryption {
  switch (value.trim().toLowerCase()) {
    case "ssl":
    case "smtps":
    case "tls":
      return "ssl";
    case "starttls":
      return "starttls";
    case "none":
    case "plain":
      return "none";
    default:
      return "ssl";
  }
}

function normalizeReceiveProtocol(value: string): EmailReceiveProtocol {
  switch (value.trim().toLowerCase()) {
    case "imap":
      return "imap";
    case "pop3":
      return "pop3";
    default:
      return "none";
  }
}

function readEndpoint(
  config: Record<string, unknown> | undefined,
  hostKey: string,
  portKey: string,
  encryptionKey: string,
): EmailEndpoint | null {
  const host = readString(config, hostKey).trim();
  const port = readString(config, portKey).trim();
  const encryption = readString(config, encryptionKey);
  if (!host && !port && !encryption) {
    return null;
  }
  return {
    host,
    port,
    encryption: normalizeEncryption(encryption),
  };
}

/** Reads a persisted account config, honoring the pre-preset legacy shape. */
export function parseEmailAccountConfig(
  config: Record<string, unknown> | undefined,
): EmailAccountConfig {
  const transport: EmailSendTransport =
    readString(config, "transport").trim().toLowerCase() === "http_api" ? "http_api" : "smtp";
  const receiveProtocol = normalizeReceiveProtocol(readString(config, "receiveProtocol"));
  return {
    transport,
    send: transport === "smtp" ? readEndpoint(config, "host", "port", "encryption") : null,
    apiBaseUrl: readString(config, "apiBaseUrl").trim(),
    receiveProtocol,
    imap: readEndpoint(config, "imapHost", "imapPort", "imapEncryption"),
    pop3: readEndpoint(config, "pop3Host", "pop3Port", "pop3Encryption"),
    username: readString(config, "username").trim(),
    region: readString(config, "region").trim(),
  };
}

function writeEndpoint(
  target: Record<string, string>,
  hostKey: string,
  portKey: string,
  encryptionKey: string,
  endpoint: EmailEndpoint | null,
): void {
  if (!endpoint) {
    return;
  }
  const host = endpoint.host.trim();
  const port = endpoint.port.trim();
  if (host) {
    target[hostKey] = host;
  }
  if (port) {
    target[portKey] = port;
  }
  target[encryptionKey] = normalizeEncryption(endpoint.encryption);
}

/**
 * Serializes the model back to `config_json`. Empty optional values are
 * omitted so an unconfigured account never stores blank keys, while the
 * provider presets (host/port/encryption pairs) survive round-trips.
 */
export function serializeEmailAccountConfig(config: EmailAccountConfig): Record<string, string> {
  const output: Record<string, string> = { transport: config.transport };
  if (config.transport === "smtp") {
    // The send host is kept (even when blank) so an unconfigured generic SMTP
    // account keeps the same shape as its seeded preset.
    output.host = config.send?.host.trim() ?? "";
    output.port = config.send?.port.trim() ?? "";
    output.encryption = normalizeEncryption(config.send?.encryption ?? "ssl");
  } else if (config.apiBaseUrl.trim()) {
    output.apiBaseUrl = config.apiBaseUrl.trim();
  }
  const username = config.username.trim();
  if (username) {
    output.username = username;
  }
  const region = config.region.trim();
  if (region) {
    output.region = region;
  }
  output.receiveProtocol = config.receiveProtocol;
  if (config.receiveProtocol !== "none") {
    writeEndpoint(output, "imapHost", "imapPort", "imapEncryption", config.imap);
    writeEndpoint(output, "pop3Host", "pop3Port", "pop3Encryption", config.pop3);
  }
  return output;
}

/** Endpoint that the preferred receive protocol resolves to. */
export function activeReceiveEndpoint(config: EmailAccountConfig): EmailEndpoint | null {
  if (config.receiveProtocol === "imap") {
    return config.imap;
  }
  if (config.receiveProtocol === "pop3") {
    return config.pop3;
  }
  return null;
}

/** `host:port` summary used by the account table; falls back to a dash. */
export function formatEndpoint(endpoint: EmailEndpoint | null): string {
  if (!endpoint || !endpoint.host) {
    return "—";
  }
  return endpoint.port ? `${endpoint.host}:${endpoint.port}` : endpoint.host;
}
