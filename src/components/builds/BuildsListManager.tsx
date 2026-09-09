"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { duplicateBuild, toggleBuildPublic, deleteBuild } from "@/actions/builds";
import { DeleteBuildDialog } from "./DeleteBuildDialog";

export type BuildListItem = {
  id: string;
  name: string;
  role: string | null;
  isPublic: boolean;
};

export type BuildsListManagerProps = {
  initialBuilds: BuildListItem[];
};

type ActionError = { message: string; retry: () => void };

/**
 * Owns the client-side `/builds` list (ACM-099): Editar, Duplicar,
 * Pública/Privada toggle, and Excluir, all wired to the existing
 * `duplicateBuild`/`toggleBuildPublic`/`deleteBuild` actions
 * (`src/actions/builds.ts`, ACM-018) that had no UI surface before this
 * task. Mirrors `CompBuildsManager`'s optimistic-update + reconcile-on-error
 * shape (ACM-098) rather than a full-page reload on every action.
 */
export function BuildsListManager({ initialBuilds }: BuildsListManagerProps): React.JSX.Element {
  const [builds, setBuilds] = useState<BuildListItem[]>(initialBuilds);
  const [error, setError] = useState<ActionError | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BuildListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDuplicate(build: BuildListItem) {
    setError(null);
    startTransition(async () => {
      try {
        const row = await duplicateBuild(build.id);
        setBuilds((prev) => [{ id: row.id, name: row.name, role: row.role, isPublic: row.isPublic }, ...prev]);
      } catch {
        setError({ message: `Não foi possível duplicar "${build.name}".`, retry: () => handleDuplicate(build) });
      }
    });
  }

  function handleTogglePublic(build: BuildListItem) {
    setError(null);
    setBuilds((prev) => prev.map((b) => (b.id === build.id ? { ...b, isPublic: !b.isPublic } : b)));

    startTransition(async () => {
      try {
        await toggleBuildPublic(build.id);
      } catch {
        setBuilds((prev) => prev.map((b) => (b.id === build.id ? { ...b, isPublic: build.isPublic } : b)));
        setError({
          message: `Não foi possível alterar a visibilidade de "${build.name}".`,
          retry: () => handleTogglePublic(build),
        });
      }
    });
  }

  function handleDeleteConfirm() {
    const build = deleteTarget;
    if (!build) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteBuild(build.id);
        setBuilds((prev) => prev.filter((b) => b.id !== build.id));
        setDeleteTarget(null);
      } catch {
        setDeleteTarget(null);
        setError({ message: `Não foi possível excluir "${build.name}".`, retry: () => setDeleteTarget(build) });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          <span>{error.message}</span>
          <button
            type="button"
            onClick={error.retry}
            className="shrink-0 rounded-full border border-red-500/60 px-3 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10 focus-visible:transition-none"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {builds.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
          <p className="text-base font-medium text-foreground">Nenhuma build ainda</p>
          <p className="max-w-sm text-sm text-foreground/60">Crie sua primeira build para começar.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {builds.map((build) => (
            <li
              key={build.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <Link
                href={`/build/${build.id}/edit`}
                className="flex min-w-0 flex-1 flex-col rounded-sm focus-visible:transition-none"
              >
                <span className="truncate font-medium text-foreground">{build.name}</span>
                <span className="text-xs text-foreground/60">
                  {build.role || "Sem papel"} · {build.isPublic ? "Pública" : "Privada"}
                </span>
              </Link>

              <div className="flex shrink-0 items-center gap-1.5 text-sm">
                <Link
                  href={`/build/${build.id}/edit`}
                  className="rounded-md border border-[var(--color-border)] px-2.5 py-1.5 font-medium text-foreground transition-colors hover:border-[var(--color-accent)] focus-visible:transition-none"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDuplicate(build)}
                  className="rounded-md border border-[var(--color-border)] px-2.5 py-1.5 font-medium text-foreground transition-colors hover:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
                >
                  Duplicar
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleTogglePublic(build)}
                  className="rounded-md border border-[var(--color-border)] px-2.5 py-1.5 font-medium text-foreground transition-colors hover:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
                >
                  {build.isPublic ? "Tornar privada" : "Tornar pública"}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setDeleteTarget(build)}
                  className="rounded-md border border-[var(--color-border)] px-2.5 py-1.5 font-medium text-red-500 transition-colors hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleteTarget && (
        <DeleteBuildDialog
          buildName={deleteTarget.name}
          pending={isPending}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
