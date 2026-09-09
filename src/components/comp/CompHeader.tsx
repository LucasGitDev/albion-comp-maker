"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteComp, updateComp } from "@/actions/comps";
import { DeleteCompDialog } from "./DeleteCompDialog";

export type CompHeaderProps = {
  compId: string;
  initialName: string;
};

/**
 * Owns the `/comps/[id]` title: inline rename (click the h1 to edit, saves
 * via `updateComp` on blur/Enter, Escape reverts) and the "Excluir" flow
 * (ACM-113 AC#3/AC#4). Mirrors `BuildsListManager`'s
 * optimistic-update-then-reconcile-on-error shape for rename, and its
 * `DeleteBuildDialog` confirmation pattern for delete.
 */
export function CompHeader({ compId, initialName }: CompHeaderProps): React.JSX.Element {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    setDraft(name);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraft(name);
    setIsEditing(false);
  }

  function commitEditing() {
    const trimmed = draft.trim();
    if (trimmed === "" || trimmed === name) {
      setIsEditing(false);
      setDraft(name);
      return;
    }

    const previousName = name;
    setName(trimmed);
    setIsEditing(false);

    startTransition(async () => {
      try {
        await updateComp({ id: compId, name: trimmed });
        toast.success("Nome da comp atualizado.");
      } catch {
        setName(previousName);
        toast.error("Não foi possível renomear a comp.");
      }
    });
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      try {
        await deleteComp(compId);
        toast.success(`Comp "${name}" excluída.`);
        router.push("/");
      } catch {
        setConfirmingDelete(false);
        toast.error(`Não foi possível excluir "${name}".`);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          autoFocus
          value={draft}
          disabled={isPending}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitEditing}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitEditing();
            } else if (event.key === "Escape") {
              event.preventDefault();
              cancelEditing();
            }
          }}
          className="w-full max-w-md rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xl font-semibold text-foreground outline-none focus-visible:border-[var(--color-accent)]"
        />
      ) : (
        <h1
          tabIndex={0}
          onClick={startEditing}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              startEditing();
            }
          }}
          className="cursor-pointer rounded-sm text-xl font-semibold text-foreground transition-colors hover:text-[var(--color-accent)] focus-visible:transition-none"
          title="Clique para renomear"
        >
          {name}
        </h1>
      )}

      <button
        type="button"
        disabled={isPending}
        onClick={() => setConfirmingDelete(true)}
        className="shrink-0 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
      >
        Excluir
      </button>

      {confirmingDelete && (
        <DeleteCompDialog
          compName={name}
          pending={isPending}
          onConfirm={handleDeleteConfirm}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
