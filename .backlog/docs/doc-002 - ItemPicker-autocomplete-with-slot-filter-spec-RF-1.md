---
id: doc-002
title: ItemPicker autocomplete with slot filter spec (RF-1)
type: specification
created_date: '2026-09-07 16:40'
---

Task: ACM-008. Depends on ACM-005 (data), ACM-007 (`ItemIcon`, doc-001).
Read doc-001 first — icon rendering is settled and is **not** redesigned here.

## 0. Data contract this spec assumes

`AOItem` in `src/data/ao-data.d.ts` today is:

```ts
type AOItem = { uniquename: string; slot: Slot; localizedNames: Record<string,string>; spells: AOItemSpell[] };
```

The picker needs one more field:

```ts
twohanded: boolean;   // from @twohanded in items.json (decision-004)
```

If the emitter does not yet carry it, **add it in the emitter**, do not infer it in the UI.
A `/_2H_/.test(uniquename)` heuristic is allowed *only* as a temporary fallback behind a
`// TODO(ACM-008)` and must be deleted once the field ships — `2H_` is a naming convention,
not a contract, and mounts/bags break it.

Slot histogram the design is sized against (2036 equippable items):
`mainhand 817 · head 280 · armor 264 · shoes 256 · cape 196 · offhand 111 · mount 100 · bag 12`.

The 817-item mainhand list is the design driver. Every decision below is made for that case;
the 12-item bag list is trivially a subset.

---

## 1. Component API

Two components. The trigger is not optional decoration — it owns the empty/filled state
of the slot, and every ACM-008 acceptance criterion is observed through it.

```ts
// src/components/items/ItemPicker.tsx  ("use client")
export type ItemPickerProps = {
  /** Slot this picker fills. Hard-filters the candidate set. */
  slot: Slot;
  /** Currently equipped item uniquename, or null when the slot is empty. */
  value: string | null;
  /** Fired on selection and on clear. */
  onChange: (itemId: string | null) => void;
  /** Visible label above the trigger, e.g. "Mão principal" / "Main hand". */
  label: string;
  /**
   * Slot is unavailable (offhand while a two-handed mainhand is equipped).
   * Trigger renders the locked state and cannot be opened.
   */
  locked?: boolean;
  /** Reason shown in the locked trigger tooltip. Required when `locked`. */
  lockedReason?: string;
  /**
   * Fired when the user selects a two-handed mainhand. The parent — not the
   * picker — owns the offhand and performs the clear. See §4.
   */
  onTwoHandedSelect?: (item: AOItem) => void;
  size?: "md" | "lg";   // trigger icon size, maps to IconSize. default "lg"
  className?: string;
};
```

```ts
// src/lib/item-index.ts  (pure, no React, unit-testable)
export type IndexedItem = {
  item: AOItem;
  tier: number;              // 1..8, 0 when the id has no T-prefix
  enchant: number;           // 0..4 from "@n"
  names: Record<string,string>;      // locale -> normalized name
  idNorm: string;            // uniquename lowercased
};

export function buildItemIndex(items: AOItem[]): ItemIndex;

export type SearchOptions = { slot?: Slot; locale: string; limit?: number };
export function searchItems(index: ItemIndex, query: string, o: SearchOptions): AOItem[];
```

`searchItems` is deliberately a **pure function over a prebuilt index**, not a hook.
It must be testable without a DOM: AC #1 (`< 50 ms`) is asserted in a Vitest bench over the
real 2036-item dataset with `slot: "mainhand"`, not eyeballed in the browser.

The React layer is a thin `useItemSearch(slot)` hook that owns the debounce, the highlighted
index and the open state. It calls `searchItems`; it contains no matching logic.

---

## 2. Search behaviour

### 2.1 Index build (once, module scope)

`buildItemIndex` runs once on first picker mount and is memoised in a module-level
singleton keyed by `AOData.version`. Building 2036 entries is a single pass; do not rebuild
per picker — a comp screen mounts a dozen pickers.

Per item, precompute and store: `tier`, `enchant`, `idNorm`, and a normalized name per
locale. Also bucket the index by slot: `Map<Slot, IndexedItem[]>`. Slot filtering is then a
map lookup, never a `.filter()` over 2036 rows on every keystroke.

**Normalization** (`normalize(s)`), applied to both index entries and query:
`s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim()`

Diacritic stripping is non-negotiable for PT-BR: nobody types `Bastão` with the tilde while
filling twelve slots. `bastao sagrado` must hit `Bastão Sagrado`.

### 2.2 Query parsing

The query is tokenized on whitespace, then each token is classified:

| Token shape | Meaning | Example |
|---|---|---|
| `/^t([1-8])$/` | tier constraint | `t8`, `T4` |
| `/^([1-8])\.([0-4])$/` | tier + enchant | `8.3` |
| `/^[@.]([0-4])$/` | enchant constraint | `.3`, `@3` |
| anything else | text token | `hammer`, `martelo` |

So `T8 hammer`, `hammer t8`, `8.3 martelo` and `hammer` all work, and tier/enchant tokens are
removed from the text match rather than being searched as literals. Without this,
`"T8 hammer"` matches nothing, because no localized name contains the string "T8" — that is
the single most likely first-run bug in this feature.

Tier and enchant tokens are **hard filters** (AND). Text tokens are also AND: every text
token must match the same item. `"great holy"` → `Great Holy Staff`, not the union.

### 2.3 Text matching — substring, not fuzzy

A text token matches an item if it is a substring of any of: the active-locale name, the
other configured locale's name (`en-US` and `pt-BR` are always both searched, regardless of
UI language), or `idNorm`.

**Deliberately no fuzzy/Levenshtein matching.** Albion item names are short, well known and
typed from muscle memory by the target user; edit-distance scoring on 817 candidates
produces a result order that reorders under a keystroke and defeats the "type two letters,
press Down twice, Enter" flow this tool exists for. Predictability beats recall here. If
typo tolerance is ever wanted, add it as a *fallback pass* that only runs when the strict
pass returns zero results — never blended into the main ranking.

Searching both locales simultaneously is intentional and cheap: a PT-BR guild leader reading
an EN meta post types `bloodletter`; an EN user copying a PT-BR comp types `sanguinário`.
Cross-locale hits rank below same-locale hits (§2.4) so they never displace the obvious answer.

### 2.4 Ranking

Score each surviving candidate; **lower wins**. Base score from the best match achieved by
the *first* text token (or 0 filters ⇒ all equal, see empty query below):

| Score | Condition |
|---|---|
| 0 | exact equality with active-locale name |
| 10 | active-locale name starts with the token |
| 20 | active-locale name has a **word** starting with the token (`holy` → `Great Holy Staff`) |
| 30 | other-locale name starts with the token |
| 40 | other-locale name word-prefix |
| 50 | substring anywhere in either name |
| 60 | matched only via `uniquename` |

Tie-breakers, in order: **tier descending** (a comp maker is filling an endgame comp; T8
before T4 is right far more often than not), then **enchant descending**, then
active-locale name `localeCompare`.

Empty query with a slot filter ⇒ score is uniform, so the list is pure tier-desc then
alphabetical. That is a browsable catalogue, which is the correct fallback for a user who
does not know either name.

Sort must be stable and the comparator total — an unstable order across keystrokes moves
rows under the highlight and causes mis-selections.

### 2.5 Debounce and result limit

- Trailing debounce **120 ms** on the input value. Below ~100 ms a fast typist re-renders an
  817-row diff per character; above ~150 ms it feels laggy. 120 ms is the floor that keeps
  AC #1's "< 50 ms after debounce" honest.
- The highlighted index resets to `0` on every committed query change, never on raw keystrokes.
- `limit` defaults to **200**. Nothing beyond 200 is reachable by ranking quality; the count
  announced to the user is the *unlimited* count (§3.3), so truncation is visible, not silent.
- No `requestIdleCallback`, no worker. Measure first: a 2036-item substring pass is
  sub-millisecond, and a worker adds an async boundary that breaks the keyboard flow.

---

## 3. Slot filter and result list

### 3.1 Slot is a prop, not a control

The picker is opened *from* a slot in the build card, so the slot is already known. There is
**no visible slot dropdown inside the picker** — offering "search other slots" from the
head-armour slot is an invitation to equip a mount on your head. The slot is stated, not
chosen: the popover header reads `Mão principal · 817 itens`.

This is a deliberate divergence from albiononlinebuilds.com / albiononlinegrind, which open a
generic item browser with a slot facet. Their picker is a catalogue; ours is a slot-filling
tool used a dozen times per comp, so we trade browsing breadth for keystroke count.

### 3.2 Row anatomy

Fixed row height **44 px**, one line, no wrap. Dense on purpose — this is a work tool
(density follows the user; the onboarding is where we spend whitespace).

```
┌──────────────────────────────────────────────────────────┐
│ [icon] Martelo Sagrado                            T8 ·  2H │   44px
│  32px   ^ active locale, truncate                  ^ tier chip
└──────────────────────────────────────────────────────────┘
```

- Icon: `<ItemIcon size="sm" itemId={...} alt={name} decorative />` — `decorative` because the
  row text already names the item; per doc-001 `alt` is still passed.
- Name: active-locale name. When the match came from the *other* locale, append the matched
  name in muted text: `Bloodletter · Sanguinário`. Otherwise the user sees an unrelated row.
- Matched substring is `<mark>`-highlighted (styled, not default yellow). Highlight only the
  first occurrence per token.
- Right side: tier chip `T8`, and a `2H` badge for `twohanded` mainhands. The 2H badge is what
  makes §4's offhand clear feel caused rather than random.
- No price, no IP, no stats. v1 has no market integration (see CLAUDE.md scope).

### 3.3 Grouping and virtualization

**No grouping.** Results are already slot-homogeneous; grouping by tier would fragment a
9-result list into 6 headers. Tier is carried by the chip and by the sort order.

Virtualize when `results.length > 40`, using fixed-height windowing (`@tanstack/react-virtual`
or a hand-rolled window — fixed 44 px rows make either trivial). Rendering 817 `ItemIcon`s means
817 in-flight `/api/icon` requests; that is the real cost, not the DOM. Overscan 8 rows.

Viewport: `max-h-[420px]` ≈ 9.5 visible rows — a half row visible at the bottom is a
deliberate scroll affordance.

Count line, always present above the list: `817 itens` / `12 resultados` /
`200 de 431 resultados — refine a busca`.

---

## 4. Two-handed / offhand interaction

Rule: a `twohanded` mainhand occupies the offhand.

**The picker does not touch the offhand.** It calls `onTwoHandedSelect(item)` in the same tick
as `onChange(item.uniquename)`; the build state owner performs the clear. Reason: the picker
does not know the comp shape, and a component that silently mutates a sibling slot is
untestable.

Sequence when the user picks a 2H mainhand while the offhand is filled:

1. The popover closes immediately and the mainhand trigger shows the new item.
   **No confirmation dialog.** A modal-inside-a-popover to confirm a game rule the user already
   knows costs a click on the single most repeated action in the app.
2. The offhand slot animates its item out (150 ms fade, matching the icon transition in doc-001)
   and renders the **locked** trigger state.
3. An undo toast appears, bottom-right, 8 s:
   `Martelo Sagrado é de duas mãos. Tocha removida da off-hand.` `[Desfazer]`
   Undo restores both slots atomically. Reversibility is the right mechanism here, not
   prevention — the action is legal and expected, and only the side effect can surprise.
4. Announced once via the polite live region: same string as the toast.

If the offhand was already empty, only step 2 happens — no toast for a no-op.

Locked offhand trigger: reduced opacity, small lock glyph, cursor `not-allowed`,
`aria-disabled="true"`, `title`/tooltip = `lockedReason`
(`"Arma de duas mãos ocupa a off-hand"` / `"Two-handed weapon occupies the off-hand"`).
It stays **focusable** (`tabIndex=0` + `aria-disabled`, not the `disabled` attribute), so a
keyboard user tabbing through slots is told why instead of finding a hole in the tab order.

Unlock happens automatically when the mainhand changes to a one-handed item or is cleared.

---

## 5. States

### 5.1 Trigger — empty

```
Mão principal
┌──────────────┐
│ ┌──────────┐ │
│ │    +     │ │  56px ItemIcon-sized dashed well, bg-icon-slot-empty
│ └──────────┘ │
│  Escolher    │
└──────────────┘
```
Dashed 1px border, `+` glyph, label `Escolher item` / `Choose item`. The empty state is the
CTA — there is no separate "add" button.

### 5.2 Trigger — filled

```
Mão principal
┌──────────────┐
│ [ ItemIcon ] │  size="lg", quality from build state
│ Martelo…  ×  │  name truncated, clear button on hover/focus
└──────────────┘
```
Clicking the icon/name reopens the picker with the query prefilled empty and the current item
highlighted and scrolled into view. `×` clears (`onChange(null)`) and is a separate focusable
control with `aria-label="Remover Martelo Sagrado"` — never a bare `×`.

### 5.3 Popover — idle / empty query

Full slot catalogue, tier-desc. Not an empty state: `817 itens` is more useful than a
"start typing" placeholder, and it makes the picker usable by someone who knows neither name.
Placeholder in the input: `Buscar em Mão principal…` / `Search main hand…`.

Hint line, muted, below the input, shown only while the query is empty:
`Dica: digite "T8 martelo" para filtrar por tier.` — discoverability for §2.2, which is
otherwise invisible.

### 5.4 Typing / searching

Debounce window is **not** a loading state. Keep the previous result list rendered, do not
skeleton, do not blank. A 120 ms flash of skeleton on every keystroke is worse than 120 ms of
slightly stale rows. The only affordance is a subtle input-border pulse while `isPending`.

If the index itself is still being built (first mount, `AOData` fetch outstanding): 6 skeleton
rows at 44 px with `animate-pulse`, matching the icon placeholder treatment in doc-001.

### 5.5 No results

```
        (magnifier glyph, muted)
   Nenhum item encontrado para "martel t9"
   Verifique o tier — Albion vai até T8.        ← only when a tier token > 8 was parsed
   [ Limpar busca ]                              ← secondary button, focuses input
```
The recovery affordance is mandatory: a dead end with no button is a bug, not a state.
Contextual second line variants:
- tier token out of range (`t9`+) → the tier hint above;
- query matched items but all in other slots → `Nenhum item de mão principal. "Tocha" existe em off-hand.` — this is the one place the slot filter is allowed to mention another slot, and it is text, not a control;
- otherwise → `Tente o nome em inglês — a busca aceita os dois idiomas.`

### 5.6 Error

`AOData` failed to load: the trigger renders disabled with
`Dados indisponíveis` and a `[Tentar novamente]` action. The picker never opens onto a
silently empty list — an empty catalogue and a failed fetch must not look the same.

### 5.7 Selected

The equipped item, when present in the current result list, carries `aria-selected="true"`,
a left accent bar and a check glyph at the row end. Selection state (equipped) and highlight
state (keyboard cursor) are visually distinct: accent bar vs filled row background. Conflating
them is the classic combobox bug.

---

## 6. Keyboard map

Opening the trigger moves focus into the search input. Focus is **not** trapped in the
DOM-modal sense — the popover closes on outside click and on blur-out, and focus returns to
the trigger. A trap would be wrong: this is a listbox popup, not a dialog, and the user
tabbing away to the next slot is a supported flow.

| Key | Context | Action |
|---|---|---|
| `Enter` / `Space` / `↓` | trigger focused | open popover, focus input, highlight index 0 (or the equipped item) |
| `↓` | popover open | highlight next; from last → **stop** (no wrap; wrapping in an 817-row list disorients) |
| `↑` | popover open | highlight previous; from index 0 → stop, keep focus in input |
| `PageDown` / `PageUp` | popover open | move highlight ±9 (one viewport) |
| `Home` / `End` | popover open, input empty | first / last result |
| `Enter` | highlight active | select, close, **return focus to trigger** |
| `Tab` | popover open | select the highlighted item, close, and advance focus to the next slot trigger — this is the "fill twelve slots without touching the mouse" path and is the reason this feature exists |
| `Esc` | query non-empty | clear the query, keep the popover open |
| `Esc` | query empty | close, revert nothing, return focus to the trigger |
| `Backspace` | input empty | close popover (mirrors Esc for one-handed typing) |
| `Delete` / `Backspace` | trigger focused, slot filled | clear the slot, keep focus on the trigger |

Two `Esc` levels are intentional: clearing a mistyped query without losing your place is the
common case; closing is the rare one. Every highlight move scrolls the row into view with
`block: "nearest"` — never `"center"`, which makes the list jump on every arrow press.

Selecting via `Enter` always returns focus to the trigger, and the trigger is now in the
filled state — the user gets an unambiguous "this slot is done" anchor before `Tab` moves on.

---

## 7. Accessibility

ARIA 1.2 combobox with listbox popup, **`aria-activedescendant` pattern** — DOM focus stays in
the `<input>` at all times; the highlight is virtual. Roving `tabindex` is wrong here: it
would move focus out of the input and break typing.

```html
<button id="slot-mainhand-trigger" aria-haspopup="dialog" aria-expanded="false">…</button>

<!-- popover -->
<label for="ip-input" class="sr-only">Buscar item de mão principal</label>
<input id="ip-input" type="text" role="combobox" autocomplete="off"
       aria-expanded="true" aria-controls="ip-listbox"
       aria-activedescendant="ip-opt-T8_2H_HAMMER" />
<ul id="ip-listbox" role="listbox" aria-label="Itens de mão principal">
  <li id="ip-opt-T8_2H_HAMMER" role="option" aria-selected="false">…</li>
</ul>
```

- `aria-selected` marks the **equipped** item. The keyboard highlight is conveyed solely by
  `aria-activedescendant`. Do not set `aria-selected` on the highlighted row.
- Option ids are derived from `uniquename`, which is already `[A-Z0-9_@]`-safe (doc-001).
  `@` is a legal id character in HTML5; still, prefix with `ip-opt-` so it never starts with a digit.
- Result count in an `aria-live="polite"` `role="status"` region, debounced **500 ms** (longer
  than the search debounce, so a fast typist hears one announcement, not eight):
  `817 itens disponíveis` / `12 resultados` / `Nenhum item encontrado`.
- Virtualization breaks the implicit `aria-setsize`. Every rendered `<li>` must carry explicit
  `aria-setsize={results.length}` and `aria-posinset={index + 1}`, or a screen-reader user is
  told "1 of 20" for a list of 817.
- The two-handed side effect is announced in the same live region (§4 step 4). A state change
  the user did not request must be spoken.
- Icons inside rows are `decorative` — the row text is the accessible name.
- `prefers-reduced-motion`: drop the offhand fade-out and the input pulse; state changes become
  instant. Toast still appears.
- All interactive targets ≥ 32 px high; the 44 px rows and 56 px triggers clear this.

---

## 8. Tailwind v4 tokens

`src/app/globals.css` currently defines only `--color-icon-*`. Add a `--color-picker-*` family
in the same `@theme inline` block — same naming convention, so the token file stays readable
as one list.

```css
--color-picker-surface:      #14171d;  /* popover background, above icon-slot */
--color-picker-border:       #2a2e37;  /* reuses the icon-placeholder value intentionally */
--color-picker-row-hover:    #1c1f26;  /* == icon-slot; hover and slot well read as one family */
--color-picker-row-active:   #232833;  /* keyboard highlight — must be distinguishable from hover */
--color-picker-accent:       #c8a24a;  /* Albion gold; equipped/selected accent bar + tier chip */
--color-picker-match:        #f5d98a;  /* <mark> substring highlight text */
--color-picker-muted:        #6b7280;  /* == icon-muted; counts, hints, secondary locale name */
```

Notes for the implementer:
- `row-hover` and `row-active` must stay visually separable at a glance — that difference *is*
  the keyboard affordance. If they collapse under a theme change, the keyboard flow dies silently.
- No new size tokens. Row height `h-11` (44 px) and popover `max-h-[420px]` are layout, not tokens.
- No new font tokens. Tier chip is `text-xs font-medium tabular-nums`.
- Do not add a `--color-picker-*` dark variant: the app is already dark-surface for the editor.

---

## 9. What we do differently from the reference tools, and why

| Reference behaviour (albiononlinebuilds.com, albiononlinegrind.com, EZ Albion) | Ours | Why |
|---|---|---|
| Slot facet inside a global item browser | Slot is a fixed prop, stated in the header | The picker is opened from a slot; re-choosing it is a wrong-turn generator and an extra click on the most-repeated action |
| Icon grid of items | 44 px single-line rows | Names disambiguate T-tiers and enchant variants far faster than 2036 near-identical icons; rows also make keyboard navigation one-dimensional |
| Separate tier dropdown | Tier parsed from the query (`T8 hammer`) | One input, zero mode switches; the dropdown state is a thing to forget you set |
| Single-language search | EN + PT-BR always searched together | Meta discourse is EN, our users are PT-BR; cross-locale hits rank below same-locale so nothing is displaced |
| Mouse-first, no keyboard contract | Full keyboard contract incl. `Tab`-to-select-and-advance | Guild leaders fill 5 builds × 6 slots per comp; the mouse round-trip is the actual cost of the product |
| Fuzzy search | Strict token-AND substring | Stable ordering under keystrokes; fuzzy reorders rows under an already-moving highlight |

---

## 10. Acceptance mapping (ACM-008)

| AC | Where |
|---|---|
| #1 debounced, `< 50 ms` after debounce | §2.5 (120 ms trailing) + §1 (`searchItems` benched over the real dataset, slot `mainhand`) |
| #2 filters by slot | §3.1, slot-bucketed index in §2.1 |
| #3 ItemIcon + name + tier per result | §3.2 |
| #4 keyboard navigable | §6, §7 |

Manual verification steps to record on the task:
1. Open the main-hand picker, type `t8 martelo`, confirm only T8 results and that `t8` is not
   searched as text; press `↓ ↓ Enter` and confirm focus returns to the trigger in filled state.
2. With an offhand equipped, select a `2H` main hand: offhand clears, locked trigger appears,
   undo toast restores both slots.
3. Switch UI to EN, type `sanguin` — the PT-BR match appears with the secondary name shown.
