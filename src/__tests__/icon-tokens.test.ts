import { afterEach, describe, expect, it, vi } from "vitest";
import { warnInvalidIconOnce } from "@/components/icons/icon-tokens";

describe("warnInvalidIconOnce", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("warns for a new invalid id outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    warnInvalidIconOnce("SOME_UNIQUE_ID_1", "bad id");

    expect(warnSpy).toHaveBeenCalledWith("bad id");
  });

  it("does not warn twice for the same id", () => {
    vi.stubEnv("NODE_ENV", "test");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    warnInvalidIconOnce("SOME_UNIQUE_ID_2", "bad id");
    warnInvalidIconOnce("SOME_UNIQUE_ID_2", "bad id");

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("never warns in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    warnInvalidIconOnce("SOME_UNIQUE_ID_3", "bad id");

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
