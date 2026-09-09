import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: mockRefresh })),
}));

import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { LocaleToggle } from "@/components/i18n/LocaleToggle";

describe("LocaleToggle (ACM-093)", () => {
  beforeEach(() => {
    document.cookie = "acm_locale=; Max-Age=0; Path=/";
    mockRefresh.mockReset();
  });

  it("marks the active locale with aria-pressed and the other as not pressed", () => {
    render(
      <LocaleProvider initialLocale="en-US">
        <LocaleToggle />
      </LocaleProvider>
    );

    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "PT" })).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking PT writes the acm_locale cookie and triggers a router refresh", () => {
    render(
      <LocaleProvider initialLocale="en-US">
        <LocaleToggle />
      </LocaleProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "PT" }));

    expect(document.cookie).toContain("acm_locale=pt-BR");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "PT" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "false");
  });
});
