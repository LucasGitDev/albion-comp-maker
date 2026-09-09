"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { THEME_PRESET_NAMES, type NamedThemePreset } from "@/components/build-card/theme-presets";
import { DEFAULT_BUILD_ACCENT } from "@/components/build-card/tokens";
import type { BuildCardTheme } from "@/components/build-card/types";
import {
  ACCENT_HEX_PATTERN,
  BG_ALLOWED_MIME,
  BG_BLUR_MAX,
  BG_BLUR_MIN,
  BG_DARKEN_MAX,
  BG_DARKEN_MIN,
  BG_MAX_UPLOAD_BYTES,
  BG_SCALE_MAX,
  BG_SCALE_MIN,
} from "@/lib/validation-constants";
import { useOptionalLocale } from "@/components/i18n/LocaleProvider";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/messages";

/**
 * ACM-014 theme panel (doc-007, simplified against decision-019's leaner
 * `BuildCardTheme` shape — see the implementation notes on this task, and the
 * PR #50 review-fix notes, for the deviations that remain from the full
 * doc-007 spec: no responsive rail/slide-over/sheet split, no "Voltar para
 * X"/undo affordance, no keyboard-shortcut announce region, no real Cinzel
 * webfont (see `BuildCardTheme.fontFamily`'s doc). Those are tracked as an
 * explicit follow-up (ACM-082) rather than silently dropped.
 *
 * Always a sibling of `#capture-root`, never a descendant (decision-010):
 * this component renders nothing inside the card, only controls next to it.
 */

const PRESET_LABELS: Readonly<Record<NamedThemePreset, string>> = {
  "dark-purple": "Roxo escuro",
  gold: "Dourado",
  blood: "Sangue",
  ice: "Gelo",
};

const FONT_LABELS: Readonly<Record<BuildCardTheme["fontFamily"], string>> = {
  sans: "Sem serifa",
  mono: "Monoespaçada",
  serif: "Serifada",
};

const ASPECT_LABELS: Readonly<Record<BuildCardTheme["aspectRatio"], string>> = {
  square: "Quadrado",
  wide: "Largo",
  auto: "Automático",
};

export type ThemePanelProps = {
  theme: BuildCardTheme;
  onChange: (theme: BuildCardTheme) => void;
  /** `BuildState.accent` (decision-019 keeps it there, not in `theme_json`) — see `tokens.ts`'s `resolveAccent`. */
  accent?: string;
  onAccentChange?: (accent: string) => void;
};

type UploadState = { kind: "idle" } | { kind: "uploading" } | { kind: "error"; message: string };

/**
 * Any control in this panel counts as "the user personalized the theme" for
 * doc-007 §9.2/D5's `custom` rule: touching a slider, a toggle, the font or
 * the accent after a named preset was applied converts the selector to
 * `"custom"`, preserving every value already in place. Clicking a preset
 * card directly is the only action that does NOT go through this — it sets
 * `preset` on purpose.
 */
function markCustomIfNamed(theme: BuildCardTheme): BuildCardTheme {
  if ((THEME_PRESET_NAMES as readonly string[]).includes(theme.preset)) {
    return { ...theme, preset: "custom" };
  }
  return theme;
}

async function uploadBackground(file: File): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch("/api/background", { method: "POST", body: formData });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Não deu para enviar a imagem.");
  }
  const body = (await response.json()) as { id: string };
  return body.id;
}

function formatMegabytes(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  return (Number.isInteger(megabytes) ? String(megabytes) : megabytes.toFixed(1)).replace(".", ",");
}

export function ThemePanel({
  theme,
  onChange,
  accent = DEFAULT_BUILD_ACCENT,
  onAccentChange = () => {},
}: ThemePanelProps): React.JSX.Element {
  const locale = useOptionalLocale() ?? DEFAULT_LOCALE;
  const [upload, setUpload] = useState<UploadState>({ kind: "idle" });
  const [accentDraft, setAccentDraft] = useState(accent);
  /** doc-007 §11: announced via the `aria-live="polite"` region below whenever the preset or background changes. */
  const [announcement, setAnnouncement] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();

  // Keeps the text field in sync when the accent changes from outside this
  // panel (e.g. the same build reopened with a saved accent).
  useEffect(() => {
    const sync = (): void => setAccentDraft(accent);
    sync();
  }, [accent]);

  const handlePresetClick = useCallback(
    (preset: NamedThemePreset) => {
      onChange({ ...theme, preset });
      setAnnouncement(`Preset alterado para ${PRESET_LABELS[preset]}.`);
    },
    [theme, onChange]
  );

  const handleFileSelected = useCallback(
    async (fileList: FileList | null) => {
      const file = fileList?.[0];
      if (!file) return;

      if (!(BG_ALLOWED_MIME as readonly string[]).includes(file.type)) {
        setUpload({ kind: "error", message: "Formato não suportado. Use JPEG, PNG ou WebP." });
        return;
      }

      if (file.size > BG_MAX_UPLOAD_BYTES) {
        setUpload({
          kind: "error",
          message: `Essa imagem tem ${formatMegabytes(file.size)} MB. O limite é ${formatMegabytes(BG_MAX_UPLOAD_BYTES)} MB.`,
        });
        return;
      }

      setUpload({ kind: "uploading" });
      try {
        const imageId = await uploadBackground(file);
        onChange(markCustomIfNamed({ ...theme, background: { imageId, blur: 0, darken: 0.4, scale: 1 } }));
        setUpload({ kind: "idle" });
        setAnnouncement("Imagem de fundo aplicada.");
      } catch (error) {
        setUpload({ kind: "error", message: error instanceof Error ? error.message : "Não deu para enviar a imagem." });
      }
    },
    [theme, onChange]
  );

  const handleRemoveBackground = useCallback(() => {
    onChange(markCustomIfNamed({ ...theme, background: null }));
    setAnnouncement("Imagem de fundo removida.");
  }, [theme, onChange]);

  const handleAccentCommit = useCallback(
    (value: string) => {
      setAccentDraft(value);
      if (ACCENT_HEX_PATTERN.test(value)) {
        onAccentChange(value);
        onChange(markCustomIfNamed(theme));
      }
    },
    [theme, onChange, onAccentChange]
  );

  const background = theme.background;
  const accentValid = ACCENT_HEX_PATTERN.test(accentDraft);

  const backgroundSummary = background ? `imagem, blur ${Math.round(background.blur)}` : "sem imagem";
  const colorsSummary = `${accent} · ${FONT_LABELS[theme.fontFamily]}`;
  const contentSummary = `${theme.showItemNames ? "nomes visíveis" : "nomes ocultos"} · ${ASPECT_LABELS[theme.aspectRatio]}`;

  return (
    <aside
      aria-labelledby={titleId}
      className="flex w-full flex-col gap-6 rounded-lg border border-[var(--color-border)] p-4 md:w-80 md:shrink-0"
    >
      <h2 id={titleId} className="text-sm font-semibold text-foreground">
        {t(locale, "theme.title")}
      </h2>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <section aria-label="Preset de tema">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70">{t(locale, "theme.preset")}</h3>
        <div role="radiogroup" aria-label="Preset de tema" className="grid grid-cols-2 gap-2">
          {THEME_PRESET_NAMES.map((preset) => (
            <button
              key={preset}
              type="button"
              role="radio"
              aria-checked={theme.preset === preset}
              onClick={() => handlePresetClick(preset)}
              className="flex flex-col items-start gap-1 rounded-md border border-[var(--color-border)] p-2 text-left text-xs font-medium text-foreground transition-colors duration-150 ease-out hover:border-[var(--color-accent)] data-[selected=true]:border-[var(--color-accent)]"
              data-selected={theme.preset === preset}
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
        </div>
        {theme.preset === "custom" && <p className="mt-2 text-[11px] text-foreground/70">Personalizado</p>}
      </section>

      <details open className="flex flex-col gap-3">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70">
          {t(locale, "theme.background")} <span className="font-normal normal-case tracking-normal text-foreground/50">· {backgroundSummary}</span>
        </summary>

        <div className="flex flex-col gap-3">
          {background ? (
            <div className="flex items-center justify-between gap-2 text-xs text-foreground">
              <span>Imagem de fundo aplicada.</span>
              <div className="flex gap-2">
                <button type="button" className="underline" onClick={() => fileInputRef.current?.click()}>
                  Trocar
                </button>
                <button type="button" className="underline" onClick={handleRemoveBackground}>
                  Remover
                </button>
              </div>
            </div>
          ) : upload.kind === "error" ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 rounded-md border p-4 text-center text-xs"
              style={{ borderStyle: "solid", borderColor: "var(--color-icon-error-fg)", color: "var(--color-icon-error-fg)" }}
            >
              <span role="alert">{upload.message}</span>
              <span className="text-[11px] underline">Escolher outra</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 rounded-md border border-dashed border-[var(--color-icon-slot-empty)] p-4 text-center text-xs text-foreground/70"
            >
              <span>Arraste uma imagem ou clique</span>
              <span className="text-[11px]">JPEG, PNG ou WebP · até 4 MB</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              void handleFileSelected(event.target.files);
              event.target.value = "";
            }}
          />
          {upload.kind === "uploading" && (
            <p role="status" aria-live="polite" className="text-xs text-foreground/70">
              Enviando imagem…
            </p>
          )}

          <LabeledSlider
            label="Desfoque do fundo"
            unit="px"
            unitAnnounced="pixels"
            min={BG_BLUR_MIN}
            max={BG_BLUR_MAX}
            step={1}
            defaultValue={BG_BLUR_MIN}
            value={background?.blur ?? BG_BLUR_MIN}
            disabled={!background}
            onChange={(blur) => background && onChange(markCustomIfNamed({ ...theme, background: { ...background, blur } }))}
          />
          <LabeledSlider
            label="Escurecer o fundo"
            unit="%"
            unitAnnounced="por cento"
            min={BG_DARKEN_MIN * 100}
            max={BG_DARKEN_MAX * 100}
            step={5}
            defaultValue={40}
            value={(background?.darken ?? 0.4) * 100}
            disabled={!background}
            onChange={(percent) =>
              background && onChange(markCustomIfNamed({ ...theme, background: { ...background, darken: percent / 100 } }))
            }
          />
          <LabeledSlider
            label="Escala da imagem de fundo"
            unit="%"
            unitAnnounced="por cento"
            min={BG_SCALE_MIN * 100}
            max={BG_SCALE_MAX * 100}
            step={5}
            defaultValue={100}
            value={(background?.scale ?? 1) * 100}
            disabled={!background}
            onChange={(percent) =>
              background && onChange(markCustomIfNamed({ ...theme, background: { ...background, scale: percent / 100 } }))
            }
          />
        </div>
      </details>

      <details className="flex flex-col gap-3">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70">
          {t(locale, "theme.colorsAndTypography")} <span className="font-normal normal-case tracking-normal text-foreground/50">· {colorsSummary}</span>
        </summary>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="theme-accent-hex" className="text-xs text-foreground">
              Cor de destaque
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Cor de destaque"
                value={accentValid ? accentDraft : accent}
                onChange={(event) => handleAccentCommit(event.target.value)}
                className="size-9 shrink-0 rounded-md border border-[var(--color-border)] bg-transparent p-0"
              />
              <input
                id="theme-accent-hex"
                type="text"
                value={accentDraft}
                onChange={(event) => {
                  const value = event.target.value;
                  setAccentDraft(value);
                  if (ACCENT_HEX_PATTERN.test(value)) handleAccentCommit(value);
                }}
                className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
              />
            </div>
            {!accentValid && (
              <p className="text-[11px]" style={{ color: "var(--color-icon-error-fg)" }}>
                Use um hex de 6 dígitos, ex. #E8823C
              </p>
            )}
          </div>

          <label className="flex items-center justify-between text-xs text-foreground">
            <span>Fonte</span>
            <select
              value={theme.fontFamily}
              onChange={(event) =>
                onChange(markCustomIfNamed({ ...theme, fontFamily: event.target.value as BuildCardTheme["fontFamily"] }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
            >
              <option value="sans">Sem serifa</option>
              <option value="mono">Monoespaçada</option>
              <option value="serif">Serifada</option>
            </select>
          </label>
        </div>
      </details>

      <details className="flex flex-col gap-3">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70">
          {t(locale, "theme.contentAndFormat")} <span className="font-normal normal-case tracking-normal text-foreground/50">· {contentSummary}</span>
        </summary>
        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between text-xs text-foreground">
            <span>Mostrar nomes de item</span>
            <input
              type="checkbox"
              checked={theme.showItemNames}
              onChange={(event) => onChange(markCustomIfNamed({ ...theme, showItemNames: event.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between text-xs text-foreground">
            <span>Mostrar nomes de habilidade</span>
            <input
              type="checkbox"
              checked={theme.showSpellNames}
              onChange={(event) => onChange(markCustomIfNamed({ ...theme, showSpellNames: event.target.checked }))}
            />
          </label>

          <fieldset>
            <legend className="mb-1 text-xs text-foreground">Proporção</legend>
            <div role="radiogroup" aria-label="Proporção do card" className="grid grid-cols-3 gap-1">
              {(
                [
                  { value: "square", label: "Quadrado" },
                  { value: "wide", label: "Largo" },
                  { value: "auto", label: "Automático" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={theme.aspectRatio === option.value}
                  onClick={() => onChange(markCustomIfNamed({ ...theme, aspectRatio: option.value }))}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] font-medium text-foreground data-[selected=true]:border-[var(--color-accent)]"
                  data-selected={theme.aspectRatio === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </details>
    </aside>
  );
}

type LabeledSliderProps = {
  label: string;
  unit: string;
  /** Unit spelled out for `aria-valuetext` (doc-007 §11) — e.g. "pixels", "por cento". */
  unitAnnounced: string;
  min: number;
  max: number;
  step: number;
  /** Value `Home` restores (doc-007 §7/§11: the *default*, not necessarily `min`). */
  defaultValue: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

function LabeledSlider({
  label,
  unit,
  unitAnnounced,
  min,
  max,
  step,
  defaultValue,
  value,
  disabled,
  onChange,
}: LabeledSliderProps): React.JSX.Element {
  const inputId = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-foreground">
        <label htmlFor={inputId}>{label}</label>
        <output htmlFor={inputId} style={{ fontVariantNumeric: "tabular-nums" }}>
          {Math.round(value)} {unit}
        </output>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-disabled={disabled}
        aria-valuetext={`${Math.round(value)} ${unitAnnounced}`}
        title="Home restaura o valor padrão"
        onChange={(event) => onChange(Number(event.target.value))}
        onKeyDown={(event) => {
          if (event.key === "Home") {
            event.preventDefault();
            onChange(defaultValue);
          }
        }}
        className="w-full"
      />
    </div>
  );
}
