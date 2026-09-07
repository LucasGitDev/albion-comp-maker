"use client";

import type { AOItem } from "@/data/ao-data.d";
import { ItemIcon } from "@/components/icons/ItemIcon";

export type ItemResultListProps = {
  id: string;
  label: string;
  items: AOItem[];
  activeIndex: number;
  locale: string;
  optionId: (item: AOItem) => string;
  onHover: (index: number) => void;
  onSelect: (item: AOItem) => void;
};

function tierOf(uniquename: string): number {
  const match = /^T([1-8])_/.exec(uniquename);
  return match ? Number(match[1]) : 0;
}

/** 44px single-line rows per doc-002 section 3.2. No grouping, no fuzzy match. */
export function ItemResultList({
  id,
  label,
  items,
  activeIndex,
  locale,
  optionId,
  onHover,
  onSelect,
}: ItemResultListProps): React.JSX.Element {
  return (
    <ul id={id} role="listbox" aria-label={label} className="max-h-[420px] overflow-y-auto">
      {items.map((item, index) => {
        const name = item.localizedNames?.[locale] ?? item.uniquename;
        const tier = tierOf(item.uniquename);
        const isActive = index === activeIndex;
        return (
          <li
            key={item.uniquename}
            id={optionId(item)}
            role="option"
            aria-selected={false}
            aria-setsize={items.length}
            aria-posinset={index + 1}
            onMouseEnter={() => onHover(index)}
            onClick={() => onSelect(item)}
            className={`flex h-11 cursor-pointer items-center gap-2 px-2 text-sm text-white ${
              isActive ? "bg-[#232833]" : "hover:bg-[#1c1f26]"
            }`}
          >
            <ItemIcon itemId={item.uniquename} alt={name} size="sm" decorative />
            <span className="flex-1 truncate">{name}</span>
            {tier > 0 && (
              <span className="text-xs font-medium tabular-nums text-[#c8a24a]">{`T${tier}`}</span>
            )}
            {item.twohanded && (
              <span className="text-xs font-medium tabular-nums text-[#6b7280]">2H</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
