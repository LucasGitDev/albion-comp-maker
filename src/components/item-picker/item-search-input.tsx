"use client";

import type { ChangeEvent, KeyboardEvent } from "react";

export type ItemSearchInputProps = {
  id: string;
  value: string;
  placeholder: string;
  activeDescendantId: string | undefined;
  listboxId: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
};

/**
 * Bare `role="combobox"` input. Owns no matching or list logic — see
 * doc-002 section 7 for the aria-activedescendant contract this implements.
 */
export function ItemSearchInput({
  id,
  value,
  placeholder,
  activeDescendantId,
  listboxId,
  onChange,
  onKeyDown,
  className,
}: ItemSearchInputProps): React.JSX.Element {
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onChange(event.target.value);
  }

  return (
    <input
      id={id}
      type="text"
      role="combobox"
      autoComplete="off"
      aria-expanded="true"
      aria-controls={listboxId}
      aria-activedescendant={activeDescendantId}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      className={
        className ??
        "w-full rounded-md border border-[#2a2e37] bg-[#14171d] px-3 py-2 text-sm text-white outline-none focus:border-[#c8a24a]"
      }
    />
  );
}
