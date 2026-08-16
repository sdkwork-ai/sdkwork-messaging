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

export interface SdkworkMessagingEmailChannelPageProps {
  service?: NotifyAdminService;
}

const ENCRYPTION_OPTIONS = [
  { value: "smtps", label: "SMTPS (SSL)" },
  { value: "starttls", label: "STARTTLS" },
  { value: "none", label: "None" },
] as const;

interface EmailChannelForm {
  provider: string;
  host: string;
  port: string;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
  encryption: string;
  enabled: boolean;
}

const EMPTY_FORM: EmailChannelForm = {
  provider: "smtp",
  host: "",
  port: "465",
  username: "",
  password: "",
  fromAddress: "",
  fromName: "",
  encryption: "smtps",
  enabled: true,
};

function readConfig(config: Record<string, unknown> | undefined, key: string): string {
  const value = config?.[key];
  return typeof value === "string" ? value : "";
}

export function EmailChannelPage({ service }: SdkworkMessagingEmailChannelPageProps) {
  const { t } = useTranslation();
  const admin = service ?? createNotifyAdminService();
  const [form, setForm] = useState<EmailChannelForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [secretConfigured, setSecretConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const channel = await admin.retrieveChannel("email");
      setForm({
        provider: channel.provider,
        host: readConfig(channel.config, "host"),
        port: readConfig(channel.config, "port") || "465",
        username: readConfig(channel.config, "username"),
        password: "",
        fromAddress: readConfig(channel.config, "fromAddress"),
        fromName: readConfig(channel.config, "fromName"),
        encryption: readConfig(channel.config, "encryption") || "smtps",
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

  const setField = <K extends keyof EmailChannelForm>(key: K, value: EmailChannelForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const config: Record<string, unknown> = {
        host: form.host.trim(),
        port: form.port.trim(),
        username: form.username.trim(),
        fromAddress: form.fromAddress.trim(),
        fromName: form.fromName.trim(),
        encryption: form.encryption,
      };
      await admin.updateChannel("email", {
        provider: "smtp",
        config,
        ...(form.password.trim() ? { secret: form.password } : {}),
        enabled: form.enabled,
      });
      setSecretConfigured(form.password.trim().length > 0 || secretConfigured);
      setForm((current) => ({ ...current, password: "" }));
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
        title={t("admin.notify.email.title")}
        description={t("admin.notify.email.description")}
      />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {notice ? <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</div> : null}
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label={t("admin.notify.email.provider")}>
          <TextInput value="SMTP" onChange={() => undefined} disabled />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label={t("admin.notify.email.host")}>
              <TextInput value={form.host} onChange={(value) => setField("host", value)} placeholder="smtp.example.com" />
            </Field>
          </div>
          <Field label={t("admin.notify.email.port")}>
            <TextInput value={form.port} onChange={(value) => setField("port", value)} />
          </Field>
        </div>
        <Field label={t("admin.notify.email.encryption")}>
          <SelectInput
            value={form.encryption}
            onChange={(value) => setField("encryption", value)}
            options={ENCRYPTION_OPTIONS}
          />
        </Field>
        <Field label={t("admin.notify.email.username")}>
          <TextInput value={form.username} onChange={(value) => setField("username", value)} />
        </Field>
        <Field
          label={t("admin.notify.email.password")}
          hint={
            secretConfigured
              ? t("admin.notify.common.secretConfiguredHint")
              : t("admin.notify.common.secretEmptyHint")
          }
        >
          <div className="relative">
            <TextInput
              type="password"
              value={form.password}
              onChange={(value) => setField("password", value)}
              placeholder={secretConfigured ? "********" : ""}
            />
            {secretConfigured ? (
              <KeyRound className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            ) : null}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("admin.notify.email.fromAddress")}>
            <TextInput value={form.fromAddress} onChange={(value) => setField("fromAddress", value)} placeholder="no-reply@example.com" />
          </Field>
          <Field label={t("admin.notify.email.fromName")}>
            <TextInput value={form.fromName} onChange={(value) => setField("fromName", value)} />
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">{t("admin.notify.common.enabled")}</p>
            <p className="text-xs text-slate-400">{t("admin.notify.email.enabledHint")}</p>
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
