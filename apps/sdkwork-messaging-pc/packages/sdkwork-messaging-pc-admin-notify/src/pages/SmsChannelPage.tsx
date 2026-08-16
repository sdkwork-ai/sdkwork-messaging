import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, Save } from "lucide-react";

import {
  ActionBar,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SelectInput,
  TextInput,
  ToggleInput,
} from "../components/form";
import { createNotifyAdminService, type NotifyAdminService } from "../notifyAdminService";

export interface SdkworkMessagingSmsChannelPageProps {
  service?: NotifyAdminService;
}

const PROVIDER_OPTIONS = [
  { value: "aliyun", label: "Aliyun SMS" },
  { value: "tencent", label: "Tencent Cloud SMS" },
  { value: "generic_http", label: "Generic HTTP Gateway" },
] as const;

interface SmsChannelForm {
  provider: string;
  accessKeyId: string;
  secret: string;
  signName: string;
  region: string;
  endpoint: string;
  appId: string;
  enabled: boolean;
}

const EMPTY_FORM: SmsChannelForm = {
  provider: "aliyun",
  accessKeyId: "",
  secret: "",
  signName: "",
  region: "",
  endpoint: "",
  appId: "",
  enabled: true,
};

function readConfig(config: Record<string, unknown> | undefined, key: string): string {
  const value = config?.[key];
  return typeof value === "string" ? value : "";
}

export function SmsChannelPage({ service }: SdkworkMessagingSmsChannelPageProps) {
  const { t } = useTranslation();
  const admin = service ?? createNotifyAdminService();
  const [form, setForm] = useState<SmsChannelForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [secretConfigured, setSecretConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const channel = await admin.retrieveChannel("sms");
      setForm({
        provider: channel.provider,
        accessKeyId: readConfig(channel.config, "accessKeyId"),
        secret: "",
        signName: readConfig(channel.config, "signName"),
        region: readConfig(channel.config, "region"),
        endpoint: readConfig(channel.config, "endpoint"),
        appId: readConfig(channel.config, "appId"),
        enabled: channel.enabled,
      });
      setSecretConfigured(channel.hasSecret);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        setForm(EMPTY_FORM);
        setSecretConfigured(false);
      } else {
        setError(t("admin.notify.common.loadFailed"));
      }
    } finally {
      setLoading(false);
    }
  }, [admin, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = <K extends keyof SmsChannelForm>(key: K, value: SmsChannelForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const config: Record<string, unknown> = {
        accessKeyId: form.accessKeyId.trim(),
        signName: form.signName.trim(),
        region: form.region.trim(),
        endpoint: form.endpoint.trim(),
        appId: form.appId.trim(),
      };
      await admin.updateChannel("sms", {
        provider: form.provider as "aliyun" | "tencent" | "generic_http",
        config,
        ...(form.secret.trim() ? { secret: form.secret } : {}),
        enabled: form.enabled,
      });
      setSecretConfigured(form.secret.trim().length > 0 || secretConfigured);
      setForm((current) => ({ ...current, secret: "" }));
      setNotice(t("admin.notify.common.saved"));
    } catch {
      setError(t("admin.notify.common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label={t("admin.notify.common.loading")} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t("admin.notify.sms.title")}
        description={t("admin.notify.sms.description")}
      />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {notice ? <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</div> : null}
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label={t("admin.notify.sms.provider")}>
          <SelectInput
            value={form.provider}
            onChange={(value) => setField("provider", value)}
            options={PROVIDER_OPTIONS}
          />
        </Field>
        <Field label={t("admin.notify.sms.accessKeyId")}>
          <TextInput
            value={form.accessKeyId}
            onChange={(value) => setField("accessKeyId", value)}
            placeholder={form.provider === "tencent" ? "SecretId" : "AccessKeyId"}
          />
        </Field>
        <Field
          label={t("admin.notify.sms.secret")}
          hint={
            secretConfigured
              ? t("admin.notify.common.secretConfiguredHint")
              : t("admin.notify.common.secretEmptyHint")
          }
        >
          <div className="relative">
            <TextInput
              type="password"
              value={form.secret}
              onChange={(value) => setField("secret", value)}
              placeholder={secretConfigured ? "********" : ""}
            />
            {secretConfigured ? (
              <KeyRound className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            ) : null}
          </div>
        </Field>
        <Field label={t("admin.notify.sms.signName")}>
          <TextInput value={form.signName} onChange={(value) => setField("signName", value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("admin.notify.sms.region")}>
            <TextInput value={form.region} onChange={(value) => setField("region", value)} placeholder="cn-hangzhou" />
          </Field>
          <Field label={t("admin.notify.sms.appId")}>
            <TextInput value={form.appId} onChange={(value) => setField("appId", value)} placeholder={form.provider === "tencent" ? "SdkAppId" : ""} />
          </Field>
        </div>
        {form.provider === "generic_http" ? (
          <Field label={t("admin.notify.sms.endpoint")}>
            <TextInput value={form.endpoint} onChange={(value) => setField("endpoint", value)} placeholder="https://gateway.example.com/send" />
          </Field>
        ) : null}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">{t("admin.notify.common.enabled")}</p>
            <p className="text-xs text-slate-400">{t("admin.notify.sms.enabledHint")}</p>
          </div>
          <ToggleInput checked={form.enabled} onChange={(value) => setField("enabled", value)} />
        </div>
      </div>
      <ActionBar>
        <PrimaryButton onClick={() => void save()} disabled={saving}>
          <span className="inline-flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? t("admin.notify.common.saving") : t("admin.notify.common.save")}
          </span>
        </PrimaryButton>
      </ActionBar>
    </div>
  );
}
