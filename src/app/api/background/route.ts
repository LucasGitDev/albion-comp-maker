import { NextResponse } from "next/server";

import { auth } from "@/auth/config";
import { getDb } from "@/db/client";
import { backgroundImages } from "@/db/schema";
import { checkWriteRateLimit, RateLimitError } from "@/lib/rate-limit";
import { UnsupportedImageError, processBackgroundUpload } from "@/lib/uploads";
import { BG_MAX_UPLOAD_BYTES } from "@/lib/validation-constants";

/**
 * Uploads a theme background image (ACM-014 AC#1/AC#2, decision-018).
 * Nothing in this route accepts `runtime = "edge"` — `sharp` is a native
 * module and requires the Node.js runtime, which is this route's default.
 *
 * Size/authz ordering is deliberate (see module-level security notes in the
 * task): cheap/spoofable checks first, real ones last, and nothing is ever
 * buffered before at least one size check has passed.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    checkWriteRateLimit(session.user.id);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    throw error;
  }

  // Cheapest check first: `Content-Length` is attacker-controlled (a client
  // can lie), so it only short-circuits the obviously-too-large case before
  // any body parsing happens. The two checks below (on `file.size` and the
  // real buffer length) are the ones that actually matter.
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > BG_MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart payload." }, { status: 400 });
  }

  const file = formData.get("file");
  // Duck-typed rather than `instanceof File`: the `File` global seen by this
  // module and the one used to construct the multipart body can be
  // different realms depending on runtime (this has been observed across
  // Next.js/undici/jsdom boundaries), which would make `instanceof` an
  // unreliable gate for a real, well-formed upload.
  const isFileLike =
    typeof file === "object" &&
    file !== null &&
    "arrayBuffer" in file &&
    typeof (file as { arrayBuffer: unknown }).arrayBuffer === "function" &&
    "size" in file &&
    typeof (file as { size: unknown }).size === "number";
  if (!isFileLike) {
    return NextResponse.json({ error: "Missing file field." }, { status: 400 });
  }
  const uploadedFile = file as File;

  if (uploadedFile.size > BG_MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }

  const arrayBuffer = await uploadedFile.arrayBuffer();
  if (arrayBuffer.byteLength > BG_MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }

  let processed;
  try {
    processed = await processBackgroundUpload(Buffer.from(arrayBuffer));
  } catch (error) {
    if (error instanceof UnsupportedImageError) {
      return NextResponse.json({ error: "Unsupported or corrupted image." }, { status: 415 });
    }
    throw error;
  }

  const db = getDb();
  const [row] = await db
    .insert(backgroundImages)
    .values({
      // Trusted actor id only — never anything from the request body.
      userId: session.user.id,
      fileName: processed.fileName,
      width: processed.width,
      height: processed.height,
      bytes: processed.bytes,
    })
    .returning({ id: backgroundImages.id });

  // Only the opaque id ever leaves the server (decision-018 AC#2) — never
  // the path or filename.
  return NextResponse.json({ id: row.id }, { status: 200 });
}
