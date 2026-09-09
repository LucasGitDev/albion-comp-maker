import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["src/app/**/*.{ts,tsx}", "src/app/**/route.ts", "scripts/*.ts"],
  project: ["src/**/*.{ts,tsx}", "scripts/*.ts"],
};

export default config;
