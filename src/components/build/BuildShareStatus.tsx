"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { regenerateBuildSlug, toggleBuildPublic } from "@/actions/builds";

type BuildShareStatusProps = {
  buildId: string;
  slug: string;
  isPublic: boolean;
  publicOrigin: string;
};

/**
 * Owner-facing controls for a build's public slug/link (ACM-067, split off
 * ACM-021 AC#4). Mirrors `CompShareStatus` (ACM-066): all mutations go
 * through Server Actions that call `requireSession()` + ownership-scoped
 * queries themselves, this component never fetches anything on its own.
 *
 * Regenerating the slug overwrites it in place (`regenerateBuildSlug`) —
 * there is no alias kept for the old value, so any link built from it 404s
 * immediately after. That is the whole point of the "old links break"
 * warning below: it is not a soft deprecation, it is instant.
 */
export function BuildShareStatus({ buildId, slug, isPublic, publicOrigin }: BuildShareStatusProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  const publicUrl = `${publicOrigin}/build/${slug}`;

  function handleToggle() {
    startTransition(async () => {
      await toggleBuildPublic(buildId);
      router.refresh();
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      await regenerateBuildSlug(buildId);
      setConfirmingRegenerate(false);
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
          checked={isPublic}
          disabled={isPending}
          onChange={handleToggle}
          className="h-4 w-4"
        />
        Build pública
      </label>

      {isPublic && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={publicUrl}
            className="flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-foreground/80"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
          >
            {copied ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      )}

      <p className="text-xs text-foreground/60">
        Renomear a build não muda esse link: o endereço é fixo desde a criação e continua
        funcionando mesmo depois de um novo nome.
      </p>

      <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
        {!confirmingRegenerate ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirmingRegenerate(true)}
            className="self-start rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-red-500 hover:text-red-500 focus-visible:transition-none"
          >
            Gerar novo link
          </button>
        ) : (
          <div className="flex flex-col gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3">
            <p className="text-sm font-medium text-red-500">
              O link atual vai parar de funcionar imediatamente. Qualquer pessoa que já tenha
              esse link perde o acesso.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={handleRegenerate}
                className="rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 focus-visible:transition-none"
              >
                Confirmar novo link
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setConfirmingRegenerate(false)}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-[var(--color-accent)] focus-visible:transition-none"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
