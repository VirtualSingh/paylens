---
title: UI design — tokens, principles, components, voice, accessibility
updated: 2026-11-14
status: active
---

# UI design

Brief: an HR manager's working tool for salary data. It must feel precise, calm and
trustworthy — a ledger, not a marketing page — and be learnable in a minute. Screens and
wireframes are in [ui-screens.md](ui-screens.md). Implementation stack in [frontend.md](frontend.md).

## Design plan (decided; do not re-litigate per screen)

**Subject-driven idea.** Compensation is about *ranges*: every salary lives somewhere
between a band's minimum and maximum. The **band bar** — a thin horizontal track with a
mid tick and a marker for the person — is PayLens's signature element. It appears small in
every directory row, large on the profile, and as a full strip plot on the dashboard. Spend
the boldness there; keep everything else quiet.

**Palette** (core, 6 named values; semantic colours derive from them):

| Token | Hex | Use |
|---|---|---|
| `ink` | `#1B2A41` | Text, primary buttons, chart axes |
| `paper` | `#F6F8F7` | App background (cool off-white, not cream) |
| `surface` | `#FFFFFF` | Tables, sheets, cards (used sparingly) |
| `line` | `#D9E1DF` | Borders and dividers (1 px, only where they group) |
| `teal` | `#157A6E` | Primary action, links, focus ring, "within band" |
| `teal-soft` | `#DDEFEB` | Selected rows, highlights, band track fill |

Semantic: `below` `#B7791F` / soft `#F6E7C8` (below band — attention, not alarm);
`above` `#6B3FA0` / soft `#E9DFF5` (above band); `danger` `#B3261E`; `muted` `#5C6B7A`.
Band position is never encoded by colour alone: the marker shape differs (▲ below, ● within,
◆ above) and the label says it. Charts use a 6-step categorical palette starting from `teal`,
`ink`, `below`, `above`, `#3E7CB1`, `#8A9A5B`; sequential scales use teal lightness steps.

**Typography.** One family: **IBM Plex Sans** (variable, self-hosted). Weights 400/500/600.
Scale (px): 12 · 13 · 14 (UI body) · 16 · 20 · 24 · 30 · 38. Headings letter-spacing −0.01em,
line-height 1.2; body line-height 1.5; max 72 characters per line in prose. **All numbers
use tabular figures** (`font-variant-numeric: tabular-nums`) and are right-aligned in tables.
No all-caps labels, no monospace for data, no decorative eyebrows.

**Layout.** Left navigation (240 px, collapsible to icons) · top bar (56 px) with global
search/⌘K and the reporting-currency switch · content full-width with 24 px padding; forms
and reading surfaces max 720 px. Everything left-aligned except numbers. 8 px spacing scale.
Radii: 6 px controls, 10 px sheets/dialogs, full for chips. Shadows only on overlays.
Structure is carried by spacing and 1 px lines, not by boxing everything into cards.

**Principles.**
1. Show the working: every metric has an info affordance with its formula and its as-of date/currency.
2. Density with air: tables are dense (36 px rows, 40 px comfortable toggle) but pages breathe.
3. The URL is the state: lists are shareable; back/forward works.
4. One primary action per screen; destructive actions are confirmed and explained.
5. Motion only when it answers an action — one exception: the dashboard strip plot settles once on load (≤ 600 ms, skipped under `prefers-reduced-motion`).

Review against the brief: this avoids the cream+terracotta palette, the near-black+acid
accent, broadsheet hairlines and the identical-card SaaS kit. The teal-on-cool-paper
scheme and the band motif come from the subject (ranges, ledgers), not from a template.

## Components (`apps/web/src/components`)

| Component | Behaviour |
|---|---|
| `BandBar` | Track min→max, mid tick, marker by position with shape+colour; sizes `sm` (row, 96 px), `lg` (profile). Tooltip: min/mid/max, compa-ratio, range penetration. |
| `MoneyText` | Formats `{amountMinor, currency}` with `Intl.NumberFormat`; optional secondary line in reporting currency with "≈" and as-of tooltip. |
| `DataTable` | Headless TanStack wrapper: server-side sort/filter/page, sticky header, column chooser, density toggle, selectable rows, keyboard navigation (↑↓ rows, Enter opens), `aria-sort`. |
| `FilterBar` | Chips for active filters, popovers for multi-select, "Clear filters". |
| `PercentileStrip` | Horizontal p10–p90 range with median tick; used in breakdown rows. |
| `KpiTile` | Quiet: label, value with tabular nums, one-line context ("12,400 within band · 86%"). No gradients. |
| `PageHeader` | Title, one-line description, primary action, breadcrumbs. |
| `EmptyState` | What's empty, why, one action. |
| `Timeline` | Salary history / audit events with before→after diffs. |
| `AskPanel` | Question input, suggested questions, answer with "How this was computed" (tool list), feedback. |

Primitives come from shadcn/ui (Button, Input, Select, Sheet, Dialog, Popover, Command,
Tabs, Toast, Tooltip, Badge, Skeleton) themed with the tokens above.

## Interaction patterns

- **Loading:** skeletons shaped like the content; tables keep previous data while refetching.
- **Empty:** direct the next action ("Import employees" / "Clear filters").
- **Errors:** specific and actionable; field errors inline from problem+json `errors[]`.
- **Confirmation:** salary changes show a preview (delta %, new compa-ratio, band position,
  warnings) before "Record change"; terminations require typing the employee code.
- **Feedback:** toast repeats the verb of the action ("Salary change recorded — effective 1 Jan 2027").
- **Keyboard:** ⌘K palette (navigate, find employee), `/` focuses search, `?` shows shortcuts,
  table arrows + Enter, Esc closes sheets.
- **Currency:** the top-bar switch changes the reporting currency app-wide; local amounts
  never change, and every converted figure carries "≈" and the as-of date in its tooltip.

## Copy voice

Sentence case. Plain verbs that name the outcome: "Record change", "Import employees",
"Export CSV", "Sign in with Google", "Continue as demo HR manager". The same word for the
same thing everywhere (see [../glossary.md](../glossary.md)). Errors state what happened
and how to fix it: "Effective date must be after 15 Mar 2026, when the current salary
started." Never "Submit", "Oops", "Something went wrong".

## Accessibility (WCAG 2.2 AA, verified in tests)

Contrast ≥ 4.5:1 for text (`ink` on `paper` is 12:1; `muted` is 5.4:1); visible 2 px teal
focus ring on every interactive element; all controls labelled; tables with proper headers
and `aria-sort`; charts have a data-table alternative and text summaries; colour never the
only signal; targets ≥ 24 px; motion respects `prefers-reduced-motion`; dialogs trap focus
and return it. `vitest-axe` on every page component; Playwright axe scan on the three journeys.

## Dark mode (F-36, later)

Tokens are CSS variables; a `.dark` theme swaps `paper → #0F1720`, `surface → #16202B`,
`ink → #E6EDF3`, `line → #2A3645`, keeps hue relationships. Not built in v1.

Continues in → [ui-screens.md](ui-screens.md) (screens and wireframes)
