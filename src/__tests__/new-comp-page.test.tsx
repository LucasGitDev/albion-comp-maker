import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COMP_NAME_MAX_LENGTH } from "@/lib/validation-constants";

const { mockCreateCompAction, mockPush } = vi.hoisted(() => ({
  mockCreateCompAction: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock("@/actions/comps", () => ({
  createCompAction: mockCreateCompAction,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import NewCompPage from "@/app/comp/new/page";
import { NewCompForm } from "@/components/comp/NewCompForm";

beforeEach(() => {
  mockCreateCompAction.mockReset();
  mockPush.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("/comp/new — AC#1 renders the form (route exists, no 404)", () => {
  it("renders the name field, placeholder and primary button", () => {
    render(<NewCompPage />);

    expect(screen.getByLabelText("Nome da comp")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ZvZ Terça")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar comp" })).toBeInTheDocument();
  });
});

describe("NewCompForm — AC#2 valid submit creates the comp and navigates to the owner page", () => {
  it("calls createCompAction once with the trimmed name and pushes /comps/<id>, never /comp/<slug>", async () => {
    mockCreateCompAction.mockResolvedValue({ ok: true, compId: "comp-123" });

    render(<NewCompForm />);
    fireEvent.change(screen.getByLabelText("Nome da comp"), { target: { value: "  ZvZ Terça  " } });
    fireEvent.click(screen.getByRole("button", { name: "Criar comp" }));

    await waitFor(() => expect(mockCreateCompAction).toHaveBeenCalledTimes(1));
    expect(mockCreateCompAction).toHaveBeenCalledWith({ name: "ZvZ Terça" });

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    const [target] = mockPush.mock.calls[0] as [string];
    expect(target).toBe("/comps/comp-123");
    // decision-027: the public `/comp/[slug]` route 404s for a comp with
    // zero builds, so the redirect target must never start with `/comp/`.
    expect(target.startsWith("/comp/")).toBe(false);
  });
});

describe("NewCompForm — AC#3 validation errors stay inline and never call the action", () => {
  it("empty name shows an inline alert, preserves the (empty) text and never calls the action", () => {
    render(<NewCompForm />);
    fireEvent.click(screen.getByRole("button", { name: "Criar comp" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Informe um nome para a comp");
    expect(mockCreateCompAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome da comp")).toHaveValue("");
  });

  it("a name over COMP_NAME_MAX_LENGTH shows an inline alert, preserves the typed text and never calls the action", () => {
    render(<NewCompForm />);
    const tooLong = "a".repeat(COMP_NAME_MAX_LENGTH + 1);

    fireEvent.change(screen.getByLabelText("Nome da comp"), { target: { value: tooLong } });
    fireEvent.click(screen.getByRole("button", { name: "Criar comp" }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(mockCreateCompAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome da comp")).toHaveValue(tooLong);
  });

  it("surfaces an action-returned error inline without breaking the page", async () => {
    mockCreateCompAction.mockResolvedValue({ ok: false, error: "Não foi possível criar a comp." });

    render(<NewCompForm />);
    fireEvent.change(screen.getByLabelText("Nome da comp"), { target: { value: "ZvZ Terça" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar comp" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível criar a comp.");
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("NewCompForm — AC#4 double submit never creates two comps", () => {
  it("a second click while the action is still pending calls createCompAction exactly once and shows the disabled 'Criando...' state", async () => {
    let resolveAction: (value: { ok: true; compId: string }) => void;
    mockCreateCompAction.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );

    render(<NewCompForm />);
    fireEvent.change(screen.getByLabelText("Nome da comp"), { target: { value: "ZvZ Terça" } });

    const button = screen.getByRole("button", { name: "Criar comp" });
    fireEvent.click(button);

    const pendingButton = await screen.findByRole("button", { name: "Criando..." });
    expect(pendingButton).toBeDisabled();

    fireEvent.click(pendingButton);
    expect(mockCreateCompAction).toHaveBeenCalledTimes(1);

    resolveAction!({ ok: true, compId: "comp-1" });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/comps/comp-1"));
  });
});

describe("NewCompForm — live character counter", () => {
  it("shows 0/N initially and updates as the user types, using COMP_NAME_MAX_LENGTH", () => {
    render(<NewCompForm />);

    expect(screen.getByTestId("comp-name-char-count")).toHaveTextContent(`0/${COMP_NAME_MAX_LENGTH}`);

    fireEvent.change(screen.getByLabelText("Nome da comp"), { target: { value: "ZvZ Terça" } });
    expect(screen.getByTestId("comp-name-char-count")).toHaveTextContent(`9/${COMP_NAME_MAX_LENGTH}`);
  });
});
