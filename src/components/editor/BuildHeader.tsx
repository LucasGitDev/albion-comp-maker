"use client";

import { BUILD_NAME_MAX_LENGTH, BUILD_ROLE_MAX_LENGTH } from "@/lib/validation-constants";
import type { BuildState } from "@/types/build";
import { useOptionalLocale } from "@/components/i18n/LocaleProvider";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { t, tf } from "@/lib/i18n/messages";

export type BuildHeaderProps = {
  build: BuildState;
  onNameChange: (name: string) => void;
  onRoleChange: (role: string) => void;
};

/** Only announce once the field is this close to `maxLength` — avoids a
 * live region firing on every keystroke while the user is still far from
 * the limit (ACM-070). */
const REMAINING_CHARS_WARNING_THRESHOLD = 10;

/**
 * Identity block for the build being edited — deliberately *not* styled as a
 * second header (no `border-b`, no slot counter). Two bars on one screen
 * competed for the "this is the toolbar" read (ACM-038 FINDING 5 / doc-004
 * §3.2); the slot counter moved to `EditorActionBar` (`data-testid="slot-count"`
 * kept there so the existing assertions on that testid still pass).
 */
export function BuildHeader({ build, onNameChange, onRoleChange }: BuildHeaderProps): React.JSX.Element {
  const locale = useOptionalLocale() ?? DEFAULT_LOCALE;
  const nameRemaining = BUILD_NAME_MAX_LENGTH - build.name.length;
  const roleRemaining = BUILD_ROLE_MAX_LENGTH - build.role.length;
  const nameWarning =
    nameRemaining <= REMAINING_CHARS_WARNING_THRESHOLD
      ? tf(locale, "editor.nameCharsRemaining", { n: nameRemaining })
      : "";
  const roleWarning =
    roleRemaining <= REMAINING_CHARS_WARNING_THRESHOLD
      ? tf(locale, "editor.roleCharsRemaining", { n: roleRemaining })
      : "";
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-sm font-semibold text-foreground/70">{t(locale, "editor.buildDetails")}</h1>
      <div className="flex flex-wrap items-center gap-4">
      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
          <span>{t(locale, "editor.buildNameLabel")}</span>
          <span
            data-testid="name-char-count"
            aria-hidden="true"
            className="tabular-nums normal-case tracking-normal"
          >
            {build.name.length}/{BUILD_NAME_MAX_LENGTH}
          </span>
        </span>
        {/*
          No `autoFocus` here (ACM-037 review finding): with the header,
          breadcrumb, and action bar all preceding `<main>` on this route,
          stealing focus into this input on load skipped the global skip
          link entirely — forward-Tab never reached it, and Shift+Tab from
          here jumped straight to "Exportar PNG".
        */}
        <input
          aria-label={t(locale, "editor.buildNameLabel")}
          aria-describedby="build-name-char-warning"
          value={build.name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t(locale, "editor.buildNamePlaceholder")}
          maxLength={BUILD_NAME_MAX_LENGTH}
          className="rounded-md border border-icon-slot-empty bg-icon-slot px-3 py-1.5 text-sm outline-none focus:border-[var(--color-enchant)]"
        />
        <span id="build-name-char-warning" role="status" aria-live="polite" className="sr-only">
          {nameWarning}
        </span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
          <span>{t(locale, "editor.roleLabel")}</span>
          <span
            data-testid="role-char-count"
            aria-hidden="true"
            className="tabular-nums normal-case tracking-normal"
          >
            {build.role.length}/{BUILD_ROLE_MAX_LENGTH}
          </span>
        </span>
        <input
          aria-label={t(locale, "editor.roleLabel")}
          aria-describedby="build-role-char-warning"
          value={build.role}
          onChange={(event) => onRoleChange(event.target.value)}
          placeholder={t(locale, "editor.rolePlaceholder")}
          maxLength={BUILD_ROLE_MAX_LENGTH}
          className="rounded-md border border-icon-slot-empty bg-icon-slot px-3 py-1.5 text-sm outline-none focus:border-[var(--color-enchant)]"
        />
        <span id="build-role-char-warning" role="status" aria-live="polite" className="sr-only">
          {roleWarning}
        </span>
      </label>
      </div>
    </div>
  );
}
