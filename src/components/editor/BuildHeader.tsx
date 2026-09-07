"use client";

import type { BuildState } from "@/types/build";

export type BuildHeaderProps = {
  build: BuildState;
  onNameChange: (name: string) => void;
  onRoleChange: (role: string) => void;
};

/**
 * Identity block for the build being edited — deliberately *not* styled as a
 * second header (no `border-b`, no slot counter). Two bars on one screen
 * competed for the "this is the toolbar" read (ACM-038 FINDING 5 / doc-004
 * §3.2); the slot counter moved to `EditorActionBar` (`data-testid="slot-count"`
 * kept there so the existing assertions on that testid still pass).
 */
export function BuildHeader({ build, onNameChange, onRoleChange }: BuildHeaderProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-sm font-semibold text-foreground/70">Detalhes da build</h1>
      <div className="flex flex-wrap items-center gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
          Nome do build
        </span>
        {/*
          No `autoFocus` here (ACM-037 review finding): with the header,
          breadcrumb, and action bar all preceding `<main>` on this route,
          stealing focus into this input on load skipped the global skip
          link entirely — forward-Tab never reached it, and Shift+Tab from
          here jumped straight to "Exportar PNG".
        */}
        <input
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
      </div>
    </div>
  );
}
