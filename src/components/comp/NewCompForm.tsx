"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { createCompAction } from "@/actions/comps";
import { COMP_NAME_MAX_LENGTH } from "@/lib/validation-constants";

/**
 * One-field form for `/comp/new` (ACM-097). Deliberately does NOT import
 * `@/lib/comp-schema` — it is `import "server-only"` (decision-013) and
 * `src/__tests__/server-only-boundary.test.ts` fails the build if any
 * Client Component reaches it, even transitively. Length/emptiness are
 * instead validated here against `COMP_NAME_MAX_LENGTH`
 * (`@/lib/validation-constants`), the shared numeric mirror of
 * `compNameSchema.max(...)` — same pattern as `BuildHeader`'s name/role
 * counters.
 */
export function NewCompForm(): React.JSX.Element {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmedLength = name.trim().length;
  const isOverLimit = trimmedLength > COMP_NAME_MAX_LENGTH;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Guards against a second click landing while the first submit's
    // transition is still in flight — the button is also `disabled` while
    // pending, but that alone races with fast repeated Enter/click events
    // before React re-renders (ACM-097 AC#4).
    if (isPending) return;

    const trimmed = name.trim();
    if (trimmed === "") {
      setError("Informe um nome para a comp");
      inputRef.current?.focus();
      return;
    }
    if (trimmed.length > COMP_NAME_MAX_LENGTH) {
      setError(
        `O nome pode ter no máximo ${COMP_NAME_MAX_LENGTH} caracteres (você digitou ${trimmed.length})`,
      );
      inputRef.current?.focus();
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createCompAction({ name: trimmed });
      if (!result.ok) {
        setError(result.error);
        inputRef.current?.focus();
        return;
      }
      // Client-side navigation to the OWNER page, not the public
      // `/comp/[slug]` route — see decision-027. A brand-new comp has zero
      // builds, and the public route 404s for that case (decision-015).
      router.push(`/comps/${result.compId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="comp-name" className="text-sm font-medium text-foreground">
          Nome da comp
        </label>
        <input
          id="comp-name"
          ref={inputRef}
          type="text"
          value={name}
          placeholder="ZvZ Terça"
          onChange={(e) => setName(e.target.value)}
          aria-invalid={error !== null}
          aria-describedby="comp-name-error comp-name-char-count"
          className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-foreground outline-none focus-visible:border-[var(--color-accent)]"
        />
        <div className="flex items-center justify-between">
          {error ? (
            <p id="comp-name-error" role="alert" className="text-sm text-red-500">
              {error}
            </p>
          ) : (
            <span />
          )}
          <span
            data-testid="comp-name-char-count"
            id="comp-name-char-count"
            className={
              isOverLimit ? "text-xs font-medium text-red-500" : "text-xs text-foreground/60"
            }
          >
            {trimmedLength}/{COMP_NAME_MAX_LENGTH}
          </span>
        </div>
        {/*
          Polite live region, separate from the `role="alert"` error above.
          It stays silent while the user is under the limit (avoiding a
          chatty per-keystroke announcement) and only speaks once the
          over-limit threshold is crossed, so screen-reader users learn
          about it before hitting submit instead of only via the
          submit-time alert.
        */}
        <span role="status" aria-live="polite" className="sr-only">
          {isOverLimit
            ? `Nome muito longo: ${trimmedLength} de ${COMP_NAME_MAX_LENGTH} caracteres`
            : ""}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none disabled:opacity-60"
        >
          {isPending ? "Criando..." : "Criar comp"}
        </button>
        <Link href="/comps" className="text-sm text-foreground/60 hover:text-foreground">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
