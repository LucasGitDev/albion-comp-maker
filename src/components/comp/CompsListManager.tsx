"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteComp } from "@/actions/comps";
import { DeleteCompDialog } from "./DeleteCompDialog";

export type CompListEntry = {
  id: string;
  name: string;
  contentType: string | null;
  isPublic: boolean;
  isReachable: boolean;
  privateBuildCount: number;
};

export type CompsListManagerProps = {
  initialComps: CompListEntry[];
};

/**
 * Owns the client-side `/comps` list: per-row "Excluir" with a confirmation
 * dialog, wired to `deleteComp` (ACM-113 AC#5). Mirrors
 * `BuildsListManager`'s optimistic-removal-on-confirm shape.
 */
export function CompsListManager({ initialComps }: CompsListManagerProps): React.JSX.Element {
  const [comps, setComps] = useState<CompListEntry[]>(initialComps);
  const [deleteTarget, setDeleteTarget] = useState<CompListEntry | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDeleteConfirm() {
    const comp = deleteTarget;
    if (!comp) return;
    startTransition(async () => {
      try {
        await deleteComp(comp.id);
        setComps((prev) => prev.filter((c) => c.id !== comp.id));
        setDeleteTarget(null);
        toast.success(`Comp "${comp.name}" excluída.`);
      } catch {
        setDeleteTarget(null);
        toast.error(`Não foi possível excluir "${comp.name}".`);
      }
    });
  }

  if (comps.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
        <p className="text-base font-medium text-foreground">Nenhuma comp ainda</p>
        <p className="max-w-sm text-sm text-foreground/60">Crie sua primeira comp para começar.</p>
        <Link
          href="/comp/new"
          className="mt-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
        >
          Criar primeira comp
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {comps.map((comp) => (
          <li
            key={comp.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-colors hover:border-[var(--color-accent)] focus-within:border-[var(--color-accent)]"
          >
            <Link href={`/comps/${comp.id}`} className="flex min-w-0 flex-1 flex-col rounded-sm focus-visible:transition-none">
              <span className="truncate font-medium text-foreground">{comp.name}</span>
              <span className="text-xs text-foreground/60">{comp.contentType || "Sem tipo"}</span>
            </Link>

            <span
              className={
                !comp.isPublic
                  ? "shrink-0 rounded-full bg-[var(--color-icon-placeholder)] px-3 py-1 text-xs font-medium text-foreground/70"
                  : comp.isReachable
                    ? "shrink-0 rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-medium text-[var(--color-accent)]"
                    : "shrink-0 rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-500"
              }
            >
              {!comp.isPublic
                ? "Privada"
                : comp.isReachable
                  ? "Link público ativo"
                  : `Link público quebrado (${comp.privateBuildCount})`}
            </span>

            <button
              type="button"
              disabled={isPending}
              onClick={() => setDeleteTarget(comp)}
              className="shrink-0 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-sm font-medium text-red-500 transition-colors hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>

      {deleteTarget && (
        <DeleteCompDialog
          compName={deleteTarget.name}
          pending={isPending}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
