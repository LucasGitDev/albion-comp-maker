import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppDatabase } from "@/db/client";
import { createConnection, createDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { backgroundImages, builds, users } from "@/db/schema";
import { __resetRateLimitState } from "@/lib/rate-limit";
import { __resetPublicReadRateLimitState } from "@/lib/public-read-rate-limit";

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));

vi.mock("@/auth/config", () => ({ auth: mockAuth }));

vi.mock("@/db/client", async () => {
  const actual = await vi.importActual<typeof import("@/db/client")>("@/db/client");
  return { ...actual, getDb: vi.fn() };
});

function sessionFor(userId: string) {
  return { user: { id: userId }, expires: "" };
}

async function pngBuffer(width = 10, height = 10): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#336699" } }).png().toBuffer();
}

describe("POST/GET /api/background (ACM-014)", () => {
  let tmpDir: string;
  let uploadsDir: string;
  let db: AppDatabase;
  let sqlite: ReturnType<typeof createConnection>;

  beforeEach(async () => {
    __resetRateLimitState();
    __resetPublicReadRateLimitState();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "acm-bg-route-"));
    uploadsDir = path.join(tmpDir, "uploads");
    process.env.UPLOADS_DIR = uploadsDir;

    const dbPath = path.join(tmpDir, "test.db");
    runMigrations(dbPath);
    sqlite = createConnection(dbPath);
    db = createDb(sqlite);

    const { getDb } = await import("@/db/client");
    vi.mocked(getDb).mockReturnValue(db);

    await db.insert(users).values([
      { id: "user-a", name: "User A" },
      { id: "user-b", name: "User B" },
    ]);

    mockAuth.mockReset();
  });

  afterEach(() => {
    sqlite.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.UPLOADS_DIR;
    vi.clearAllMocks();
  });

  /**
   * Builds a minimal Request-like object whose `formData()` resolves
   * synchronously with an exact in-memory `File`, bypassing a *real*
   * multipart encode/decode round-trip. jsdom's `FormData`/`Request`
   * multipart implementation has been observed to corrupt large binary
   * payloads (a test-environment artifact, not something this route can
   * control), so route tests exercise the route's own logic against a
   * faithful `File`-like value instead of jsdom's lossy wire format.
   */
  function postRequest(body: Buffer, filename = "bg.png", type = "image/png"): Request {
    const fileLike = {
      size: body.byteLength,
      type,
      name: filename,
      arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    };
    const formData = { get: (key: string) => (key === "file" ? fileLike : null) };
    return {
      headers: new Headers(),
      formData: async () => formData,
    } as unknown as Request;
  }

  describe("POST", () => {
    it("401s without a session", async () => {
      mockAuth.mockResolvedValue(null);
      const { POST } = await import("@/app/api/background/route");
      const response = await POST(postRequest(await pngBuffer()));
      expect(response.status).toBe(401);
    });

    it("413s a file above the 4 MB cap", async () => {
      mockAuth.mockResolvedValue(sessionFor("user-a"));
      const { POST } = await import("@/app/api/background/route");
      const oversized = randomBytes(4 * 1024 * 1024 + 1);
      const response = await POST(postRequest(oversized));
      expect(response.status).toBe(413);
    });

    it("415s an invalid image type (magic bytes, not declared content-type)", async () => {
      mockAuth.mockResolvedValue(sessionFor("user-a"));
      const { POST } = await import("@/app/api/background/route");
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      const response = await POST(postRequest(svg, "fake.png", "image/png"));
      expect(response.status).toBe(415);
    });

    it("200s on a valid upload and inserts a row scoped to the session user", async () => {
      mockAuth.mockResolvedValue(sessionFor("user-a"));
      const { POST } = await import("@/app/api/background/route");
      const response = await POST(postRequest(await pngBuffer()));
      expect(response.status).toBe(200);

      const body = (await response.json()) as { id: string };
      expect(body.id).toBeTruthy();
      // Never leaks the path/filename, only the opaque id.
      expect(Object.keys(body)).toEqual(["id"]);

      const [row] = await db.select().from(backgroundImages);
      expect(row.id).toBe(body.id);
      expect(row.userId).toBe("user-a");
    });
  });

  describe("GET /api/background/[id]", () => {
    async function uploadAs(userId: string): Promise<string> {
      mockAuth.mockResolvedValue(sessionFor(userId));
      const { POST } = await import("@/app/api/background/route");
      const response = await POST(postRequest(await pngBuffer()));
      const { id } = (await response.json()) as { id: string };
      return id;
    }

    it("400s an invalid id shape", async () => {
      mockAuth.mockResolvedValue(sessionFor("user-a"));
      const { GET } = await import("@/app/api/background/[id]/route");
      const response = await GET(new Request("http://localhost/api/background/../../etc") as never, {
        params: Promise.resolve({ id: "not valid" }),
      });
      expect(response.status).toBe(400);
    });

    it("owner gets 200 with the image bytes", async () => {
      const id = await uploadAs("user-a");
      mockAuth.mockResolvedValue(sessionFor("user-a"));
      const { GET } = await import("@/app/api/background/[id]/route");
      const response = await GET(new Request(`http://localhost/api/background/${id}`) as never, {
        params: Promise.resolve({ id }),
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/webp");
      expect(response.headers.get("Cache-Control")).toContain("private");
    });

    it("a different user gets 404 for a background referenced only by a private build", async () => {
      const id = await uploadAs("user-a");
      mockAuth.mockResolvedValue(sessionFor("user-b"));
      const { GET } = await import("@/app/api/background/[id]/route");
      const response = await GET(new Request(`http://localhost/api/background/${id}`) as never, {
        params: Promise.resolve({ id }),
      });
      expect(response.status).toBe(404);
    });

    it("a different user gets 200 when the image is referenced by a public build", async () => {
      const id = await uploadAs("user-a");

      await db.insert(builds).values({
        userId: "user-a",
        name: "Public build",
        slug: "public-build-xyz",
        content: JSON.stringify({
          schemaVersion: 1,
          name: "Public build",
          role: "dps",
          accent: "#3f8f4a",
          slots: {
            mainhand: null,
            offhand: null,
            head: null,
            armor: null,
            shoes: null,
            cape: null,
            bag: null,
            mount: null,
            food: null,
            potion: null,
          },
          swaps: [],
        }),
        themeJson: JSON.stringify({
          preset: "dark-purple",
          aspectRatio: "auto",
          fontFamily: "sans",
          showItemNames: false,
          showSpellNames: true,
          background: { imageId: id, blur: 0, darken: 0.4, scale: 1 },
        }),
        isPublic: true,
      });

      mockAuth.mockResolvedValue(sessionFor("user-b"));
      const { GET } = await import("@/app/api/background/[id]/route");
      const response = await GET(new Request(`http://localhost/api/background/${id}`) as never, {
        params: Promise.resolve({ id }),
      });
      expect(response.status).toBe(200);
    });

    it("404s for a nonexistent id", async () => {
      mockAuth.mockResolvedValue(sessionFor("user-a"));
      const { GET } = await import("@/app/api/background/[id]/route");
      const response = await GET(new Request("http://localhost/api/background/aaaaaaaaaaaaaaaaaaaaa") as never, {
        params: Promise.resolve({ id: "aaaaaaaaaaaaaaaaaaaaa" }),
      });
      expect(response.status).toBe(404);
    });
  });
});
