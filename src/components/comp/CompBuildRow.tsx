"use client";

import { useState } from "react";

import type { CompBuildEntry } from "./CompBuildsManager";

export type CompBuildRowProps = {
  entry: CompBuildEntry;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
  onSave: (input: { label: string; count: number }) => void;
};

/**
 * A single `comp_builds` entry (ACM-098). Reorder is exposed as up/down
 * buttons, not drag-and-drop — cheaper to build and keyboard/screen-reader
 * accessible for free, per the task's own stated convention.
 */
export function CompBuildRow({ entry, index, total, disabled, onMove, onRemove, onSave }: CompBuildRowProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(entry.label ?? "");
  const [count, setCount] = useState(entry.count);

  function handleSave() {
    onSave({ label, count });
    setIsEditing(false);
  }

  function handleCancel() {
    setLabel(entry.label ?? "");
    setCount(entry.count);
    setIsEditing(false);
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{entry.build.name}</span>
          <span className="text-xs text-foreground/60">
            {entry.build.role || "Sem papel"}
            {entry.label ? ` · ${entry.label}` : ""} · x{entry.count}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={disabled || index === 0}
            onClick={() => onMove("up")}
            aria-label={`Mover ${entry.build.name} para cima`}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm text-foreground/80 transition-colors hover:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={disabled || index === total - 1}
            onClick={() => onMove("down")}
            aria-label={`Mover ${entry.build.name} para baixo`}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm text-foreground/80 transition-colors hover:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
          >
            ↓
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsEditing((prev) => !prev)}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm text-foreground/80 transition-colors hover:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
          >
            Editar
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="rounded-md border border-red-500/40 px-2 py-1 text-sm text-red-500 transition-colors hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
          >
            Remover
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="flex flex-wrap items-end gap-3 border-t border-[var(--color-border)] pt-3">
          <label className="flex flex-col gap-1 text-xs text-foreground/70">
            Label
            <input
              type="text"
              value={label}
              maxLength={200}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ex.: Tank principal"
              className="w-48 rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-foreground/70">
            Quantidade
            <input
              type="number"
              min={1}
              value={count}
              onChange={(event) => setCount(Math.max(1, Number(event.target.value) || 1))}
              className="w-20 rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm text-foreground"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-foreground/80 transition-colors hover:border-[var(--color-accent)] focus-visible:transition-none"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
