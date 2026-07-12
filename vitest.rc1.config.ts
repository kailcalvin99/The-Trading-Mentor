import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@/": `${root}artifacts/web/src/`,
      "react/jsx-dev-runtime": `${root}artifacts/web/node_modules/react/jsx-dev-runtime.js`,
      "react/jsx-runtime": `${root}artifacts/web/node_modules/react/jsx-runtime.js`,
      "react-dom/client": `${root}artifacts/web/node_modules/react-dom/client.js`,
      "react": `${root}artifacts/web/node_modules/react/index.js`,
      "react-router-dom": `${root}artifacts/web/node_modules/react-router-dom/dist/index.mjs`,
      "@tanstack/react-query": `${root}artifacts/web/node_modules/@tanstack/react-query/build/modern/index.js`,
      "@workspace/api-client-react": `${root}lib/api-client-react/src/index.ts`,
      "@workspace/api-zod": `${root}lib/api-zod/src/index.ts`,
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/rc1/smart-journal-file-controls.test.tsx"],
    setupFiles: ["tests/rc1/smart-journal-test-setup.ts"],
  },
});
