import { gunzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const readFile = vi.fn();

vi.mock("node:fs", () => {
  const promises = { readFile: (...args: unknown[]) => readFile(...args) };
  return { promises, default: { promises } };
});

describe("GET /api/items (ACM-034/043)", () => {
  beforeEach(() => {
    vi.resetModules();
    readFile.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the item catalogue with only the wire-relevant fields", async () => {
    readFile.mockResolvedValue(
      JSON.stringify({
        version: "2026-01-01",
        items: [
          {
            uniquename: "T4_HEAD_PLATE_SET1",
            slot: "head",
            localizedNames: { "EN-US": "Soldier Helmet" },
            spells: [],
            twohanded: false,
            maxEnchant: 0,
          },
        ],
        spells: { SOME_SPELL: { uniquename: "SOME_SPELL", kind: "active", localizedNames: {} } },
      })
    );

    const { GET } = await import("@/app/api/items/route");
    const response = await GET(new Request("http://localhost/api/items") as never);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("must-revalidate");
    expect(response.headers.get("ETag")).toBeTruthy();

    const body = await response.json();
    expect(body).toEqual([
      {
        uniquename: "T4_HEAD_PLATE_SET1",
        slot: "head",
        localizedNames: { "EN-US": "Soldier Helmet" },
        spells: [],
        twohanded: false,
        maxEnchant: 0,
      },
    ]);
  });

  it("gzips the payload when the client accepts it (App Router routes get no free compression)", async () => {
    const items = [
      {
        uniquename: "T4_HEAD_PLATE_SET1",
        slot: "head",
        localizedNames: { "EN-US": "Soldier Helmet" },
        spells: [],
        twohanded: false,
        maxEnchant: 0,
      },
    ];
    readFile.mockResolvedValue(JSON.stringify({ version: "2026-01-01", items, spells: {} }));

    const { GET } = await import("@/app/api/items/route");
    const response = await GET(
      new Request("http://localhost/api/items", { headers: { "Accept-Encoding": "gzip" } }) as never
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Encoding")).toBe("gzip");

    const buffer = Buffer.from(await response.arrayBuffer());
    const decoded = JSON.parse(gunzipSync(buffer).toString("utf-8"));
    expect(decoded).toEqual(items);
  });

  it("returns a typed 503 (never a crash or a silent empty list) when the artifact is missing", async () => {
    const error = Object.assign(new Error("not found"), { code: "ENOENT" });
    readFile.mockRejectedValue(error);

    const { GET } = await import("@/app/api/items/route");
    const response = await GET(new Request("http://localhost/api/items") as never);
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body).toEqual({
      error: expect.stringContaining("sync:ao"),
      code: "CATALOGUE_UNAVAILABLE",
    });
  });

  it("returns a typed 503 (not a crash) when the artifact is malformed", async () => {
    readFile.mockResolvedValue("not json");

    const { GET } = await import("@/app/api/items/route");
    const response = await GET(new Request("http://localhost/api/items") as never);
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.code).toBe("CATALOGUE_UNAVAILABLE");
  });

  it("returns 304 with no body when the client's If-None-Match matches the current ETag", async () => {
    readFile.mockResolvedValue(
      JSON.stringify({
        version: "2026-01-01",
        items: [{ uniquename: "T4_HEAD_PLATE_SET1", slot: "head" }],
        spells: {},
      })
    );

    const { GET } = await import("@/app/api/items/route");
    const first = await GET(new Request("http://localhost/api/items") as never);
    const etag = first.headers.get("ETag");
    expect(etag).toBeTruthy();

    const second = await GET(
      new Request("http://localhost/api/items", { headers: { "If-None-Match": etag as string } }) as never
    );
    expect(second.status).toBe(304);
    expect(second.headers.get("ETag")).toBe(etag);
    const text = await second.text();
    expect(text).toBe("");

    // Only the first request should have hit the filesystem — proves the
    // in-memory cache (not just the ETag) is doing the work on revalidation.
    expect(readFile).toHaveBeenCalledTimes(1);
  });

  it("de-duplicates concurrent cold-start requests into a single readFile", async () => {
    let resolveRead: (value: string) => void = () => {};
    readFile.mockReturnValue(
      new Promise((resolve) => {
        resolveRead = resolve;
      })
    );

    const { GET } = await import("@/app/api/items/route");
    const request = () => new Request("http://localhost/api/items") as never;
    const pending = [GET(request()), GET(request()), GET(request())];

    resolveRead(
      JSON.stringify({
        version: "2026-01-01",
        items: [{ uniquename: "T4_HEAD_PLATE_SET1", slot: "head" }],
        spells: {},
      })
    );

    const responses = await Promise.all(pending);
    for (const response of responses) {
      expect(response.status).toBe(200);
    }
    expect(readFile).toHaveBeenCalledTimes(1);
  });
});
