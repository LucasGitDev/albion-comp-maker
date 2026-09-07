import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Prevent `next dev` from auto-rewriting AGENTS.md/CLAUDE.md, which are
  // owned by the project's Backlog.md-driven agent workflow.
  agentRules: false,
};

export default nextConfig;
