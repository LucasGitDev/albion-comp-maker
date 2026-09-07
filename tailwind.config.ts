import type { Config } from "tailwindcss";

// NOTE: Tailwind v4 is config-less (PostCSS-based); this file exists only to
// satisfy tooling that expects a typed config and to document content globs.
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
};

export default config;
