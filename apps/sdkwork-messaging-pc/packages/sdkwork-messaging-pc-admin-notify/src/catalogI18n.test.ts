import { describe, expect, it } from "vitest";

import { EMAIL_PROVIDER_CATALOG } from "./emailProviderCatalog";
import { messagingNotifyAdminMessages } from "./i18n";
import { SMS_PROVIDER_CATALOG, smsProviderConfigDefaults } from "./smsProviderCatalog";

const BUNDLES: Record<string, Record<string, string>> = {
  zh: messagingNotifyAdminMessages.zh as Record<string, string>,
  en: messagingNotifyAdminMessages.en as Record<string, string>,
};

function expectResolved(label: string, keys: readonly (string | undefined)[]): void {
  for (const [locale, bundle] of Object.entries(BUNDLES)) {
    for (const key of keys) {
      if (!key) {
        continue;
      }
      expect(bundle[key], `${label} ${locale} i18n key ${key}`).toBeTruthy();
    }
  }
}

describe("notification admin i18n coverage", () => {
  it("resolves every email provider label and setup hint in both locales", () => {
    for (const entry of EMAIL_PROVIDER_CATALOG) {
      expectResolved(`email/${entry.provider}`, [
        entry.nameKey,
        entry.descriptionKey,
        entry.secretLabelKey,
        entry.setupHintKey,
      ]);
    }
  });

  it("resolves every SMS provider, field label, placeholder, and secret label", () => {
    for (const entry of SMS_PROVIDER_CATALOG) {
      expectResolved(`sms/${entry.provider}`, [
        entry.nameKey,
        entry.descriptionKey,
        entry.secretLabelKey,
        ...entry.fields.flatMap((field) => [field.labelKey, field.placeholderKey]),
      ]);
    }
  });

  it("localizes every SMS config field the account list renders", () => {
    // The SMS account card prints the provider config keys with their label, so
    // each seeded config key needs a localized label or it leaks a raw snake_case
    // identifier to the operator.
    const keys = new Set(SMS_PROVIDER_CATALOG.flatMap((entry) =>
      Object.keys(smsProviderConfigDefaults(entry)),
    ));
    for (const key of keys) {
      expectResolved(`sms field ${key}`, [`admin.notify.sms.fields.${key}`]);
    }
  });

  it("keeps the zh and en bundles at key parity", () => {
    expect(Object.keys(BUNDLES.en).sort()).toEqual(Object.keys(BUNDLES.zh).sort());
  });
});
