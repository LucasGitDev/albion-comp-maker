import { NextRequest, NextResponse } from "next/server";

const ID_PATTERN = /^[A-Z0-9_@]+$/;
const RENDER_BASE_URL = "https://render.albiononline.com/v1";
const CACHE_CONTROL = "public, max-age=31536000, immutable";

// 1x1 transparent PNG
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
  "base64"
);

function fallbackResponse(): NextResponse {
  return new NextResponse(new Uint8Array(TRANSPARENT_PNG), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const qParam = searchParams.get("q");

  if (!id || !ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  if (type !== "item" && type !== "spell") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  let quality = qParam ? parseInt(qParam, 10) : 1;
  if (!Number.isInteger(quality) || quality < 1 || quality > 5) {
    quality = 1;
  }

  const upstreamUrl =
    type === "item"
      ? `${RENDER_BASE_URL}/item/${id}.png?quality=${quality}`
      : `${RENDER_BASE_URL}/spell/${id}.png`;

  try {
    const upstreamResponse = await fetch(upstreamUrl);

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return fallbackResponse();
    }

    return new NextResponse(upstreamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch {
    return fallbackResponse();
  }
}
