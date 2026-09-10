"use client";

import { useEffect } from "react";
import {
  ICON_ID_PATTERN,
  ICON_SIZE_CLASS,
  ICON_SIZE_PX,
  buildItemIconUrl,
  joinClassNames,
  warnInvalidIconOnce,
  type IconSize,
} from "./icon-tokens";
import { useIconStatus } from "./use-icon-status";
import { CategorySilhouette, type IconCategory } from "./category-glyphs";

export type ItemIconProps = {
  itemId: string;
  alt: string;
  size?: IconSize;
  quality?: 1 | 2 | 3 | 4 | 5;
  decorative?: boolean;
  className?: string;
  title?: string;
  /**
   * Slot category used to pick the silhouette shown when the sprite
   * resolves to a 1x1 blank PNG (ACM-044) — e.g. a vanity item with no
   * upstream render. Defaults to a neutral generic silhouette for callers
   * without slot context.
   */
  category?: IconCategory;
};

export function ItemIcon({
  itemId,
  alt,
  size = "md",
  quality = 1,
  decorative = false,
  className,
  title,
  category = "generic",
}: ItemIconProps): React.JSX.Element {
  const isValidId = ICON_ID_PATTERN.test(itemId);
  const src = isValidId ? buildItemIconUrl(itemId, quality) : null;
  const { status, handleLoad, handleError, refCallback } = useIconStatus(src);
  const resolvedStatus = isValidId ? status : "error";

  useEffect(() => {
    if (resolvedStatus === "error") {
      warnInvalidIconOnce(itemId, `ItemIcon: invalid or failed item id "${itemId}"`);
    }
  }, [resolvedStatus, itemId]);

  const px = ICON_SIZE_PX[size];
  const glyphSize = Math.round(px * 0.6);
  const displayAlt = decorative ? "" : alt;

  return (
    <span
      className={joinClassNames(
        "relative inline-flex items-center justify-center overflow-hidden rounded-md bg-icon-slot",
        ICON_SIZE_CLASS[size],
        className
      )}
      aria-hidden={decorative || undefined}
      title={title ?? (resolvedStatus === "error" ? itemId : undefined)}
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
        >
          <CategorySilhouette category={category} size={glyphSize} />
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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={refCallback}
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
    </span>
  );
}
