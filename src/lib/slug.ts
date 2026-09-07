import { nanoid } from "nanoid";

// Combining diacritical marks range left behind by NFD decomposition
// (e.g. "á" -> "a" + U+0301). Stripped after normalizing so accented names
// slugify to plain ASCII.
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Builds an immutable slug from a build name at creation time (ACM-018
 * AC#1/AC#3): a lowercase, hyphenated form of `name` plus a short random
 * suffix so two builds with the same name never collide. Never called
 * again after creation — edits change `name` without touching `slug`.
 */
export function generateSlug(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = nanoid(8).toLowerCase();
  return base ? `${base}-${suffix}` : suffix;
}
