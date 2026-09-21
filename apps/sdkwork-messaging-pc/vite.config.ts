import { resolveViteEnvironment, resolveLucideReactEntry } from '../../../sdkwork-specs/tools/vite-runtime-profile.mjs';
import { resolveBrowserDistOutDir } from '../../../sdkwork-specs/tools/browser-dist-layout.mjs';
import { buildBrowserDevRuntimeEnvDocument } from '../../../sdkwork-specs/tools/browser-runtime-env.mjs';
import { createBrowserRuntimeEnvVitePlugin } from '../../../sdkwork-specs/tools/browser-runtime-env-vite.mjs';

import tailwindcss from "@tailwindcss/vite";
import { createSdkworkCredentialEntryBootstrapVitePlugin } from "@sdkwork/iam-credential-entry/vite";
import react from "@vitejs/plugin-react";
import { env } from "node:process";
import { defineConfig } from "vite";

const RUNTIME_ENV_DOCUMENT_PATH = "/runtime-env.json";

/**
 * Serve-only dev runtime document (APP_RUNTIME_ENV_SPEC.md §2/§6,
 * BROWSER_RUNTIME_ENV_SPEC.md §2; shared Vite integration factory owns the
 * middleware wiring). Both deployment profiles serve the SAME same-origin
 * relative document in dev — the profile changes only the server-side fan-out
 * target. Without this middleware the dev server falls through to the
 * public/runtime-env.json build leftover (or 404 on a fresh checkout) and the
 * bootstrap fails on stale deploy-time values.
 *
 * The BUILD document stays owned by the canonical browser build runner
 * (deploy-time authority with the locale materialization); this plugin
 * deliberately does not emit a build asset.
 */
function messagingRuntimeEnvDocumentPlugin(mode: string) {
  return createBrowserRuntimeEnvVitePlugin({
    name: "messaging-runtime-env-document",
    path: RUNTIME_ENV_DOCUMENT_PATH,
    resolveServeDocument: () =>
      JSON.stringify(buildBrowserDevRuntimeEnvDocument({ profileId: mode })),
  });
}

export default defineConfig(({ mode }: { mode: string }) => ({
  plugins: [
    messagingRuntimeEnvDocumentPlugin(mode),
    react(),
    tailwindcss(),
    createSdkworkCredentialEntryBootstrapVitePlugin({
      accessToken: env.SDKWORK_ACCESS_TOKEN,
      environment: resolveViteEnvironment(mode, process.env),
    }),
  ],
  resolve: { dedupe: ["react", "react-dom"] },
  build: {
      outDir: resolveBrowserDistOutDir(resolveViteEnvironment(mode, process.env) ?? 'production'),
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react-runtime", test: /node_modules[\\/].*(?:react|react-dom|react-router)/ },
            { name: "sdkwork-ui-runtime", test: /sdkwork-(?:ui|i18n)-pc-react/ },
            { name: "sdkwork-sdk-runtime", test: /(?:sdkwork-(?:messaging|iam)-app-sdk|@sdkwork[\\/+]sdk-common)/ },
            { name: "vendor", test: /node_modules/ },
            { name: "sdkwork-foundation-runtime", test: /sdkwork-(?:appbase|core|utils)/ },
            { name: "sdkwork-auth-runtime", test: /sdkwork-(?:auth|iam)/ },
          ],
        },
      },
    },
    sourcemap: false,
    target: "es2022",
  },
}));
