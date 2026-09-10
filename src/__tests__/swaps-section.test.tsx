import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SwapsSection, SWAP_SOFT_CAP } from "@/components/editor/SwapsSection";
import { selectActions, selectBuild, useBuildStore } from "@/store/build-store";
import { t } from "@/lib/i18n/messages";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";

const DEFAULT_SWAP_LABEL = t(DEFAULT_LOCALE, "swap.defaultLabel");

/**
 * Thin wrapper subscribing to the real store so `SwapsSection` receives the
 * same prop-update timing it gets on `/build/new` (ACM-012 review round 2):
 * the focus-restoration effect depends on the `swaps` prop actually
 * reflecting the post-removal list by the time it runs.
 */
function Harness(): React.JSX.Element {
  const build = useBuildStore(selectBuild);
  const actions = useBuildStore(selectActions);
  return (
    <SwapsSection
      swaps={build.swaps}
      buildSlots={build.slots}
      onAddSwap={actions.addSwap}
      onRemoveSwap={actions.removeSwap}
      onMoveSwap={actions.moveSwap}
      onSlotChange={actions.setSwapSlot}
      onRequestItemPick={vi.fn()}
      onLabelChange={actions.setSwapLabel}
      onSpellChange={actions.setSwapSpell}
    />
  );
}

beforeEach(() => {
  useBuildStore.getState().actions.reset();
});

describe("SwapsSection — focus after removal (ACM-012 review round 2, HIGH)", () => {
  it("moves focus to the next remaining row's remove button when a middle row is removed", () => {
    const { addSwap } = selectActions(useBuildStore.getState());
    addSwap();
    addSwap();
    addSwap();
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Remover swap 1" }));

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toHaveAccessibleName("Remover swap 1");
  });

  it("moves focus to the previous row's remove button when the last row is removed", () => {
    const { addSwap } = selectActions(useBuildStore.getState());
    addSwap();
    addSwap();
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Remover swap 2" }));

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toHaveAccessibleName("Remover swap 1");
  });

  it("moves focus to the add-swap button when the last remaining swap is removed", () => {
    const { addSwap } = selectActions(useBuildStore.getState());
    addSwap();
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Remover swap 1" }));

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toHaveAccessibleName("+ Adicionar swap");
  });
});

describe("SwapsSection — soft cap (ACM-012 review round 2, HIGH — product spec cap-8)", () => {
  it(`disables "Adicionar swap" at ${SWAP_SOFT_CAP} swaps with visible, non-title-only copy`, () => {
    const { addSwap } = selectActions(useBuildStore.getState());
    for (let i = 0; i < SWAP_SOFT_CAP; i += 1) addSwap();
    render(<Harness />);

    const addButton = screen.getByRole("button", { name: "+ Adicionar swap" });
    expect(addButton).toBeDisabled();
    expect(addButton).not.toHaveAttribute("title");
    expect(
      screen.getByText(`Máximo de ${SWAP_SOFT_CAP} swaps — o card fica ilegível no Discord.`)
    ).toBeInTheDocument();
    expect(addButton).toHaveAccessibleDescription(
      `Máximo de ${SWAP_SOFT_CAP} swaps — o card fica ilegível no Discord.`
    );
  });

  it("does not disable the add button below the soft cap even though the store's hard cap is 20", () => {
    const { addSwap } = selectActions(useBuildStore.getState());
    for (let i = 0; i < SWAP_SOFT_CAP - 1; i += 1) addSwap();
    render(<Harness />);

    expect(screen.getByRole("button", { name: "+ Adicionar swap" })).not.toBeDisabled();
  });
});

describe("SwapsSection — reorder live region (ACM-012 spec §3)", () => {
  it("announces the swap's new 1-based position after moving down", () => {
    const { addSwap } = selectActions(useBuildStore.getState());
    addSwap();
    addSwap();
    addSwap();
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Mover swap 1 para baixo" }));

    expect(screen.getByText("Swap movido para posição 2 de 3")).toBeInTheDocument();
  });

  it("announces the swap's new 1-based position after moving up", () => {
    const { addSwap } = selectActions(useBuildStore.getState());
    addSwap();
    addSwap();
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Mover swap 2 para cima" }));

    expect(screen.getByText("Swap movido para posição 1 de 2")).toBeInTheDocument();
  });
});

describe("SwapsSection — label default on blur, not at creation (ACM-012 LOW / ACM-060)", () => {
  it("keeps a new swap's label empty (placeholder visible) until the field is blurred empty", () => {
    const { addSwap } = selectActions(useBuildStore.getState());
    addSwap();
    render(<Harness />);

    const labelInput = screen.getByRole("textbox", { name: "Rótulo do swap 1" });
    expect(labelInput).toHaveValue("");
    expect(labelInput).toHaveAttribute("placeholder", "Quando usar? ex.: fights de bridge");

    fireEvent.blur(labelInput);
    expect(selectBuild(useBuildStore.getState()).swaps[0].label).toBe(DEFAULT_SWAP_LABEL);
  });

  it("does not coerce a non-empty label on blur", () => {
    const { addSwap } = selectActions(useBuildStore.getState());
    addSwap();
    render(<Harness />);

    const labelInput = screen.getByRole("textbox", { name: "Rótulo do swap 1" });
    fireEvent.change(labelInput, { target: { value: "Bridge fight" } });
    fireEvent.blur(labelInput);

    expect(selectBuild(useBuildStore.getState()).swaps[0].label).toBe("Bridge fight");
  });
});
