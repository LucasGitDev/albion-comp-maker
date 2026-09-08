import type { Slot } from "@/data/ao-data";

/**
 * The Compressed layout's 3x3 killboard paperdoll matrix (ACM-073 §2.1).
 *
 * The three reference pages requested in the task (the official killboard,
 * albiononlinegrind.com/builds, albiononlinebuilds.com) all return HTTP 403
 * to programmatic fetches (Cloudflare bot-block, confirmed with curl + a
 * browser user agent) — this ordering comes from the in-game paperdoll /
 * killboard convention documented in doc-006 §2.1, not from reading the live
 * page. It could not be visually confirmed against the reference; the
 * permutation test below is the real safety net (doc-006 §2.1, ACM-073 AC#3):
 * it guarantees that if a slot is ever added to `SLOT_ORDER`, this matrix
 * (plus `mount`) must be updated too, or the build fails loudly instead of a
 * slot silently vanishing from the Compressed card.
 *
 * `mount` is deliberately excluded — the killboard shows it outside the
 * paperdoll, and here it renders in the Compressed layout's meta panel
 * (doc-006 §2.5) instead of a matrix cell.
 */
export const KILLBOARD_MATRIX: readonly (readonly Slot[])[] = [
  ["bag", "head", "cape"],
  ["mainhand", "armor", "offhand"],
  ["potion", "shoes", "food"],
] as const;
