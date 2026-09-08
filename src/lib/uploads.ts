import "server-only";

import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import sharp from "sharp";

import { BG_ALLOWED_MIME, BG_MAX_DIMENSION_PX, BG_MAX_INPUT_PIXELS } from "@/lib/validation-constants";

/**
 * Server-only storage layer for theme background uploads (ACM-014,
 * decision-018). Nothing here trusts the client: the accept/reject decision
 * for a file is made from its **magic bytes**, never the declared multipart
 * `Content-Type` — see `sniffImageMime`. Stored filenames are always
 * `${nanoid()}.webp`, generated here, never derived from any string the
 * client supplied — this is what makes path traversal structurally
 * impossible (there is no client string in any `path.join` call in this
 * module).
 */

export class UnsupportedImageError extends Error {
  constructor(message = "Unsupported or corrupted image.") {
    super(message);
    this.name = "UnsupportedImageError";
  }
}

function resolveUploadsDir(): string {
  const configured = process.env.UPLOADS_DIR ?? "./data/uploads/backgrounds";
  const resolved = path.resolve(process.cwd(), configured);
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

type SniffedMime = (typeof BG_ALLOWED_MIME)[number];

/**
 * Identifies the image format from the buffer's own magic bytes. This is the
 * ONLY signal used to accept/reject an upload — the multipart `Content-Type`
 * header is attacker-controlled and never consulted for this decision
 * (decision-018 / ACM-014 security notes). Explicitly does not recognize
 * SVG (a vector format, XSS risk if ever served inline) or any animated
 * format signature here — animation is rejected later via
 * `sharp().metadata().pages`.
 */
export function sniffImageMime(buffer: Buffer): SniffedMime | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export type ProcessedBackground = {
  fileName: string;
  width: number;
  height: number;
  bytes: number;
};

/**
 * Validates, resizes (max `BG_MAX_DIMENSION_PX` on the longest side), and
 * re-encodes `buffer` as WebP, then writes it under `UPLOADS_DIR` with a
 * server-generated name. Throws `UnsupportedImageError` for anything that
 * fails the magic-byte allowlist, has no recognizable dimensions, or is
 * animated (a multi-page WebP/GIF multiplies decompression cost per frame).
 *
 * `limitInputPixels` is passed explicitly (not left at sharp's default) as a
 * decompression-bomb / pixel-flood guard: a small file can otherwise claim
 * dimensions that decompress to gigabytes in memory.
 */
export async function processBackgroundUpload(buffer: Buffer): Promise<ProcessedBackground> {
  const sniffed = sniffImageMime(buffer);
  if (!sniffed || !BG_ALLOWED_MIME.includes(sniffed)) {
    throw new UnsupportedImageError();
  }

  const image = sharp(buffer, { limitInputPixels: BG_MAX_INPUT_PIXELS, failOn: "error" });

  let metadata: sharp.Metadata;
  try {
    metadata = await image.metadata();
  } catch {
    throw new UnsupportedImageError();
  }

  if (!metadata.format || !metadata.width || !metadata.height) {
    throw new UnsupportedImageError();
  }
  if ((metadata.pages ?? 1) > 1) {
    throw new UnsupportedImageError();
  }

  const outputBuffer = await image
    .rotate() // applies EXIF orientation, then strips metadata
    .resize({
      width: BG_MAX_DIMENSION_PX,
      height: BG_MAX_DIMENSION_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

  const outputMetadata = await sharp(outputBuffer).metadata();
  if (!outputMetadata.width || !outputMetadata.height) {
    throw new UnsupportedImageError();
  }

  const fileName = `${nanoid()}.webp`;
  const uploadsDir = resolveUploadsDir();
  const filePath = path.join(uploadsDir, fileName);

  // `wx`: fails instead of overwriting on the astronomically unlikely
  // collision of a freshly generated nanoid.
  await fs.promises.writeFile(filePath, outputBuffer, { flag: "wx" });

  return {
    fileName,
    width: outputMetadata.width,
    height: outputMetadata.height,
    bytes: outputBuffer.byteLength,
  };
}

const STORED_FILE_NAME_PATTERN = /^[A-Za-z0-9_-]{21}\.webp$/;

/**
 * Reads a previously processed background file by its stored filename.
 * Defense in depth (decision-018): the filename format is validated against
 * `STORED_FILE_NAME_PATTERN` before any filesystem access, even though the
 * value is expected to come from a trusted DB column, and the resolved path
 * is confirmed to still be inside `UPLOADS_DIR` after `path.resolve` — never
 * trust a single check when the string ultimately reaches `fs`.
 */
export async function readBackgroundFile(fileName: string): Promise<Buffer> {
  if (!STORED_FILE_NAME_PATTERN.test(fileName)) {
    throw new UnsupportedImageError("Invalid background file name.");
  }

  const uploadsDir = resolveUploadsDir();
  const resolvedPath = path.resolve(uploadsDir, fileName);
  const uploadsDirWithSep = uploadsDir.endsWith(path.sep) ? uploadsDir : `${uploadsDir}${path.sep}`;
  if (!resolvedPath.startsWith(uploadsDirWithSep)) {
    throw new UnsupportedImageError("Resolved path escapes the uploads directory.");
  }

  return fs.promises.readFile(resolvedPath);
}
