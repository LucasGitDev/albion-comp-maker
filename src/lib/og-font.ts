import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Loads the OG-image webfont from disk (Node.js runtime only — see
 * decision-031: these routes intentionally do NOT run on the Edge
 * runtime, so `fs.readFile` is available, unlike the
 * `fetch(new URL(...))` pattern typical Edge `next/og` examples use).
 *
 * Noto Sans (SIL Open Font License 1.1, license-clear) ships full PT-BR
 * accented-glyph coverage, so build/comp names with acentos render
 * correctly in the generated PNG. Cached at module scope — read once per
 * server process, not once per request.
 */
const FONT_PATH = path.join(process.cwd(), "src", "assets", "fonts", "NotoSans-Regular.ttf");

let cachedFont: Promise<ArrayBuffer> | null = null;

export function loadOgFont(): Promise<ArrayBuffer> {
  if (!cachedFont) {
    cachedFont = fs.readFile(FONT_PATH).then((buffer) => {
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      return arrayBuffer as ArrayBuffer;
    });
  }
  return cachedFont;
}
