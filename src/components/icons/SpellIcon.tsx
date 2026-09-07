"use client";

import { useEffect } from "react";
import {
  ICON_ID_PATTERN,
  ICON_SIZE_CLASS,
  ICON_SIZE_PX,
  buildSpellIconUrl,
  joinClassNames,
  warnInvalidIconOnce,
  type IconSize,
} from "./icon-tokens";
import { useIconStatus } from "./use-icon-status";

export type SpellSlotLabel = "Q" | "W" | "E" | "R" | "Passive";

export type SpellIconProps = {
  sprite: string | null;
  alt: string;
  size?: IconSize;
  slotLabel?: SpellSlotLabel;
  decorative?: boolean;
  className?: string;
};

export function SpellIcon({
  sprite,
  alt,
  size = "md",
  slotLabel,
  decorative = false,
  className,
}: SpellIconProps): React.JSX.Element {
  const isEmpty = sprite === null;
  const isValidId = sprite !== null && ICON_ID_PATTERN.test(sprite);
  const src = isValidId && sprite !== null ? buildSpellIconUrl(sprite) : null;
  const { status, handleLoad, handleError } = useIconStatus(src);
  const resolvedStatus = isEmpty ? "empty" : isValidId ? status : "error";

  useEffect(() => {
    if (resolvedStatus === "error" && sprite !== null) {
      warnInvalidIconOnce(sprite, `SpellIcon: invalid or failed sprite id "${sprite}"`);
    }
  }, [resolvedStatus, sprite]);

  const px = ICON_SIZE_PX[size];
  const glyphSize = Math.round(px * 0.6);
  const displayAlt = decorative ? "" : alt;
  const sizeClass = ICON_SIZE_CLASS[size];

  const slotLabelGlyph = slotLabel && (
    <span
      aria-hidden="true"
      className="absolute bottom-0 right-0 rounded-sm bg-black/70 px-0.5 font-mono text-[10px] tabular-nums text-white"
    >
      {slotLabel === "Passive" ? "P" : slotLabel}
    </span>
  );

  if (isEmpty) {
    return (
      <span
        role="img"
        aria-label={decorative ? undefined : displayAlt}
        aria-hidden={decorative || undefined}
        className={joinClassNames(
          "relative inline-flex items-center justify-center rounded-md border border-dashed border-icon-slot-empty",
          sizeClass,
          className
        )}
        data-icon-status="empty"
      >
        {slotLabelGlyph}
      </span>
    );
  }

  return (
    <span
      className={joinClassNames(
        "relative inline-flex items-center justify-center overflow-hidden rounded-md bg-icon-slot",
        sizeClass,
        className
      )}
      aria-hidden={decorative || undefined}
      title={resolvedStatus === "error" && sprite !== null ? sprite : undefined}
      data-icon-status={resolvedStatus}
    >
      <span
        aria-hidden="true"
        className={joinClassNames(
          "absolute inset-0 rounded-md bg-icon-placeholder",
          resolvedStatus === "loading" && "animate-pulse",
          resolvedStatus === "error" && "ring-1 ring-inset ring-icon-error"
        )}
      />
      {resolvedStatus === "missing" && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-icon-muted"
          style={{ fontSize: glyphSize }}
        >
          ?
        </span>
      )}
      {resolvedStatus === "error" && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-icon-muted"
          style={{ fontSize: glyphSize }}
        >
          !
        </span>
      )}
      {isValidId && src !== null && (
        <img
          src={src}
          alt={displayAlt}
          aria-hidden={decorative || undefined}
          width={px}
          height={px}
          onLoad={handleLoad}
          onError={handleError}
          className={joinClassNames(
            "absolute inset-0 h-full w-full object-contain transition-opacity duration-150 ease-out",
            resolvedStatus === "loaded" ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      {slotLabelGlyph}
    </span>
  );
}
