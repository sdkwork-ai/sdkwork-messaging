import { resolveViteEnvironment, resolveLucideReactEntry } from '../../../sdkwork-specs/tools/vite-runtime-profile.mjs';
import { resolveBrowserDistOutDir } from '../../../sdkwork-specs/tools/browser-dist-layout.mjs';

import tailwindcss from "@tailwindcss/vite";
import { createSdkworkCredentialEntryBootstrapVitePlugin } from "@sdkwork/iam-credential-entry/vite";
import react from "@vitejs/plugin-react";
import { env } from "node:process";
import { defineConfig } from "vite";

export default defineConfig(({ mode }: { mode: string }) => ({
  plugins: [
    react(),
    tailwindcss(),
    createSdkworkCredentialEntryBootstrapVitePlugin({
      accessToken: env.SDKWORK_ACCESS_TOKEN,
      environment: mode.includes("production") ? "production" : mode.includes("test") ? "test" : mode.includes("staging") ? "staging" : "development",
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
