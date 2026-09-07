export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

// Static lookup (not `size-${n}` interpolation) so Tailwind v4 can see the
// class names at build time and does not purge them.
export const ICON_SIZE_CLASS: Record<IconSize, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-20",
};

export const ICON_SIZE_PX: Record<IconSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

// Must match ID_PATTERN in src/app/api/icon/route.ts exactly. Lowercase ids
// signal bad upstream data and must fail visibly, never be silently upper-cased.
export const ICON_ID_PATTERN = /^[A-Z0-9_@]+$/;

export function buildItemIconUrl(itemId: string, quality: number): string {
  return `/api/icon?type=item&id=${itemId}&q=${quality}`;
}

export function buildSpellIconUrl(spellId: string): string {
  return `/api/icon?type=spell&id=${spellId}`;
}

export function joinClassNames(
  ...classNames: Array<string | false | undefined | null>
): string {
  return classNames.filter(Boolean).join(" ");
}

const warnedIconIds = new Set<string>();

export function warnInvalidIconOnce(id: string, message: string): void {
  if (process.env.NODE_ENV === "production") return;
  if (warnedIconIds.has(id)) return;
  warnedIconIds.add(id);
  console.warn(message);
}
