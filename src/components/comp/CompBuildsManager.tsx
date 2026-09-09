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
  slug: string;
  isPublic: boolean;
};

export type CompBuildsManagerProps = {
  compId: string;
  initialEntries: CompBuildEntry[];
  myBuilds: MyBuildOption[];
};

type ActionError = { message: string; retry: () => void };

let tempIdCounter = 0;
function createTempId(): string {
  tempIdCounter += 1;
  return `temp-${tempIdCounter}-${Date.now()}`;
}

/** Swaps two entries by id in whatever the CURRENT list looks like — used to
 * revert a failed reorder without touching fields (label/count) that a
 * concurrent, unrelated action may have already persisted on those same
 * entries or on others. */
function swapEntriesById(list: CompBuildEntry[], idA: string, idB: string): CompBuildEntry[] {
  const indexA = list.findIndex((entry) => entry.compBuildId === idA);
  const indexB = list.findIndex((entry) => entry.compBuildId === idB);
  if (indexA === -1 || indexB === -1) return list;
  const next = [...list];
  [next[indexA], next[indexB]] = [next[indexB], next[indexA]];
  return next;
}

/**
 * Owns the client-side list of a comp's builds (ACM-098): add / remove /
 * reorder / edit label+count, all optimistic so the UI never does a full
 * reload on success (AC#3).
 *
 * Rollback strategy (fixes a race where a failed reorder could silently
 * discard a concurrently-successful label/count edit): every action's
 * failure handler reconciles against the CURRENT state via a functional
 * `setEntries(prev => ...)` update, and reverts ONLY the fields/positions it
 * itself touched, addressed by `compBuildId` — never by overwriting the
 * whole array with a stale closure-captured snapshot. See CompBuildRow's
 * `disabled` gating on Save/Cancel for the first line of defense (no two
 * transitions can be in flight at once); this reconciliation is the second,
 * so a bug in that gating (or any future action added without it) still
 * fails safe instead of destroying already-persisted edits.
 */
export function CompBuildsManager({ compId, initialEntries, myBuilds }: CompBuildsManagerProps): React.JSX.Element {
  const [entries, setEntries] = useState<CompBuildEntry[]>(initialEntries);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd(build: MyBuildOption) {
    setIsDialogOpen(false);
    setError(null);
    const tempId = createTempId();
    setEntries((prev) => [
      ...prev,
      {
        compBuildId: tempId,
        position: prev.length,
        count: 1,
        label: null,
        build: { id: build.id, name: build.name, role: build.role, slug: build.slug, isPublic: build.isPublic },
      },
    ]);

    startTransition(async () => {
      try {
        const row = await addBuildToComp({ compId, buildId: build.id });
        setEntries((prev) =>
          prev.map((entry) =>
            entry.compBuildId === tempId
              ? {
                  compBuildId: row.id,
                  position: row.position,
                  count: row.count,
                  label: row.label,
                  build: { id: build.id, name: build.name, role: build.role, slug: build.slug, isPublic: build.isPublic },
                }
              : entry,
          ),
        );
      } catch {
        setEntries((prev) => prev.filter((entry) => entry.compBuildId !== tempId));
        setError({ message: "Não foi possível adicionar a build.", retry: () => handleAdd(build) });
      }
    });
  }

  function handleRemove(compBuildId: string) {
    setError(null);
    const removedIndex = entries.findIndex((entry) => entry.compBuildId === compBuildId);
    const removedEntry = entries[removedIndex];
    setEntries((prev) => prev.filter((entry) => entry.compBuildId !== compBuildId));

    startTransition(async () => {
      try {
        await removeBuildFromComp(compId, compBuildId);
      } catch {
        if (removedEntry) {
          setEntries((prev) => {
            if (prev.some((entry) => entry.compBuildId === compBuildId)) return prev;
            const insertAt = Math.min(removedIndex, prev.length);
            return [...prev.slice(0, insertAt), removedEntry, ...prev.slice(insertAt)];
          });
        }
        setError({ message: "Não foi possível remover a build.", retry: () => handleRemove(compBuildId) });
      }
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    setError(null);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= entries.length) return;

    const movedId = entries[index].compBuildId;
    const swappedWithId = entries[targetIndex].compBuildId;
    const movedName = entries[index].build.name;
    const next = swapEntriesById(entries, movedId, swappedWithId);
    setEntries(next);
    setAnnouncement(`${movedName} movido para a posição ${targetIndex + 1} de ${next.length}.`);

    startTransition(async () => {
      try {
        await reorderCompBuilds(
          compId,
          next.map((entry) => entry.compBuildId),
        );
      } catch {
        setEntries((prev) => swapEntriesById(prev, movedId, swappedWithId));
        setError({ message: "Não foi possível reordenar as builds.", retry: () => handleMove(index, direction) });
      }
    });
  }

  function handleSaveEntry(compBuildId: string, input: { label: string; count: number }) {
    setError(null);
    const previousEntry = entries.find((entry) => entry.compBuildId === compBuildId);
    const trimmedLabel = input.label.trim();
    setEntries((prev) =>
      prev.map((entry) =>
        entry.compBuildId === compBuildId ? { ...entry, label: trimmedLabel || null, count: input.count } : entry,
      ),
    );

    startTransition(async () => {
      try {
        await updateCompBuild({ compId, compBuildId, label: trimmedLabel || null, count: input.count });
      } catch {
        if (previousEntry) {
          setEntries((prev) =>
            prev.map((entry) =>
              entry.compBuildId === compBuildId
                ? { ...entry, label: previousEntry.label, count: previousEntry.count }
                : entry,
            ),
          );
        }
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

      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>

      {entries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-12 text-center">
          <p className="text-base font-medium text-foreground">Nenhuma build nesta comp</p>
          <p className="max-w-sm text-sm text-foreground/60">
            A comp só pode ser exportada com pelo menos uma build. Enquanto não houver nenhuma, o link público desta
            comp não funciona.
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
