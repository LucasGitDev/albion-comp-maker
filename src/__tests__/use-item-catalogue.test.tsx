import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetItemCatalogueCacheForTests,
  useItemCatalogue,
} from "@/components/editor/use-item-catalogue";

describe("useItemCatalogue (ACM-034/043)", () => {
  afterEach(() => {
    __resetItemCatalogueCacheForTests();
    vi.unstubAllGlobals();
  });

  it("starts in a loading state and then reflects a successful fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ uniquename: "T4_HEAD_PLATE_SET1", slot: "head" }],
      })
    );

    const { result } = renderHook(() => useItemCatalogue());
    expect(result.current.loading).toBe(true);
    expect(result.current.failed).toBe(false);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.failed).toBe(false);
    expect(result.current.items).toHaveLength(1);
  });

  it("surfaces a distinct FAILED state (never a silent empty list) on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const { result } = renderHook(() => useItemCatalogue());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.failed).toBe(true);
    expect(result.current.items).toEqual([]);
  });

  it("surfaces a distinct FAILED state when the fetch itself rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const { result } = renderHook(() => useItemCatalogue());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.failed).toBe(true);
    expect(result.current.items).toEqual([]);
  });
});
