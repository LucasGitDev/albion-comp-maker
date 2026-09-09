/**
 * Types for `src/lib/comp-publish-status.ts` (ACM-066, decision-025), kept
 * in a plain (non `server-only`) module so `"use client"` components like
 * `src/components/comp/CompShareStatus.tsx` can import them as types
 * without pulling the server-only implementation into the client bundle's
 * import graph (see `src/__tests__/server-only-boundary.test.ts`).
 */

export type CompPublishBlockerReason = "private-own" | "private-foreign" | "invalid-content";

export type CompPublishBlocker = {
  compBuildId: string;
  position: number;
  buildId: string;
  buildName: string;
  reason: CompPublishBlockerReason;
  ownedByMe: boolean;
};

export type CompPublishState = {
  isPublic: boolean;
  isReachable: boolean;
  hasNoBuilds: boolean;
  blockers: CompPublishBlocker[];
};
