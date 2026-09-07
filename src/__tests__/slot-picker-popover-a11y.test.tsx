import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AOItem } from "@/data/ao-data.d";
import { SlotPickerPopover } from "@/components/editor/SlotPickerPopover";

const ITEMS: AOItem[] = [
  {
    uniquename: "T4_HEAD_PLATE_SET1",
    slot: "head",
    localizedNames: { "en-US": "Soldier Helmet" },
    spells: [],
    twohanded: false,
    maxEnchant: 0,
  },
];

function renderWithTrigger() {
  const onClose = vi.fn();
  const onSelect = vi.fn();
  render(
    <div>
      <button type="button">Adicionar</button>
      <SlotPickerPopover
        slot="head"
        items={ITEMS}
        value={null}
        label="Cabeça"
        onSelect={onSelect}
        onClose={onClose}
      />
    </div>
  );
  return { onClose, onSelect };
}

describe("SlotPickerPopover accessibility (ACM-034 follow-up)", () => {
  it("traps focus: Tab from the last focusable element wraps to the first", () => {
    renderWithTrigger();
    const dialog = screen.getByRole("dialog");
    const input = screen.getByRole("combobox");
    input.focus();

    // Dispatched on the actually-focused input (not the dialog wrapper) so
    // this genuinely exercises the real capture/bubble order a browser
    // would produce. Dispatching directly on `dialog` (as this test
    // previously did) skips the input's own bubble-phase keydown handler
    // entirely and would pass even if that handler could hijack Tab.
    fireEvent.keyDown(input, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("traps focus: Shift+Tab from the first focusable element wraps to the last", () => {
    renderWithTrigger();
    const dialog = screen.getByRole("dialog");
    const input = screen.getByRole("combobox");
    input.focus();

    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("regression (ACM-034): Tab does not let ItemPicker commit the highlighted result and escape the dialog", () => {
    // With a non-empty catalogue and an empty query, ItemPicker highlights
    // the first result by default (doc-002's default listing). Its own
    // `input[role="combobox"]` keydown handler treats a bare Tab as
    // "commit the highlighted item, then let the browser's native Tab
    // proceed" — which, inside this modal, previously closed the popover
    // and let focus escape into the document. The dialog must stay open
    // and focus must stay inside it.
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <SlotPickerPopover
        slot="head"
        items={ITEMS}
        value={null}
        label="Cabeça"
        onSelect={onSelect}
        onClose={onClose}
      />
    );
    const dialog = screen.getByRole("dialog");
    const input = screen.getByRole("combobox");
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.keyDown(input, { key: "Tab" });

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.contains(dialog)).toBe(true);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("restores focus to the trigger element on unmount", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Adicionar";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(
      <SlotPickerPopover
        slot="head"
        items={ITEMS}
        value={null}
        label="Cabeça"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(document.activeElement).not.toBe(trigger);

    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("locks background scroll while open and restores it on close", () => {
    expect(document.body.style.overflow).not.toBe("hidden");
    const { unmount } = render(
      <SlotPickerPopover
        slot="head"
        items={ITEMS}
        value={null}
        label="Cabeça"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("shows a visible loading state distinct from an empty result set", () => {
    render(
      <SlotPickerPopover
        slot="head"
        items={[]}
        catalogueLoading
        value={null}
        label="Cabeça"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(/carregando/i);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows the sync:ao hint only when the server reports a missing artifact", () => {
    const onClose = vi.fn();
    render(
      <SlotPickerPopover
        slot="head"
        items={[]}
        catalogueFailed
        catalogueFailedReason="missing-artifact"
        value={null}
        label="Cabeça"
        onSelect={vi.fn()}
        onClose={onClose}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/sync:ao/);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("shows ordinary user-facing copy (no sync:ao hint) for a generic failure", () => {
    render(
      <SlotPickerPopover
        slot="head"
        items={[]}
        catalogueFailed
        catalogueFailedReason="generic"
        value={null}
        label="Cabeça"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const alert = screen.getByRole("alert");
    expect(alert).not.toHaveTextContent(/sync:ao/);
    expect(alert).toHaveTextContent(/não foi possível carregar/i);
  });

  it("offers a retry affordance in the failed state that calls onRetryCatalogue", () => {
    const onRetryCatalogue = vi.fn();
    render(
      <SlotPickerPopover
        slot="head"
        items={[]}
        catalogueFailed
        onRetryCatalogue={onRetryCatalogue}
        value={null}
        label="Cabeça"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetryCatalogue).toHaveBeenCalledTimes(1);
  });
});
