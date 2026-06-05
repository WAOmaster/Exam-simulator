# ExamSimulator — Design System

> **Precision Academic Design System** — a distinctive, exam-centric UI.
> Extracted from source. Every value below is pulled verbatim from the codebase
> (`app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `data/default-questions/subjects.json`).
> There is no `./src` directory in this project — source lives in `app/`, `components/`, and `lib/`.

## 1. Foundations

- **Framework:** Next.js 14 (App Router), React, TypeScript.
- **Styling:** Tailwind CSS **v4**, CSS-first config — `@import "tailwindcss"` in `app/globals.css`. There is **no `tailwind.config.*`**; theme is defined with CSS custom properties.
- **Dark mode:** class-based — `@variant dark (&:where(.dark, .dark *));`. Tokens are redefined under `:root, .light` and `.dark`.
- **Motion:** Framer Motion (component-level) + CSS keyframe animations (defined in `globals.css`).
- **Two named atmospheres:**
  - Light — *"Morning Exam Hall"* — warm paper tones, focused clarity.
  - Dark — *"Evening Study Session"* — deep graphite, warm accents.

---

## 2. Color Tokens

### 2.1 Core palette

| Token | Light (`:root, .light`) | Dark (`.dark`) |
|---|---|---|
| `--background` | `#fafbfc` | `#131318` |
| `--background-elevated` | `#ffffff` | `#1a1a20` |
| `--foreground` | `#0f172a` | `#e8e6e1` |
| `--foreground-muted` | `#475569` | `#a5a3a8` |
| `--card-bg` | `#ffffff` | `#1c1c22` |
| `--card-border` | `#e2e8f0` | `#2a2a32` |
| `--card-shadow` | `0 4px 24px -4px rgba(0,0,0,0.1)` | `0 4px 32px -4px rgba(0,0,0,0.4)` |
| `--muted` | `#f1f5f9` | `#202026` |
| `--muted-foreground` | `#64748b` | `#9b9a9f` |

### 2.2 Accent palette (semantic)

Dark mode intentionally **desaturates and warms** every accent for low-light comfort.

| Token | Light | Light hover | Light tint | Dark | Dark hover | Dark tint |
|---|---|---|---|---|---|---|
| Gold (`--accent-gold`) | `#f59e0b` | `#d97706` | `#fef3c7` | `#d4b65c` | `#e8c96d` | `#2a2518` |
| Green (`--accent-green`) | `#10b981` | `#059669` | `#d1fae5` | `#5a9b7d` | `#6eb892` | `#1a2a22` |
| Red (`--accent-red`) | `#ef4444` | `#dc2626` | `#fee2e2` | `#e07555` | `#f08a6a` | `#2a1a18` |
| Blue (`--accent-blue`) | `#6366f1` | `#4f46e5` | `#e0e7ff` | `#6a8fc5` | `#7da3d8` | `#1a2230` |

**Semantic mappings (both modes):**
`--primary → --accent-blue` · `--primary-hover → --accent-blue-hover` · `--primary-light → --accent-blue-light` · `--secondary → --accent-gold` · `--accent → --accent-green`.

### 2.3 Atmospheric / glass tokens

| Token | Light | Dark |
|---|---|---|
| `--overlay-bg` | `rgba(250,251,252,0.8)` | `rgba(19,19,24,0.7)` |
| `--overlay-strong` | `rgba(255,255,255,0.95)` | `rgba(28,28,34,0.9)` |
| `--glass-bg` | `rgba(255,255,255,0.8)` | `rgba(28,28,34,0.8)` |
| `--glass-border` | `rgba(226,232,240,0.6)` | `rgba(255,255,255,0.08)` |
| `--vignette-color` | `rgba(99,102,241,0.03)` | `rgba(0,0,0,0.2)` |
| `--ambient-glow` | `rgba(245,158,11,0.1)` | `rgba(212,182,92,0.05)` |

### 2.4 Home-page token set (`--hp-*`)

A dedicated, flatter token scale used by the landing experience (`app/page.tsx`). Dark mode goes near-black (`#06070a`) with translucent white surfaces.

| Token | Light | Dark |
|---|---|---|
| `--hp-bg` | `#f8f9fc` | `#06070a` |
| `--hp-bg-secondary` | `#f0f2f8` | `#0c0d12` |
| `--hp-surface` | `rgba(255,255,255,0.8)` | `rgba(255,255,255,0.02)` |
| `--hp-surface-hover` | `rgba(255,255,255,0.95)` | `rgba(255,255,255,0.04)` |
| `--hp-surface-border` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` |
| `--hp-surface-border-hover` | `rgba(0,0,0,0.12)` | `rgba(255,255,255,0.12)` |
| `--hp-text-primary` | `#111827` | `#ffffff` |
| `--hp-text-secondary` | `#4b5563` | `rgba(255,255,255,0.6)` |
| `--hp-text-tertiary` | `#9ca3af` | `rgba(255,255,255,0.4)` |
| `--hp-text-quaternary` | `#d1d5db` | `rgba(255,255,255,0.2)` |
| `--hp-card-shadow` | `0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03)` | `none` |
| `--hp-card-shadow-hover` | `0 4px 16px rgba(0,0,0,.08), 0 8px 32px rgba(0,0,0,.04)` | `none` |
| `--hp-toggle-off` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.1)` |
| `--hp-grid-line` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.03)` |
| `--hp-logo-inner` | `#f0f2f8` | `#0c0d12` |
| `--hp-grain-opacity` | `0.02` | `0.03` |

**Ambient orbs** (radial-gradient blobs behind the hero):
`--hp-orb-indigo` `rgba(99,102,241,0.08→0.15)` · `--hp-orb-pink` `rgba(236,72,153,0.06→0.12)` · `--hp-orb-cyan` `rgba(34,211,238,0.04→0.06)` (light→dark).

### 2.5 Icon colors (`.hp-icon-*`)

Each has a light and dark variant; use these for Lucide icons rather than raw Tailwind text colors.

| Class | Light | Dark |
|---|---|---|
| `.hp-icon-indigo` | `#4f46e5` | `#818cf8` |
| `.hp-icon-emerald` | `#059669` | `#34d399` |
| `.hp-icon-amber` | `#d97706` | `#fbbf24` |
| `.hp-icon-purple` | `#7c3aed` | `#a78bfa` |
| `.hp-icon-rose` | `#e11d48` | `#fb7185` |
| `.hp-icon-orange` | `#ea580c` | `#fb923c` |
| `.hp-icon-cyan` | `#0891b2` | `#22d3ee` |
| `.hp-icon-blue` | `#2563eb` | `#60a5fa` |

---

## 3. Typography

Loaded via Google Fonts `<link>` in `app/layout.tsx` (IBM Plex Sans, Libre Baskerville, JetBrains Mono).

| Role | Family | Weight | Notes |
|---|---|---|---|
| **Body** | `'IBM Plex Sans', system-ui, -apple-system, sans-serif` | 400 | `line-height: 1.6`; antialiased. Weights available: 300/400/500/600/700 (+ 400 italic). |
| **Display / headings** (`h1,h2,h3,.font-display`) | `'Libre Baskerville', Georgia, serif` | 700 | `letter-spacing: -0.01em`; `line-height: 1.3`. Editorial, scholarly feel. Weights: 400/700 (+ italic). |
| **Mono** (`.font-mono, code, pre`) | `'JetBrains Mono', 'Consolas', monospace` | 400–700 | Timers, code, numeric data. |

**Hero wordmark pattern** (`app/page.tsx`): two-tone gradient text — neutral half `from-gray-900 … dark:from-white` + brand half `from-indigo-600 via-purple-600 to-pink-600` with `animate-gradient-shift`. Sizes scale `text-4xl → lg:text-7xl`, `font-extrabold`, `tracking-tight`.

---

## 4. Spacing, Radius & Layout

- **Container widths:** content `max-w-6xl`; config/cards `max-w-4xl`/`max-w-5xl`; centered with `mx-auto`.
- **Section padding:** `px-3 sm:px-4`, vertical `pb-8 sm:pb-12` (sections), hero `pt-12 sm:pt-20`.
- **Card padding:** `p-4 sm:p-6` (action cards), `p-4 sm:p-5` (compact), `p-4 sm:p-8` (config panel body).
- **Gaps:** grids use `gap-2.5 sm:gap-3` / `gap-2.5 sm:gap-4`.
- **Radius scale (observed):**
  - `rounded-3xl` (≈1.5rem) — config panel shell, hero logo tile.
  - `rounded-2xl` (1rem) — cards, banners, buttons-as-cards.
  - `rounded-xl` (0.75rem) — icon tiles, toggles row, inner controls; `.card-paper` = `0.75rem`.
  - `rounded-lg` (0.5rem) — small icon chips; `.btn-*` = `0.5rem`.
  - `rounded-md` (`0.375rem`) — `.question-badge`.
  - `rounded-full` — pills, toggle track/knob, progress, status dots.
- **Icon tiles:** `w-10 h-10` / `w-12 h-12`, `rounded-xl`, gradient bg `from-{accent}-500/10 to-{accent2}-500/10` (dark `/20`), 1px accent border.

---

## 5. Elevation

| Token / class | Value |
|---|---|
| `--card-shadow` (light) | `0 4px 24px -4px rgba(0,0,0,0.1)` |
| `--card-shadow` (dark) | `0 4px 32px -4px rgba(0,0,0,0.4)` |
| `.card-elevated` (light) | `0 8px 32px -8px rgba(30,30,36,.12), 0 2px 8px -2px rgba(30,30,36,.08)` |
| `.card-elevated` (dark) | `0 8px 32px -8px rgba(0,0,0,.4), 0 2px 8px -2px rgba(0,0,0,.3)` |
| `--hp-card-shadow` (light) | `0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03)` |

> Dark mode uses **borders + translucency instead of shadows** (`--hp-card-shadow: none`). Depth in dark mode comes from surface-alpha layering and ambient orbs.

---

## 6. Motion & Animation

**Easings:** entrance `cubic-bezier(0.25, 0.46, 0.45, 0.94)`; springy/overshoot `cubic-bezier(0.175, 0.885, 0.32, 1.275)`; UI transitions `cubic-bezier(0.4, 0, 0.2, 1)`.

**Framer Motion conventions (`page.tsx`):**
- Container stagger: `staggerChildren: 0.08, delayChildren: 0.1`.
- Item: `hidden {opacity:0, y:24}` → `visible {opacity:1, y:0}`, `duration: 0.5`.
- Hover lift on cards `whileHover={{ y: -6 }}`, tap `whileTap={{ scale: 0.97 }}`.
- Mode indicator uses shared `layoutId` for animated selection dot.

**CSS keyframe library (`globals.css`):**

| Class | Keyframe | Timing |
|---|---|---|
| `.animate-fade-up` | `fadeSlideUp` | `0.5s` |
| `.animate-fade-in` | `fadeSlideIn` | `0.4s` |
| `.animate-scale-in` | `scaleIn` | `0.3s` |
| `.animate-gentle-pulse` | `gentlePulse` | `2s` |
| `.animate-urgent-pulse` | `urgentPulse` | `0.8s` (timer-critical) |
| `.animate-float` / `-delayed` | `float` (±8px, slight rotate) | `6s` (delayed `+2s`) |
| `.animate-orbit` | `orbit` (translateX 120px) | `20s linear` |
| `.animate-orbit-reverse` | `orbit-reverse` (translateX 80px) | `15s linear` |
| `.animate-pulse-glow` | `pulse-glow` (scale 1→1.05) | `4s` |
| `.animate-shimmer` | `shimmer` (bg-position sweep) | `3s`, `background-size: 200% 100%` |
| `.animate-gradient-shift` | `gradient-shift` | `8s`, `background-size: 200% 200%` |
| `grain` | film-grain jitter | `8s steps(10)` |
| `.delay-1 … .delay-5` | stagger helpers | — |

---

## 7. Component Patterns

### Cards
- **`.card-paper`** — `--card-bg` + 1px `--card-border` + `--card-shadow`, radius `0.75rem`. The base academic card.
- **`.glass-card`** — frosted surface using `--glass-bg` / `--glass-border` (backdrop-blur).
- **`.action-card-shine`** — `overflow:hidden` container with a 45° light sweep on `:hover` (`translateX(-100% → 100%)`, `0.8s`). Used for all home action cards.
- **`.subject-card`** — hover `translateY(-4px)` with overshoot easing + soft white sheen `::after`.

### Buttons
- **`.btn-primary`** — gradient `135deg, --primary → --primary-hover`, white, `font-weight:600`, `0.75rem 1.5rem`, radius `0.5rem`, colored shadow; hover lifts `-1px`.
- **`.btn-success`** — gradient `--accent-green → --accent-green-hover`.
- **`.btn-gold`** — gradient `--accent-gold → --accent-gold-hover`.
- **Hero CTA pattern:** `bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600` + shimmer overlay on hover.

### Answer options (exam/practice)
| State | Class | Style |
|---|---|---|
| Default | `.option-default` | `--card-bg`, 2px `--card-border`; hover → blue border + `--accent-blue-light` |
| Selected | `.option-selected` | `--accent-blue-light` + 2px `--accent-blue` |
| Correct | `.option-correct` | `--accent-green-light` + 2px `--accent-green` |
| Incorrect | `.option-incorrect` | `--accent-red-light` + 2px `--accent-red` |

### Timer pills
`.timer-normal` (blue), `.timer-warning` (gold), `.timer-critical` (red) — each `{tint bg, accent text, 30% accent border}`. Critical pairs with `.animate-urgent-pulse`.

### Question badge
`.question-badge` — gold gradient `135deg`, white, **Libre Baskerville 700**, `0.25rem 0.75rem`, radius `0.375rem`.

### Progress
`.progress-track` (`--muted`, pill, clipped) + `.progress-fill` (gradient `90deg, --accent-blue → --accent-green`, `transition: width 0.5s`).

### Toggle switch
Track `w-12 h-7 rounded-full`; ON = solid accent (e.g. `bg-cyan-500`), OFF = `--hp-toggle-off`. Knob `w-6 h-6` white, `translate-x-5` when on, `0.3s cubic-bezier(0.4,0,0.2,1)`; glows `0 0 12px rgba(99,102,241,0.4)` when on.

### Status / diagnostic chips
Pill: `px-3 py-1.5 rounded-full border`, `--hp-surface` bg + `--hp-surface-border`, `text-xs font-medium`, leading `1.5px` colored status dot. Used for the Cognitive-Companion diagnosis chips on the home hero.

### Scrollbar & focus
- Global scrollbar `8px`, thumb = `--foreground` @20% (hover 30%); `.custom-scrollbar` variant `6px`, white @15%.
- **Focus ring:** `2px solid --accent-gold`, `outline-offset: 2px` on `:focus-visible`.
- **Selection:** gold @30%.

---

## 8. Iconography

- **Library:** `lucide-react`.
- **Color via** `.hp-icon-*` classes (§2.5), never hard-coded hex in JSX.
- **Sizing:** `w-4 h-4` (inline/labels), `w-5 h-5` (controls), `w-6 h-6` (card icon tiles), `w-12 h-12` (hero logo).
- **Subject → icon map** (`page.tsx` `iconMap`): `Atom, Code, Cog, Palette, Calculator, Cloud`.

---

## 9. Subject Accent System

Subjects (`data/default-questions/subjects.json`) each carry a Tailwind gradient; `page.tsx` maps them to glow/icon/border accents (`subjectAccents`).

| Subject | id | Icon | Gradient | Accent family |
|---|---|---|---|---|
| General Science | `science` | Atom | `from-green-600 to-emerald-600` | emerald — `hp-icon-emerald`, glow `rgba(16,185,129,…)` |
| Computer Science | `technology` | Code | `from-blue-600 to-cyan-600` | blue — `hp-icon-blue`, glow `rgba(59,130,246,…)` |
| Engineering Basics | `engineering` | Cog | `from-orange-600 to-amber-600` | orange — `hp-icon-orange`, glow `rgba(249,115,22,…)` |
| Arts & Humanities | `arts` | Palette | `from-purple-600 to-pink-600` | purple — `hp-icon-purple`, glow `rgba(168,85,247,…)` |
| Mathematics | `mathematics` | Calculator | `from-red-600 to-rose-600` | rose — `hp-icon-rose`, glow `rgba(244,63,94,…)` |
| (OCI) | `oci` | Cloud | — | indigo — `hp-icon-indigo`, glow `rgba(99,102,241,…)` |

Icon-tile background pattern: `from-{family}-500/10 to-{family2}-500/10` (dark `/20`); selected border `border-{family}-500/30`.

---

## 10. Atmospheric Backgrounds

- **`.bg-atmosphere`** — layered radial ambient-glow + vignette over `--background`.
- **`.bg-exam-hall`** — diagonal gold→bg→blue wash (`color-mix` 8%/6%).
- **`.bg-focus-zone`** — top-center ambient-glow spotlight.
- **Home (`hp-bg`)** — three mouse-parallaxed radial orbs (indigo/pink/cyan) + a `60px` grid (`--hp-grid-line`) + top fade + animated `.grain-overlay` film grain.

---

## 11. Source of Truth (file map)

| Concern | File |
|---|---|
| All tokens, utilities, keyframes, component classes | `app/globals.css` |
| Fonts, metadata, providers, `<html>` shell | `app/layout.tsx` |
| Home composition, motion conventions, subject accents | `app/page.tsx` |
| Theme provider / persistence | `lib/theme-context.tsx`, `components/ThemeWrapper.tsx` |
| Subject catalog (names, gradients, counts) | `data/default-questions/subjects.json` |
| Core data shapes (`Question`, `QuestionSet`, `GenerationConfig`) | `lib/types.ts` |

---

*Generated by extracting computed values directly from the codebase. When updating
the design, change the tokens in `app/globals.css` first — components consume them
via CSS variables and `.hp-*` / `.btn-*` / `.option-*` utility classes.*
