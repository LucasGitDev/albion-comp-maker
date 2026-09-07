export type IconCategory = "weapon" | "armor" | "utility" | "consumable" | "generic";

/**
 * Shared per-category silhouette paths (ACM-035 for empty slots, ACM-044 for
 * icons whose sprite resolves to a 1x1 blank PNG). A single source of truth
 * so `SlotCard`'s empty-slot placeholder and `ItemIcon`'s "missing" state
 * never drift into two different glyph sets for the same category.
 */
export const CATEGORY_GLYPH_PATH: Record<IconCategory, React.JSX.Element> = {
  weapon: (
    <path
      d="M6 18 18 6M14 4l6 6-2 2-6-6zM4 20l3-1 1-3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  armor: (
    <path
      d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  utility: (
    <path
      d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8zM8 8V6a4 4 0 0 1 8 0v2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  consumable: (
    <path
      d="M9 3h6v3l2 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-3V3z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  // Neutral fallback for call sites that render `ItemIcon` without slot
  // context (e.g. the search-result list), so a 1x1 CDN gap never falls
  // back further to a blank glyph.
  generic: (
    <path
      d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zM4 15l5-5 4 4 3-3 4 4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

export function CategorySilhouette({
  category,
  size = 32,
}: {
  category: IconCategory;
  size?: number;
}): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      data-category-silhouette={category}
      className="text-icon-muted"
    >
      {CATEGORY_GLYPH_PATH[category]}
    </svg>
  );
}
