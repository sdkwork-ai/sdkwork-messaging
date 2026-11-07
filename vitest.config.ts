import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

function loadTsconfigAliases() {
  const tsconfigBase = JSON.parse(readFileSync(path.join(workspaceRoot, "tsconfig.base.json"), "utf8"));
  const pathMappings = tsconfigBase?.compilerOptions?.paths ?? {};

  return Object.entries(pathMappings)
    .flatMap(([find, replacements]) => {
      const replacement = Array.isArray(replacements) ? replacements[0] : undefined;
      if (typeof replacement !== "string") {
        return [];
      }

      return [
        {
          find: find.endsWith("/*") ? find.slice(0, -2) : find,
          replacement: path.resolve(
            workspaceRoot,
            replacement.endsWith("/*") ? replacement.slice(0, -2) : replacement,
          ),
        },
      ];
    })
    .sort((left, right) => right.find.length - left.find.length);
}

export default defineConfig({
  root: workspaceRoot,
  resolve: {
    alias: loadTsconfigAliases(),
  },
  test: {
    environment: "node",
    include: [
      "apps/sdkwork-messaging-common/packages/**/*.test.ts",
      "apps/sdkwork-messaging-pc/packages/**/*.test.ts",
      "apps/sdkwork-messaging-pc/tests/**/*.test.ts",
      "sdks/**/*.test.ts"
    ],
  },
});
