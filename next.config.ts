import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Prevent `next dev` from auto-rewriting AGENTS.md/CLAUDE.md, which are
  // owned by the project's Backlog.md-driven agent workflow.
  agentRules: false,
  images: {
    // The app never renders `render.albiononline.com` URLs directly in the
    // browser — every item/spell sprite goes through the same-origin
    // `/api/icon` proxy (src/app/api/icon/route.ts), including on the
    // public build/comp share pages (ACM-123). This entry documents that
    // the upstream CDN is the only remote image origin the app ever
    // fetches from server-side, and keeps `next/image` usable against it
    // (e.g. future OG/share surfaces) without an app-wide domain allowlist.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "render.albiononline.com",
        pathname: "/v1/**",
      },
    ],
  },
};

export default nextConfig;
