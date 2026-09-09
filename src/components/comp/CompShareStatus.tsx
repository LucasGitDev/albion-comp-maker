"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleBuildPublic } from "@/actions/builds";
import { toggleCompPublic } from "@/actions/comps";
import type { CompPublishBlocker, CompPublishState } from "@/types/comp-publish-status";

type CompShareStatusProps = {
  compId: string;
  slug: string;
  publicOrigin: string;
  initialState: CompPublishState;
};

const REASON_COPY: Record<CompPublishBlocker["reason"], string> = {
  "private-own": "Sua build está privada.",
  "private-foreign": "Build de outro usuário não está mais pública.",
  "invalid-content": "O conteúdo salvo dessa build está inválido.",
};

/**
 * Client component rendering the comp's public-share status (ACM-066,
 * decision-025). All diagnosis data (`initialState`) comes from
 * `getCompPublishState`, an owner-scoped action gated by
 * `requireSession()` + `loadOwnedComp` — this component never fetches
 * anything itself on mount, it only reacts to the owner's own toggles.
 *
 * When `isPublic && !isReachable`, the copyable public link is hidden and
 * replaced with a blocker list — never render the link when the backing
 * comp cannot actually resolve publicly, that would be misleading UX
 * pointing the owner at a link that 404s.
 */
export function CompShareStatus({ compId, slug, publicOrigin, initialState }: CompShareStatusProps): React.JSX.Element {
  const router = useRouter();
  // `initialState` comes fresh from the server on every `router.refresh()`
  // triggered below — no local copy to keep in sync, the prop itself is
  // the current state.
  const state = initialState;
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const publicUrl = `${publicOrigin}/comp/${slug}`;

  function handleToggleComp() {
    startTransition(async () => {
      await toggleCompPublic(compId);
      router.refresh();
    });
  }

  function handleMakeBuildPublic(buildId: string) {
    startTransition(async () => {
      await toggleBuildPublic(buildId);
      router.refresh();
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <label className="flex items-center gap-3 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          checked={state.isPublic}
          disabled={isPending}
          onChange={handleToggleComp}
          className="h-4 w-4"
        />
        Comp pública
      </label>

      {state.isPublic && state.isReachable && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={publicUrl}
            className="flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-foreground/80"
          />
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
          >
            {copied ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      )}

      {state.isPublic && !state.isReachable && (
        <div className="flex flex-col gap-3 rounded-md border border-red-500/40 bg-red-500/10 p-3">
          <p className="text-sm font-medium text-red-500">
            {state.hasNoBuilds
              ? "Este link não vai abrir para ninguém: a comp não tem nenhuma build."
              : `Este link não vai abrir para ninguém. ${state.blockers.length} build(s) estão bloqueando:`}
          </p>
          {state.blockers.length > 0 && (
            <ul className="flex flex-col gap-2">
              {state.blockers.map((blocker) => (
                <li
                  key={blocker.compBuildId}
                  className="flex items-center justify-between gap-2 rounded-md bg-[var(--color-surface)] px-3 py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{blocker.buildName}</span>
                    <span className="text-xs text-foreground/60">{REASON_COPY[blocker.reason]}</span>
                  </div>
                  {blocker.reason === "private-own" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleMakeBuildPublic(blocker.buildId)}
                      className="shrink-0 rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
                    >
                      Tornar pública
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
