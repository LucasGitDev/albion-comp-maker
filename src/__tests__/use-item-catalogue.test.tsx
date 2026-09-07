import { act, renderHook, waitFor } from "@testing-library/react";
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const { result } = renderHook(() => useItemCatalogue());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.failed).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.failedReason).toBe("generic");
  });

  it("surfaces a distinct FAILED state when the fetch itself rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const { result } = renderHook(() => useItemCatalogue());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.failed).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.failedReason).toBe("generic");
  });

  it("classifies a 503 CATALOGUE_UNAVAILABLE response as a missing-artifact failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        clone() {
          return this;
        },
        json: async () => ({ error: "not found", code: "CATALOGUE_UNAVAILABLE" }),
      })
    );

    const { result } = renderHook(() => useItemCatalogue());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.failed).toBe(true);
    expect(result.current.failedReason).toBe("missing-artifact");
  });

  it("classifies any other 503 body shape as a generic failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        clone() {
          return this;
        },
        json: async () => {
          throw new Error("not json");
        },
      })
    );

    const { result } = renderHook(() => useItemCatalogue());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.failed).toBe(true);
    expect(result.current.failedReason).toBe("generic");
  });

  it("recovers from a failed catalogue via retry() without requiring a reload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ uniquename: "T4_HEAD_PLATE_SET1", slot: "head" }],
      });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useItemCatalogue());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.failed).toBe(true);

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.failed).toBe(false);
    expect(result.current.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
