"use client";

import type { BuildState } from "@/types/build";
import { SLOT_ORDER } from "@/types/build";

export type BuildHeaderProps = {
  build: BuildState;
  onNameChange: (name: string) => void;
  onRoleChange: (role: string) => void;
};

export function BuildHeader({ build, onNameChange, onRoleChange }: BuildHeaderProps): React.JSX.Element {
  const filledCount = SLOT_ORDER.filter((slot) => build.slots[slot] !== null).length;

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-icon-slot-empty pb-4">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
          Nome do build
        </span>
        <input
          autoFocus
          value={build.name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Bruiser de frontline"
          className="rounded-md border border-icon-slot-empty bg-icon-slot px-3 py-1.5 text-sm outline-none focus:border-[var(--color-enchant)]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
          Papel
        </span>
        <input
          value={build.role}
          onChange={(event) => onRoleChange(event.target.value)}
          placeholder="Tank"
          className="rounded-md border border-icon-slot-empty bg-icon-slot px-3 py-1.5 text-sm outline-none focus:border-[var(--color-enchant)]"
        />
      </label>
      <span
        className="ml-auto text-sm text-icon-muted"
        data-testid="slot-count"
      >
        {filledCount}/{SLOT_ORDER.length}
      </span>
    </div>
  );
}
