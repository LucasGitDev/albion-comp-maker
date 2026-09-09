import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // branches uses CI baseline (~79.2%) — V8 coverage differs from local due to cold JIT;
// raise progressively as ACM-105 adds tests
thresholds: { lines: 80, functions: 80, branches: 79, statements: 80 },
      include: ["src/**"],
      exclude: ["src/**/*.test.*", "src/**/*.spec.*", "src/auth/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Tests run in a Node/jsdom process, not Next.js's `react-server`
      // condition, so `server-only`'s default export throws unconditionally
      // (see node_modules/server-only/index.js). Every test that imports
      // build-schema.ts exercises server-side code by construction, so the
      // marker's "react-server" no-op build is the correct resolution here.
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
});
