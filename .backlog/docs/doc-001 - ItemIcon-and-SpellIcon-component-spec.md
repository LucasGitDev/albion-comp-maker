---
id: doc-001
title: ItemIcon and SpellIcon component spec
type: specification
created_date: '2026-09-07 16:09'
---


## 0. Contract source of truth

Verified against `src/app/api/icon/route.ts` (ACM-006):

- `GET /api/icon?type=item&id=<ID>&q=<1..5>` -> item PNG
- `GET /api/icon?type=spell&id=<ID>` -> spell PNG (`q` ignored)
- `id` must match `/^[A-Z0-9_@]+$/`. Lowercase, dots, hyphens or spaces -> **400 JSON**.
- `q` outside 1..5 or non-integer -> silently coerced to `1`.
- Upstream miss / network failure -> **HTTP 200 with a 1x1 transparent PNG**.

Two consequences that drive the whole design:

1. **`onError` almost never fires.** A missing icon is a successful load of a transparent
   pixel. The visible "broken" case is an invisible image, not an error event.
   -> Detect it in `onLoad` via `naturalWidth <= 1`, and treat that as the `missing` state.
   `onError` remains wired, but only realistically fires for the 400 (bad id) path and
   hard network failure.
2. **Client-side id validation is mandatory.** Never fire a request for an id that cannot
   pass `ID_PATTERN`. Validate before render; if invalid, go straight to the error state
   with zero network traffic. Do not "fix" ids by upper-casing them silently — a lowercase
   id means upstream data is wrong and should be visible, not papered over.

Both components are `"use client"` and render a plain `<img>`, **not** `next/image`.
Rationale: html2canvas-based PNG export (priority 3) needs a same-origin, already-decoded
`<img>` in the DOM. `next/image` injects srcset/lazy behaviour and a wrapper that makes
export output non-deterministic. This is a hard requirement, not a preference.

## 1. Size token scale

Free-form pixel props are banned: they leak layout decisions into call sites and make the
PNG export drift. One scale, five steps, shared by both components.

| Token | px | Tailwind | Where it is used |
|---|---|---|---|
| `xs` | 24 | `size-6` | inline chips, dense list rows, swap list |
| `sm` | 32 | `size-8` | spell slots inside a compact build card |
| `md` | 40 | `size-10` | **default** — picker grid cells, spell row in build card |
| `lg` | 56 | `size-14` | equipped item slots in the build card |
| `xl` | 80 | `size-20` | picker detail / hero preview, export card mainhand |

```ts
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";
```

Implement as a lookup record `Record<IconSize, string>` of static class strings. Do **not**
build class names by interpolation (`size-${n}`) — Tailwind v4 cannot see them and will
purge them.

The rendered `<img>` also carries explicit numeric `width`/`height` attributes from a
parallel `Record<IconSize, number>`. Reason: html2canvas and the browser both need
intrinsic dimensions to avoid a reflow flash mid-export.

## 2. `ItemIcon` API

```ts
type ItemIconProps = {
  itemId: string;
  alt: string;
  size?: IconSize;
  quality?: 1 | 2 | 3 | 4 | 5;
  decorative?: boolean;
  className?: string;
  title?: string;
};
```

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `itemId` | `string` | yes | — | `uniquename` from `AOData`, e.g. `T8_2H_HOLYSTAFF@3`. Validated against `/^[A-Z0-9_@]+$/` before any request. |
| `alt` | `string` | yes | — | Localized item name. Required even when `decorative` is true (see A11y). |
| `size` | `IconSize` | no | `"md"` | |
| `quality` | `1..5` | no | `1` | Albion quality: 1 Normal, 2 Good, 3 Outstanding, 4 Excellent, 5 Masterpiece. Typed as a union so a bad value is a compile error rather than a silent server-side coercion to 1. |
| `decorative` | `boolean` | no | `false` | True when an adjacent text label already names the item. Renders `alt=""` + `aria-hidden`. |
| `className` | `string` | no | — | Merged onto the outer wrapper only, never the `<img>`. Escape hatch for positioning; must not be used to override size. |
| `title` | `string` | no | — | Native tooltip. Only set it when there is no other affordance; a real tooltip component supersedes this later. |

`quality` is deliberately **not** defaulted from the item id. Enchantment (`@1..@4`) already
lives inside `itemId`; quality is an orthogonal axis the user picks.

## 3. `SpellIcon` API

```ts
type SpellIconProps = {
  sprite: string | null;
  alt: string;
  size?: IconSize;
  slotLabel?: "Q" | "W" | "E" | "R" | "Passive";
  decorative?: boolean;
  className?: string;
};
```

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `sprite` | `string \| null` | yes | — | Spell `uniquename`. `null` is a first-class value meaning **unset slot** — the picker renders empty slots constantly. Explicitly required (not optional) so the call site must decide. |
| `alt` | `string` | yes | — | Localized spell name; when `sprite` is null, pass the empty-slot label, e.g. `"Slot Q vazio"` / `"Empty Q slot"`. |
| `size` | `IconSize` | no | `"md"` | |
| `slotLabel` | union | no | — | Renders the Q/W/E/Passive key glyph in the bottom-right corner, matching the in-game hotbar. Purely visual; announced via `alt`, not duplicated to screen readers. |
| `decorative` | `boolean` | no | `false` | Same semantics as `ItemIcon`. |
| `className` | `string` | no | — | Wrapper only. |

`SpellIcon` takes **no** `quality` prop — the route ignores `q` for spells, and accepting it
would imply an effect that does not exist.

## 4. Visual states

State machine, both components: `idle -> loading -> (loaded | missing | error)`.
`SpellIcon` adds a terminal `empty` state reached directly when `sprite === null`.

### loading
Grey rounded square at the token size, `bg-icon-placeholder`, with a slow
`animate-pulse`. The `<img>` is already in the DOM at `opacity-0` and absolutely
positioned over the placeholder — swapping elements on load causes a layout jump inside
the export canvas. No spinner: at 24–40px a spinner is noise.

### loaded
Placeholder fades out, `<img>` transitions `opacity-0 -> opacity-100` over 150ms
`ease-out`. No scale/pop animation — dozens of these render at once in the picker grid and
staggered pops read as jank.

### missing (transparent 1x1 returned)
Detected via `onLoad` + `naturalWidth <= 1`. Keep the grey square (pulse stopped), overlay a
centred `?` glyph at 60% of the icon size in `text-icon-muted`. The `alt` text stays intact,
so a screen reader still gets the item name. Do **not** show a red/destructive treatment:
a missing sprite is a data gap, not a user error, and the comp is still valid.

### error (invalid id or network failure)
Same grey square, but the glyph is `!` and the wrapper carries
`ring-1 ring-inset ring-icon-error`. `title` is set to the offending id so a maintainer can
diagnose from the DOM. In `NODE_ENV !== "production"`, `console.warn` once per unique id.

### empty (SpellIcon only)
Dashed-outline square: `border border-dashed border-icon-slot-empty`, transparent fill, no
image element mounted at all. When the parent made it interactive it gets a `+` glyph on
hover. This must read as *"a choice you have not made yet"*, distinct from the solid grey
of `missing`, which reads as *"something went wrong"*. Two grey squares meaning different
things is the failure mode to avoid here.

## 5. Albion visual conventions

Researched against the Albion Online wiki (Enchanting) and the in-game item frame.

**The Render API sprite already contains the frame.** Item PNGs are delivered with the tier
background shade, the enchantment outline (green `.1`, blue `.2`, purple `.3`, gold `.4`)
and the enchantment diamonds baked into the artwork. The `quality` parameter changes the
frame's quality marker upstream.

Therefore: **do not draw tier, enchantment or rarity borders in CSS.** Any ring we add would
sit outside Albion's own frame and produce a double border that looks wrong to a player who
knows the game — and worse, would drift from the artwork the moment Albion restyles a tier.
This is the single most important rule in this spec.

What we own is the **slot**, not the item:

- Item slot container: dark neutral fill `bg-icon-slot`, `rounded-md`, no border in the
  resting state. The artwork's own frame provides the edge.
- Spell sprites arrive as bare art on transparency with no frame. They therefore **do** get a
  container: `bg-icon-slot` + `rounded-md`. In-game spell buttons are rounded squares, not
  circles — do not use `rounded-full`.
- Interactive affordance (selected / hover) is a `ring-2 ring-offset-1` in the accent colour
  on the wrapper. Rings are unambiguously "app chrome", so they do not compete with the
  in-game frame the way a plain border would.
- `slotLabel` glyph: 10px, `font-mono`, `tabular-nums`, bottom-right, on a
  `bg-black/70 rounded-sm` pill with 2px padding — mirrors the hotbar keybind badge.

Item art is not colour-managed and rendering it on a light background washes out low-tier
items. Slots stay dark in both colour schemes.

## 6. Tailwind v4 tokens

New tokens go in `@theme inline` in `src/app/globals.css`. Only what the current theme
(`--color-background`, `--color-foreground`, fonts) does not already cover:

```css
--color-icon-slot: #1c1f26;         /* slot fill, both schemes */
--color-icon-placeholder: #2a2e37;  /* loading square */
--color-icon-muted: #6b7280;        /* ? glyph, slot label text */
--color-icon-slot-empty: #3f4552;   /* dashed empty-slot outline */
--color-icon-error: #7f1d1d;        /* error ring, muted on purpose */
```

Reused from stock Tailwind, no new token needed: `rounded-md` (6px) for all sizes —
resist scaling radius with icon size, the sprites' own frames have a fixed corner radius and
a growing CSS radius clips them visibly at `lg`/`xl`. `transition-opacity duration-150
ease-out`. `animate-pulse` for loading.

## 7. Accessibility

- `alt` is **required at the type level** on both components, including when `decorative`
  is true. Making it optional guarantees someone ships `<ItemIcon itemId={id} />` with no
  label. The `decorative` flag then emits `alt=""` + `aria-hidden="true"` — an explicit
  opt-out beats a silent omission.
- Alt text pattern, meaningful: the localized name alone — `"Cajado Sagrado"`. Never
  `"icon of..."` or `"image of..."`; the role is already conveyed. Include quality only when
  it is not otherwise on screen: `"Cajado Sagrado (Excepcional)"`.
- Alt text pattern, empty spell slot: state + slot — `"Slot Q vazio"` / `"Empty Q slot"`.
- Use `decorative` in the build card, where each icon sits next to its own text label —
  otherwise every card is read twice.
- The components are **not interactive by themselves**. They render no `button`, `onClick`
  or `tabIndex`. Interactivity belongs to the parent (picker cell, slot button), which owns
  the semantics. This keeps them usable inside both a button and a static export card.
- When a parent makes an icon interactive it must use a real `<button>` and rely on
  `focus-visible:ring-2 focus-visible:ring-offset-2`. The wrapper exposes
  `group-focus-visible:` targets so the parent needs no extra markup. Never
  `outline-none` without a replacement ring.
- The `slotLabel` glyph is `aria-hidden` — it duplicates information already in `alt`.
- Loading state carries no `aria-busy` and no live region. Dozens of icons resolving at
  once would flood the announcement queue; the surrounding list handles loading semantics.

## 8. Out of scope

Tooltips (beyond native `title`), drag-and-drop, the picker grid itself, and export-time
`crossOrigin` handling. `/api/icon` is same-origin, so html2canvas needs no CORS work — but
that must be re-verified in the export task, not assumed here.
