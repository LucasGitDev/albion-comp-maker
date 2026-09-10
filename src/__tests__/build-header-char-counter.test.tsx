import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BuildHeader } from "@/components/editor/BuildHeader";
import { BUILD_NAME_MAX_LENGTH, BUILD_ROLE_MAX_LENGTH } from "@/lib/validation-constants";
import { buildStateSchema } from "@/lib/build-schema";
import { createEmptyBuild } from "@/types/build";

describe("BuildHeader name/role character counters (ACM-036)", () => {
  it("updates the name counter live as the user types", () => {
    const build = { ...createEmptyBuild(), name: "" };
    render(<BuildHeader build={build} onNameChange={vi.fn()} onRoleChange={vi.fn()} />);

    expect(screen.getByTestId("name-char-count")).toHaveTextContent(`0/${BUILD_NAME_MAX_LENGTH}`);

    // Simulate the parent updating `build.name` in response to onChange, since
    // the input is controlled and this component owns no local state.
    const { rerender } = render(
      <BuildHeader build={{ ...build, name: "Dragon Raid" }} onNameChange={vi.fn()} onRoleChange={vi.fn()} />,
    );
    void rerender;
    expect(screen.getAllByTestId("name-char-count").at(-1)).toHaveTextContent(`11/${BUILD_NAME_MAX_LENGTH}`);
  });

  it("fires onNameChange with the typed value so the counter can reflect it", () => {
    const build = createEmptyBuild();
    const onNameChange = vi.fn();
    render(<BuildHeader build={build} onNameChange={onNameChange} onRoleChange={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Bruiser de frontline"), {
      target: { value: "Meele Comp" },
    });

    expect(onNameChange).toHaveBeenCalledWith("Meele Comp");
  });

  it("shows the shared BUILD_NAME_MAX_LENGTH constant as the maximum, not a hardcoded number", () => {
    const build = createEmptyBuild();
    render(<BuildHeader build={build} onNameChange={vi.fn()} onRoleChange={vi.fn()} />);

    expect(screen.getByTestId("name-char-count")).toHaveTextContent(`/${BUILD_NAME_MAX_LENGTH}`);
    expect(screen.getByTestId("role-char-count")).toHaveTextContent(`/${BUILD_ROLE_MAX_LENGTH}`);
  });

  it("caps the name input at BUILD_NAME_MAX_LENGTH via maxLength", () => {
    const build = createEmptyBuild();
    render(<BuildHeader build={build} onNameChange={vi.fn()} onRoleChange={vi.fn()} />);

    const input = screen.getByPlaceholderText("Bruiser de frontline");
    expect(input).toHaveAttribute("maxLength", String(BUILD_NAME_MAX_LENGTH));
  });

  it("caps the role input at BUILD_ROLE_MAX_LENGTH via maxLength", () => {
    const build = createEmptyBuild();
    render(<BuildHeader build={build} onNameChange={vi.fn()} onRoleChange={vi.fn()} />);

    const input = screen.getByPlaceholderText("Tank");
    expect(input).toHaveAttribute("maxLength", String(BUILD_ROLE_MAX_LENGTH));
  });

  it("counts accented PT-BR text the same way the server schema does (UTF-16 code units, no trim mismatch)", () => {
    const accentedName = "Comp de Invasão Açúcar Não-Padrão Épico";
    const build = { ...createEmptyBuild(), name: accentedName };
    render(<BuildHeader build={build} onNameChange={vi.fn()} onRoleChange={vi.fn()} />);

    expect(screen.getByTestId("name-char-count")).toHaveTextContent(
      `${accentedName.length}/${BUILD_NAME_MAX_LENGTH}`,
    );

    // The schema enforces `.max(BUILD_NAME_MAX_LENGTH)` on `.length` directly
    // (no `.trim()` beforehand), so what the counter shows must agree with
    // what parsing actually allows for the same string.
    const result = buildStateSchema.safeParse({ ...build, name: accentedName });
    const nameIssue = result.success
      ? null
      : result.error.issues.find((issue) => issue.path[0] === "name");
    expect(accentedName.length <= BUILD_NAME_MAX_LENGTH ? nameIssue : null).toBeNull();
  });
});

describe("BuildHeader accessible character limit warning (ACM-070)", () => {
  it("keeps the accessible name of the inputs unchanged", () => {
    const build = createEmptyBuild();
    render(<BuildHeader build={build} onNameChange={vi.fn()} onRoleChange={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: "Nome do build" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Papel" })).toBeInTheDocument();
  });

  it("stays silent while far from the character limit", () => {
    const build = { ...createEmptyBuild(), name: "Short" };
    render(<BuildHeader build={build} onNameChange={vi.fn()} onRoleChange={vi.fn()} />);

    expect(screen.getAllByRole("status").map((el) => el.textContent)).toEqual(["", ""]);
  });

  it("announces a warning via a polite live region once within the threshold of the name limit", () => {
    const nearLimitName = "x".repeat(BUILD_NAME_MAX_LENGTH - 5);
    const build = { ...createEmptyBuild(), name: nearLimitName };
    render(<BuildHeader build={build} onNameChange={vi.fn()} onRoleChange={vi.fn()} />);

    const statuses = screen.getAllByRole("status");
    const nameWarning = statuses.find((el) => el.textContent && el.textContent.length > 0);
    expect(nameWarning).toHaveTextContent("5");
    expect(nameWarning).toHaveAttribute("aria-live", "polite");
  });

  it("wires the warning region via aria-describedby instead of the accessible name", () => {
    const build = createEmptyBuild();
    render(<BuildHeader build={build} onNameChange={vi.fn()} onRoleChange={vi.fn()} />);

    const nameInput = screen.getByRole("textbox", { name: "Nome do build" });
    expect(nameInput).toHaveAttribute("aria-describedby", "build-name-char-warning");
  });
});
