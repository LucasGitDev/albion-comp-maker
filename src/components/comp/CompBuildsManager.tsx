"use client";

import { useState, useTransition } from "react";

import { addBuildToComp, removeBuildFromComp, reorderCompBuilds, updateCompBuild } from "@/actions/comps";
import { AddBuildDialog } from "./AddBuildDialog";
import { CompBuildRow } from "./CompBuildRow";

export type CompBuildEntry = {
  compBuildId: string;
  position: number;
  count: number;
  label: string | null;
  build: {
    id: string;
    name: string;
    role: string | null;
    slug: string;
    isPublic: boolean;
  };
};

export type MyBuildOption = {
  id: string;
  name: string;
  role: string | null;
};

export type CompBuildsManagerProps = {
  compId: string;
  initialEntries: CompBuildEntry[];
  myBuilds: MyBuildOption[];
};

type ActionError = { message: string; retry: () => void };

/**
 * Owns the client-side list of a comp's builds (ACM-098): add / remove /
 * reorder / edit label+count, all optimistic so the UI never does a full
 * reload on success (AC#3). On any action failure the local order/entries
 * are restored to the last known-good state and an inline retry banner is
 * shown — there is no toast library in this codebase's dependencies yet, so
 * the banner plays that role without adding one.
 */
export function CompBuildsManager({ compId, initialEntries, myBuilds }: CompBuildsManagerProps): React.JSX.Element {
  const [entries, setEntries] = useState<CompBuildEntry[]>(initialEntries);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(build: MyBuildOption) {
    setIsDialogOpen(false);
    setError(null);
    const previous = entries;

    startTransition(async () => {
      try {
        const row = await addBuildToComp({ compId, buildId: build.id });
        setEntries([
          ...previous,
          {
            compBuildId: row.id,
            position: row.position,
            count: row.count,
            label: row.label,
            build: { id: build.id, name: build.name, role: build.role, slug: "", isPublic: true },
          },
        ]);
      } catch {
        setEntries(previous);
        setError({ message: "Não foi possível adicionar a build.", retry: () => handleAdd(build) });
      }
    });
  }

  function handleRemove(compBuildId: string) {
    setError(null);
    const previous = entries;
    setEntries(previous.filter((entry) => entry.compBuildId !== compBuildId));

    startTransition(async () => {
      try {
        await removeBuildFromComp(compId, compBuildId);
      } catch {
        setEntries(previous);
        setError({ message: "Não foi possível remover a build.", retry: () => handleRemove(compBuildId) });
      }
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    setError(null);
    const previous = entries;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= previous.length) return;

    const next = [...previous];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setEntries(next);

    startTransition(async () => {
      try {
        await reorderCompBuilds(
          compId,
          next.map((entry) => entry.compBuildId),
        );
      } catch {
        setEntries(previous);
        setError({ message: "Não foi possível reordenar as builds.", retry: () => handleMove(index, direction) });
      }
    });
  }

  function handleSaveEntry(compBuildId: string, input: { label: string; count: number }) {
    setError(null);
    const previous = entries;
    const trimmedLabel = input.label.trim();
    setEntries(
      previous.map((entry) =>
        entry.compBuildId === compBuildId ? { ...entry, label: trimmedLabel || null, count: input.count } : entry,
      ),
    );

    startTransition(async () => {
      try {
        await updateCompBuild({ compId, compBuildId, label: trimmedLabel || null, count: input.count });
      } catch {
        setEntries(previous);
        setError({ message: "Não foi possível salvar as alterações.", retry: () => handleSaveEntry(compBuildId, input) });
      }
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Builds da comp</h2>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setIsDialogOpen(true)}
          className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
        >
          Adicionar build
        </button>
      </div>

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

      {entries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-12 text-center">
          <p className="text-base font-medium text-foreground">Nenhuma build nesta comp</p>
          <p className="max-w-sm text-sm text-foreground/60">
            A comp só pode ser exportada com pelo menos uma build.
          </p>
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="mt-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
          >
            Adicionar build
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <CompBuildRow
              key={entry.compBuildId}
              entry={entry}
              index={index}
              total={entries.length}
              disabled={isPending}
              onMove={(direction) => handleMove(index, direction)}
              onRemove={() => handleRemove(entry.compBuildId)}
              onSave={(input) => handleSaveEntry(entry.compBuildId, input)}
            />
          ))}
        </ul>
      )}

      {isDialogOpen && (
        <AddBuildDialog
          builds={myBuilds}
          disabled={isPending}
          onSelect={handleAdd}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </section>
  );
}
