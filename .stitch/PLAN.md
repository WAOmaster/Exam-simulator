# Exam Simulator — UX Redesign Plan (Google-grade)

Stitch project: `13727797737207220940` · Design system: `assets/f1a56910a9d24d9cad7470461b36efb5` ("Precision Academic")

## Canonical App Shell (single source of truth)

All dashboard-style screens (Home, Analytics, Exams/Results, Library, Generate,
Settings) MUST share ONE shell component. In code this becomes
`<AppShell>` (left rail + top bar) wrapping page content.

### Left Nav Rail — 256px, white, 1px right border (#e2e8f0)
- **Logo lockup:** 32px indigo (#6366f1) rounded-square mark with a serif "E";
  wordmark "Exam Simulator" — "Exam" slate-900 Libre Baskerville 16,
  "Simulator" slate-400. NO sublabels ("Precision Learning" / "Premium Prep" — remove).
- **Primary nav** (40px rows, 20px / 1.5px-stroke line icons):
  Home · Practice · Exams · Library · Analytics
  - Active = indigo-50 pill + 2px left indigo bar + indigo icon + indigo-700 label.
- **Divider**, then `MANAGE` (11px uppercase, 0.06em, slate-400) + Generate · Settings.
- **Bottom plan card:** "Free plan" + mono `12/50 generations` usage bar
  (indigo fill on slate-100) + ghost **Upgrade** link (indigo). Label is exactly "Upgrade".

### Top App Bar — 64px, sticky, hairline bottom border
- Left: breadcrumb (page-specific).
- Center-right: search field ~360px (magnifier, placeholder
  "Search subjects, exams, topics…", 2px indigo focus ring).
- Right: "?" help icon · bell icon w/ tiny indigo dot · 32px avatar.

### Active state + breadcrumb per page
| Page | Active nav | Breadcrumb |
|---|---|---|
| Home / Overview | Home | Home |
| Analytics | Analytics | Analytics |
| Results — Scorecard | Exams | Exams › Results |
| Results — Breakdown | Exams | Exams › Results › Breakdown |
| Library | Library | Library |
| Generate | Generate | Generate |

> Exam Session and Practice are **focus mode** — no left rail by design
> (slim contextual top bar only).

## Design tokens (enforced)
- 8pt grid; card padding 24px; section rhythm 32px; content max 1200px / 32px gutters.
- ~90% neutral (white cards, #fafbfc bg, slate text). Indigo #6366f1 = primary action /
  active / single chart line. Green/gold/red = **data meaning only**.
- Hairline 1px borders (#e2e8f0) + ONE soft shadow. 12px card radius, 8px controls.
- Type: title 30px Libre Baskerville 700; section labels 13px IBM Plex Sans 600 uppercase;
  body 14px; ALL numbers JetBrains Mono. Icons 20px 1.5px slate.
- No gradients (except none), no glass, no grain, no heavy shadows.

## Dynamic / logged-in features introduced in the designs
These are NOT static mocks — when building real code, architect data + APIs for them:

1. **Continue learning** — resume last in-progress question set (needs per-user
   session/progress persistence: last set, index, % complete, est. time left).
2. **Daily goal + streak** — goal target vs completed today; streak counter
   (needs daily activity log).
3. **KPIs** — mastery %, accuracy %, study time, streak (derived aggregates over attempts).
4. **Performance over time** — time-series of scores (7/30/90D windows).
5. **Focus areas** — weakest topics ranked by mastery (per-topic accuracy rollup).
6. **Recommended for you** — suggested sets by subject/difficulty (recommendation rule:
   weak topics + unattempted sets).
7. **Recent activity** — recent attempts with score + relative time.
8. **Review with AI** — per-question deep-dive (existing /api/ai/explain + /api/ai/learn).

### Likely data model additions (code phase)
- `Attempt` (userId, questionSetId, score, perQuestion[], startedAt, completedAt, durationMs)
- `TopicMastery` (userId, topic, accuracy, attempts) — derived/materialized
- `UserGoal` (userId, dailyTarget, completedToday, streak, lastActiveDate)
- Aggregation endpoints for dashboard + analytics (avoid client recompute).

## Sequence
1. ✅ Six screens at Google-grade (Home, Analytics, Scorecard, Breakdown, Exam, Practice)
2. ⏳ Unify nav/shell across the 4 rail-bearing screens (canonical rail)
3. ⏳ New screens: Library, Generate, Exam Setup, AI Review modal
4. ⏳ Dark-mode ("Evening Study Session") variants
5. ⏳ Translate to real Next.js + Tailwind components (with the dynamic features above)
