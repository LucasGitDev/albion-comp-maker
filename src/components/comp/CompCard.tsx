import Link from "next/link";

import { formatRelativeTime } from "@/lib/relative-time";

export type CompCardProps = {
  id: string;
  name: string;
  buildCount: number;
  isPublic: boolean;
  updatedAt: Date;
};

/**
 * A navigable listing item for a comp on the authenticated home dashboard
 * (ACM-096). Deliberately a separate component from `BuildCard`
 * (`@/components/build-card/BuildCard.tsx`): `BuildCard` renders the
 * exportable game card (icons, slots, PNG capture root), while `CompCard`
 * is a plain list-item link with no export semantics at all.
 */
export function CompCard({ id, name, buildCount, isPublic, updatedAt }: CompCardProps): React.JSX.Element {
  return (
    <Link
      href={`/comps/${id}`}
      className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)] focus-visible:transition-none"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate font-medium text-foreground">{name}</span>
        <span
          className={
            isPublic
              ? "shrink-0 rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-medium text-[var(--color-accent)]"
              : "shrink-0 rounded-full bg-[var(--color-icon-placeholder)] px-3 py-1 text-xs font-medium text-foreground/70"
          }
        >
          {isPublic ? "Pública" : "Privada"}
        </span>
      </div>
      <span className="text-sm text-foreground/60">
        {buildCount} {buildCount === 1 ? "build" : "builds"}
      </span>
      <span className="text-xs text-foreground/50">Atualizada {formatRelativeTime(updatedAt)}</span>
    </Link>
  );
}
