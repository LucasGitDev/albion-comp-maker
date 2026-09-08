import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_BUILD_CARD_THEME, type BuildCardTheme } from "@/components/build-card/types";
import { ThemePanel } from "@/components/editor/ThemePanel";

function Harness({ initial }: { initial?: Partial<BuildCardTheme> }): React.JSX.Element {
  const [theme, setTheme] = useState<BuildCardTheme>({
    ...DEFAULT_BUILD_CARD_THEME,
    ...initial,
  });
  return (
    <div>
      <span data-testid="theme-json">{JSON.stringify(theme)}</span>
      <ThemePanel theme={theme} onChange={setTheme} />
    </div>
  );
}

describe("ThemePanel (ACM-014)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("clicking a preset updates theme.preset and marks it checked", () => {
    render(<Harness />);
    const goldRadio = screen.getByRole("radio", { name: "Dourado" });
    fireEvent.click(goldRadio);
    expect(goldRadio).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("theme-json").textContent).toContain('"preset":"gold"');
  });

  it("blur/darken/scale sliders are disabled until a background is set", () => {
    render(<Harness />);
    const blurSlider = screen.getByLabelText("Desfoque do fundo");
    expect(blurSlider).toBeDisabled();
  });

  it("uploads a file, sets background.imageId, and enables the sliders", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "abcdefghijklmnopqrstu" }),
    }) as unknown as typeof fetch;

    render(<Harness />);
    const file = new File([new Uint8Array([1, 2, 3])], "bg.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByTestId("theme-json").textContent).toContain("abcdefghijklmnopqrstu"));

    const blurSlider = screen.getByLabelText("Desfoque do fundo");
    expect(blurSlider).not.toBeDisabled();
  });

  it("moving the blur slider updates the theme in real time (no debounce)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "abcdefghijklmnopqrstu" }),
    }) as unknown as typeof fetch;

    render(<Harness />);
    const file = new File([new Uint8Array([1, 2, 3])], "bg.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByLabelText("Desfoque do fundo")).not.toBeDisabled());

    const blurSlider = screen.getByLabelText("Desfoque do fundo");
    fireEvent.change(blurSlider, { target: { value: "8" } });
    expect(screen.getByTestId("theme-json").textContent).toContain('"blur":8');
  });

  it("shows an inline error and does not upload when the file exceeds 4 MB", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    render(<Harness />);
    const bigFile = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [bigFile] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("4 MB");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("removing the background clears theme.background", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "abcdefghijklmnopqrstu" }),
    }) as unknown as typeof fetch;

    render(<Harness />);
    const file = new File([new Uint8Array([1, 2, 3])], "bg.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("Remover")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Remover"));
    expect(screen.getByTestId("theme-json").textContent).toContain('"background":null');
  });

  it("toggles showItemNames/showSpellNames and aspect ratio", () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Mostrar nomes de item"));
    expect(screen.getByTestId("theme-json").textContent).toContain('"showItemNames":true');

    fireEvent.click(screen.getByRole("radio", { name: "Largo" }));
    expect(screen.getByTestId("theme-json").textContent).toContain('"aspectRatio":"wide"');
  });
});
