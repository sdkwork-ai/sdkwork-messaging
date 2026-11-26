/**
 * Provider brand marks for the notification-console provider directory and the
 * add-provider picker.
 *
 * Glyph paths come from Simple Icons 13.x (CC0) for vendors that publish a
 * square brand glyph. Vendors without an openly available glyph use their
 * official wordmark and brand color. All marks are local inline SVG/text — the
 * console never loads a remote logo, so the picker works offline and cannot be
 * broken by a third-party CDN.
 */

import { Mail, MessageSquareText } from "lucide-react";

export type ProviderLogoKind = "glyph" | "wordmark" | "microsoft" | "generic" | "fallback";

interface ProviderGlyph {
  path: string;
  color: string;
  title: string;
}

interface ProviderWordmark {
  text: string;
  color: string;
  background: string;
  fontSize: number;
}

const PROVIDER_GLYPHS: Record<string, ProviderGlyph> = {
  aliyun: {
    title: "Alibaba Cloud",
    color: "#FF6A00",
    path: "M3.996 4.517h5.291L8.01 6.324 4.153 7.506a1.668 1.668 0 0 0-1.165 1.601v5.786a1.668 1.668 0 0 0 1.165 1.6l3.857 1.183 1.277 1.807H3.996A3.996 3.996 0 0 1 0 15.487V8.513a3.996 3.996 0 0 1 3.996-3.996m16.008 0h-5.291l1.277 1.807 3.857 1.182c.715.227 1.17.889 1.165 1.601v5.786a1.668 1.668 0 0 1-1.165 1.6l-3.857 1.183-1.277 1.807h5.291A3.996 3.996 0 0 0 24 15.487V8.513a3.996 3.996 0 0 0-3.996-3.996m-4.007 8.345H8.002v-1.804h7.995Z",
  },
  amazon_ses: {
    title: "Amazon Simple Email Service",
    color: "#DD344C",
    path: "M11.9996 0C5.3833 0 0 5.3834 0 11.9998c0 2.5316.7813 4.9544 2.2599 7.0051l.6955-.5014C1.5827 16.5993.8571 14.3505.8571 11.9998.8571 5.856 5.856.8572 12.0004.8572c6.144 0 11.1425 4.999 11.1425 11.1426 0 2.3508-.7256 4.5995-2.0983 6.5037l.6955.5014C23.2187 16.9542 24 14.5314 24 11.9998 24 5.3834 18.6163 0 11.9996 0zM6 16.7142a.4285.4285 0 0 0-.4286.4285v1.7598c-.9643.2048-1.7143 1.0822-1.7143 2.0974 0 1.1615.9815 2.143 2.1429 2.143s2.1429-.9815 2.1429-2.143c0-1.0152-.75-1.8926-1.7143-2.0974v-1.3312h5.1428v2.1883c-.9643.2049-1.7143 1.0822-1.7143 2.0975C9.8571 23.0186 10.8386 24 12 24s2.1429-.9814 2.1429-2.1429c0-1.0153-.75-1.8926-1.7143-2.0975v-2.1883h5.1428v1.3312c-.9643.2048-1.7143 1.0822-1.7143 2.0974 0 1.1615.9815 2.143 2.1429 2.143s2.1429-.9815 2.1429-2.143c0-1.0152-.75-1.8926-1.7143-2.0974v-1.7598A.4285.4285 0 0 0 18 16.7142h-5.5714v-2.5715H18c.237 0 .4286-.192.4286-.4286V5.9997A.4285.4285 0 0 0 18 5.571H6a.4285.4285 0 0 0-.4286.4286v7.7144c0 .2366.1916.4286.4286.4286h5.5714v2.5715H6zm1.2857 4.2857c0 .697-.5889 1.2858-1.2857 1.2858s-1.2857-.5889-1.2857-1.2858c0-.6968.5889-1.2857 1.2857-1.2857S7.2857 20.3031 7.2857 21zm12 0c0 .697-.5889 1.2858-1.2857 1.2858s-1.2857-.5889-1.2857-1.2858c0-.6968.5889-1.2857 1.2857-1.2857s1.2857.5889 1.2857 1.2857z",
  },
  gmail: {
    title: "Gmail",
    color: "#EA4335",
    path: "M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z",
  },
  huawei: {
    title: "Huawei",
    color: "#FF0000",
    path: "M3.67 6.14S1.82 7.91 1.72 9.78v.35c.08 1.51 1.22 2.4 1.22 2.4 1.83 1.79 6.26 4.04 7.3 4.55 0 0 .06.03.1-.01l.02-.04v-.04C7.52 10.8 3.67 6.14 3.67 6.14zM9.65 18.6c-.02-.08-.1-.08-.1-.08l-7.38.26c.8 1.43 2.15 2.53 3.56 2.2.96-.25 3.16-1.78 3.88-2.3.06-.05.04-.09.04-.09zm.08-.78C6.49 15.63.21 12.28.21 12.28c-.15.46-.2.9-.21 1.3v.07c0 1.07.4 1.82.4 1.82.8 1.69 2.34 2.2 2.34 2.2.7.3 1.4.31 1.4.31.12.02 4.4 0 5.54 0 .05 0 .08-.05.08-.05v-.06c0-.03-.03-.05-.03-.05zM9.06 3.19a3.42 3.42 0 00-2.57 3.15v.41c.03.6.16 1.05.16 1.05.66 2.9 3.86 7.65 4.55 8.65.05.05.1.03.1.03a.1.1 0 00.06-.1c1.06-10.6-1.11-13.42-1.11-13.42-.32.02-1.19.23-1.19.23zm8.299 2.27s-.49-1.8-2.44-2.28c0 0-.57-.14-1.17-.22 0 0-2.18 2.81-1.12 13.43.01.07.06.08.06.08.07.03.1-.03.1-.03.72-1.03 3.9-5.76 4.55-8.64 0 0 .36-1.4.02-2.34zm-2.92 13.07s-.07 0-.09.05c0 0-.01.07.03.1.7.51 2.85 2 3.88 2.3 0 0 .16.05.43.06h.14c.69-.02 1.9-.37 3-2.26l-7.4-.25zm7.83-8.41c.14-2.06-1.94-3.97-1.94-3.98 0 0-3.85 4.66-6.67 10.8 0 0-.03.08.02.13l.04.01h.06c1.06-.53 5.46-2.77 7.28-4.54 0 0 1.15-.93 1.21-2.42zm1.52 2.14s-6.28 3.37-9.52 5.55c0 0-.05.04-.03.11 0 0 .03.06.07.06 1.16 0 5.56 0 5.67-.02 0 0 .57-.02 1.27-.29 0 0 1.56-.5 2.37-2.27 0 0 .73-1.45.17-3.14z",
  },
  mailgun: {
    title: "Mailgun",
    color: "#F06B66",
    path: "M11.837 0c6.602 0 11.984 5.381 11.984 11.994-.017 2.99-3.264 4.84-5.844 3.331a3.805 3.805 0 0 1-.06-.035l-.055-.033-.022.055c-2.554 4.63-9.162 4.758-11.894.232-2.732-4.527.46-10.313 5.746-10.416a6.868 6.868 0 0 1 7.002 6.866 1.265 1.265 0 0 0 2.52 0c0-5.18-4.197-9.38-9.377-9.387C4.611 2.594.081 10.41 3.683 16.673c3.238 5.632 11.08 6.351 15.289 1.402l1.997 1.686A11.95 11.95 0 0 1 11.837 24C2.6 23.72-2.87 13.543 1.992 5.684A12.006 12.006 0 0 1 11.837 0Zm0 7.745c-3.276-.163-5.5 3.281-4.003 6.2a4.26 4.26 0 0 0 4.014 2.31c3.276-.171 5.137-3.824 3.35-6.575a4.26 4.26 0 0 0-3.36-1.935Zm0 2.53c1.324 0 2.152 1.433 1.49 2.58a1.72 1.72 0 0 1-1.49.86 1.72 1.72 0 1 1 0-3.44Z",
  },
  resend: {
    title: "Resend",
    color: "#000000",
    path: "M2.023 0v24h5.553v-8.434h2.998L15.326 24h6.65l-5.372-9.258a7.652 7.652 0 0 0 3.316-3.016c.709-1.21 1.062-2.57 1.062-4.08 0-1.462-.353-2.767-1.062-3.91-.709-1.165-1.692-2.079-2.95-2.742C15.737.331 14.355 0 12.823 0Zm5.553 4.87h4.219c.731 0 1.349.125 1.851.376.526.252.925.618 1.2 1.098.274.457.412.994.412 1.611S15.132 9.12 14.88 9.6c-.229.48-.572.856-1.03 1.13-.434.252-.948.38-1.542.38H7.576Z",
  },
  sendgrid: {
    title: "SendGrid",
    color: "#51A9E3",
    path: "M.8 24h13.6c.88 0 1.6-.72 1.6-1.6v-4.8c0-.88-.72-1.6-1.6-1.6H9.6c-.88 0-1.6-.72-1.6-1.6V9.6C8 8.72 7.28 8 6.4 8H1.6C.72 8 0 8.72 0 9.6v13.6c0 .44.36.8.8.8zM23.2 0H9.6C8.72 0 8 .72 8 1.6v4.8C8 7.28 8.72 8 9.6 8h4.8c.88 0 1.6.72 1.6 1.6v4.8c0 .88.72 1.6 1.6 1.6h4.8c.88 0 1.6-.72 1.6-1.6V.8c0-.44-.36-.8-.8-.8Z",
  },
  tencent_mail: {
    title: "Tencent QQ Mail",
    color: "#1EBAFC",
    path: "M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673",
  },
  twilio: {
    title: "Twilio",
    color: "#F22F46",
    path: "M12 0C5.381-.008.008 5.352 0 11.971V12c0 6.64 5.359 12 12 12 6.64 0 12-5.36 12-12 0-6.641-5.36-12-12-12zm0 20.801c-4.846.015-8.786-3.904-8.801-8.75V12c-.014-4.846 3.904-8.786 8.75-8.801H12c4.847-.014 8.786 3.904 8.801 8.75V12c.015 4.847-3.904 8.786-8.75 8.801H12zm5.44-11.76c0 1.359-1.12 2.479-2.481 2.479-1.366-.007-2.472-1.113-2.479-2.479 0-1.361 1.12-2.481 2.479-2.481 1.361 0 2.481 1.12 2.481 2.481zm0 5.919c0 1.36-1.12 2.48-2.481 2.48-1.367-.008-2.473-1.114-2.479-2.48 0-1.359 1.12-2.479 2.479-2.479 1.361-.001 2.481 1.12 2.481 2.479zm-5.919 0c0 1.36-1.12 2.48-2.479 2.48-1.368-.007-2.475-1.113-2.481-2.48 0-1.359 1.12-2.479 2.481-2.479 1.358-.001 2.479 1.12 2.479 2.479zm0-5.919c0 1.359-1.12 2.479-2.479 2.479-1.367-.007-2.475-1.112-2.481-2.479 0-1.361 1.12-2.481 2.481-2.481 1.358 0 2.479 1.12 2.479 2.481z",
  },
};

const PROVIDER_WORDMARKS: Record<string, ProviderWordmark> = {
  enterprise_mail: {
    text: "Exmail",
    color: "#006EFF",
    background: "#EAF2FF",
    fontSize: 8,
  },
  // Enterprise-mailbox vendors.
  tencent_exmail: {
    text: "腾讯\n企业邮",
    color: "#006EFF",
    background: "#EAF2FF",
    fontSize: 7,
  },
  aliyun_mail: {
    text: "阿里\n企业邮",
    color: "#FF6A00",
    background: "#FFF1E6",
    fontSize: 7,
  },
  netease_qiye: {
    text: "网易\n企业邮",
    color: "#D92B2B",
    background: "#FDECEC",
    fontSize: 7,
  },
  mail_263: {
    text: "263",
    color: "#1A73E8",
    background: "#E8F0FE",
    fontSize: 13,
  },
  coremail: {
    text: "Coremail",
    color: "#0B5FFF",
    background: "#E9F0FF",
    fontSize: 6,
  },
  lark_mail: {
    text: "Lark",
    color: "#3370FF",
    background: "#E8EEFF",
    fontSize: 9,
  },
  exchange_online: {
    text: "Exchange",
    color: "#0078D4",
    background: "#E6F2FB",
    fontSize: 6,
  },
  sohu_mail: {
    text: "搜狐\n企业邮",
    color: "#E62E2E",
    background: "#FDEDED",
    fontSize: 7,
  },
  huawei_mail: {
    text: "华为\n企业邮",
    color: "#CF0A2C",
    background: "#FCECEE",
    fontSize: 7,
  },
  sina_mail: {
    text: "新浪\n企业邮",
    color: "#E6162D",
    background: "#FDECEE",
    fontSize: 7,
  },
  exchange_cn: {
    text: "Exchange\n世纪互联",
    color: "#0078D4",
    background: "#E6F2FB",
    fontSize: 5.5,
  },
  google_workspace: {
    text: "Google\nWorkspace",
    color: "#1A73E8",
    background: "#E8F0FE",
    fontSize: 5.5,
  },
  mail_139: {
    text: "139",
    color: "#0085D0",
    background: "#E6F5FF",
    fontSize: 14,
  },
  tencent: {
    text: "Tencent\nCloud",
    color: "#006EFF",
    background: "#EAF2FF",
    fontSize: 6.5,
  },
  postmark: {
    text: "Postmark",
    color: "#1F2937",
    background: "#FFD24A",
    fontSize: 6,
  },
  submail: {
    text: "SUBMAIL",
    color: "#0057FF",
    background: "#E8F0FF",
    fontSize: 6,
  },
  yuntongxun: {
    text: "容联云",
    color: "#E60012",
    background: "#FFF0F0",
    fontSize: 9,
  },
  chuanglan: {
    text: "253",
    color: "#0099FF",
    background: "#E6F6FF",
    fontSize: 13,
  },
};

const GENERIC_PROVIDERS = new Set(["smtp", "generic_http"]);

export function providerLogoKind(provider: string): ProviderLogoKind {
  if (provider === "microsoft") return "microsoft";
  if (PROVIDER_GLYPHS[provider]) return "glyph";
  if (PROVIDER_WORDMARKS[provider]) return "wordmark";
  if (GENERIC_PROVIDERS.has(provider)) return "generic";
  return "fallback";
}

export interface ProviderLogoProps {
  provider: string;
  /** Localized provider name used as the accessible label. */
  label?: string;
  size?: number;
  className?: string;
}

export function ProviderLogo({ provider, label, size = 40, className = "" }: ProviderLogoProps) {
  const accessibleLabel = label ?? provider;
  const glyph = PROVIDER_GLYPHS[provider];
  const wordmark = PROVIDER_WORDMARKS[provider];
  const content = (() => {
    if (glyph) {
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          fill={glyph.color}
        >
          <path d={glyph.path} />
        </svg>
      );
    }
    if (provider === "microsoft") {
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
        >
          <rect x="1" y="1" width="10" height="10" fill="#F25022" />
          <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
          <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
          <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
        </svg>
      );
    }
    if (wordmark) {
      return (
        <span
          className="whitespace-pre-line px-0.5 text-center font-bold leading-[1.05]"
          style={{
            color: wordmark.color,
            backgroundColor: wordmark.background,
            fontSize: wordmark.fontSize,
          }}
        >
          {wordmark.text}
        </span>
      );
    }
    const Icon = provider === "generic_http" ? MessageSquareText : Mail;
    return <Icon aria-hidden="true" size={Math.round(size * 0.55)} className="text-slate-500" />;
  })();

  return (
    <span
      role="img"
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 ${className}`}
      style={{ width: size, height: size }}
      data-provider-logo={providerLogoKind(provider)}
    >
      {content}
    </span>
  );
}
