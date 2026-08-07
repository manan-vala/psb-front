# psb-dashboard — Codebase Analysis & Gap Report vs. Sentinel Analyst Platform

*Analysis only — no code changed.*

## 1. What this app is today

Internally it's called **"Aegis — Identity Trust System"** (per `context/TRD-FRONTEND.md`, built for a Bank of Baroda hackathon). It is a **single-page, real-time fraud-monitoring dashboard** — there is no router, no multiple pages, and no historical/analytical views. Everything lives in one `App.tsx` that renders a stack of widgets fed by one WebSocket connection.

### Stack
| Layer | Choice |
|---|---|
| Framework | React 19 + Vite 8, TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (`radix-nova` style, Radix primitives) |
| Charts | Recharts 3 |
| Realtime | `socket.io-client` — one hook, one event (`risk_update`) |
| HTTP | `axios` is installed but **not used anywhere** in `src/` |
| Routing | **None** — no `react-router` dependency, single URL |
| Fonts/theme | Geist Variable font; full oklch color-token system already wired in `App.css` (light + dark, unused dark mode toggle) |

### Data flow
`src/hooks/useWebSocket.ts` opens one socket to `VITE_WS_URL` (`.env` currently points at `https://psb-back.onrender.com`) and listens for four events: `risk_update`, `high_value_payment`, `transaction_completed`, `security_signal`. All UI state (stats, transactions, alert history, risk trend) is derived client-side from these events — there are no REST calls to fetch historical data, so on page load/refresh everything starts empty until new events arrive.

### Current screen (single page, top to bottom)
1. `LiveActivityBar` — thin animated "live" progress bar pinned to the top when connected.
2. Header — "Aegis" wordmark + "Fraud Intelligence & Monitoring" subtitle.
3. `SecuritySignalBanner` / `HighValueAlert` — dismiss-free banners stacked above the fold for critical events.
4. `StatsBanner` — 4 KPI cards: Transactions Analyzed, Flagged, Blocked, Avg Risk.
5. Three-column row: `RiskGauge` (radial gauge, 0–100 + ALLOW/STEP_UP/BLOCK pill) · `EngineScores` (4 progress bars: Network/Device/Behavioral/Journey + flag badges) · `ThreatMap` (static India SVG map with scripted ping animation, only triggers on `IMPOSSIBLE_TRAVEL` + `BLOCK`).
6. `RiskTrendChart` — area chart of last 20 risk scores.
7. `JourneyTimeline` — horizontal stepper of the current session's screen path with dwell times and anomaly highlighting.
8. Two-column row: `AlertFeed` (scrollable log of non-ALLOW events) · `TransactionTable` (live transaction list).
9. Footer wordmark.

That's the entire app. No customer list, no customer-detail/360 view, no fraud-ops queue with filters, no behavioural-analytics module, no clustering, no product/UX analytics, no AI copilot, no persona/role switching, no historical date-range reporting — it's a live "single session spotlight," not a fleet-wide analyst platform.

### Design system note
`context/DESIGN.md` (checked into this same repo) specifies a **different, more developed brand** than what's implemented: "Modern Financial Pulse" — Vibrant Orange `#EE5115` primary / Deep Navy `#1D355E` secondary, warm cream surfaces, Manrope for headings + Work Sans for body, 8px grid, soft navy-tinted shadows. The dashboard as built instead uses the generic shadcn default palette (neutral gray + a desaturated blue primary, Geist font, oklch tokens) — it never picked up the PSB brand. That's a second gap: even before adding new pages, the current UI doesn't match the project's own design spec.

## 2. Gap analysis vs. the Sentinel Analyst Platform

Reference: the 7-route analyst platform documented earlier (Executive · Customer 360 · Fraud Operations · Behaviour Intelligence · Cluster Distribution · Product Intelligence · AI Copilot).

| Sentinel route | Sentinel does | psb-dashboard today | Gap |
|---|---|---|---|
| **Executive** (`/`) | KPI cards, 30-day risk trend, risk distribution histogram, channel breakdown table, high-risk sessions table, alert feed | Roughly equivalent, but single-session-scoped: KPI cards ✓, risk trend ✓ (last 20 points only, not 30-day), no risk-distribution histogram, no channel breakdown, alert feed ✓ (session-scoped, not persisted) | Partial — needs historical/aggregate data source, not just live socket events |
| **Customer 360** | Pick a customer, see their profile/baseline/history | **Missing entirely.** No customer list, no customer identity concept at all in the data model | Full gap — needs new page + customer API |
| **Fraud Operations** | Analyst work queue with filters (risk/channel/status), sort, amount-at-risk, escalation counts | **Missing entirely.** `AlertFeed`/`TransactionTable` are read-only live logs with no filtering, sorting, review/escalate actions, or persistence | Full gap — needs new page + queue/case-management API |
| **Behaviour Intelligence** | Feature-importance correlation, population analytics, per-user behavioural profile, feature explainability | **Missing entirely.** `EngineScores` shows 4 coarse engine scores, not the 63-feature behavioural breakdown Sentinel's capture layer produces | Full gap — needs new page; also needs the richer telemetry schema (current `RiskEngines` type only has 4 numbers) |
| **Cluster Distribution** | 2D/3D population archetype clustering | **Missing entirely** | Full gap — needs new page + clustering data/API |
| **Product Intelligence** | Funnel analysis, screen friction, UX/adoption analytics | **Missing entirely.** `JourneyTimeline` is the closest analog (per-session path + dwell time) but it's session-scoped, not aggregated across users | Partial concept exists, needs aggregation + new page |
| **AI Copilot** | Natural-language analyst assistant (Sentinel itself marks this "In development") | **Missing entirely** | Full gap (lowest priority — even Sentinel hasn't built it) |

### Structural gaps (not page-specific)
- **No routing.** Sentinel's dashboard is a proper multi-route SPA (react-router) with a persistent sidebar and grouped nav (Overview / Operations / Strategy) plus a role/persona switcher. psb-dashboard has zero routing infrastructure — this is the first thing a revamp needs.
- **No historical data layer.** Everything is live-only via WebSocket; there's no REST/query layer for "give me the last 30 days" or "give me this customer's session history." `axios` is already a dependency but unused — the backend contract for aggregate/historical endpoints doesn't seem to exist yet from the frontend's perspective.
- **No customer/session identity model.** The `Transaction`/`RiskUpdate` types have no customer ID, so there's nothing to key a Customer 360 view off of.
- **No persona/role concept.** Sentinel's sidebar lets an analyst switch context (Fraud Analyst, Risk Team, Executive, etc.); psb-dashboard has one undifferentiated view for everyone.
- **Design-system drift.** The dashboard doesn't use the brand tokens already specified in `context/DESIGN.md` — a revamp is also a chance to reconcile this.

## 3. What's reusable as-is

These are solid, on-pattern shadcn/Tailwind/Recharts components that a revamp can keep or lightly adapt rather than rebuild:
- `RiskGauge`, `EngineScores`, `RiskTrendChart`, `JourneyTimeline`, `AlertFeed`, `TransactionTable`, `StatsBanner` — all good building blocks for an "Executive" and "Fraud Operations" page.
- The oklch design-token system in `App.css` (`--primary`, `--chart-1..5`, `--radius`, dark-mode variants) — solid technical foundation, just needs its values swapped to the orange/navy brand from `DESIGN.md`.
- `cn()` utility, `Button`/`Badge`/`Progress` shadcn primitives — reusable across new pages.
- `useWebSocket` — good pattern for the live-data slice; would sit alongside new REST hooks rather than being replaced.

## 4. What a revamp needs to add (for scoping, not started)

1. A router (`react-router`) + persistent sidebar shell with route groups, mirroring Sentinel's Overview / Operations / Strategy structure.
2. New pages: Customer 360, Fraud Operations (queue with filters/sort/actions), Behaviour Intelligence, Cluster Distribution, Product Intelligence — each needs its own data source (REST endpoints for historical/aggregate data; `axios` is already installed for this).
3. An expanded data model — customer identity, session history, richer behavioural feature set — to support the above.
4. Brand alignment — apply the `DESIGN.md` orange/navy/cream palette and Manrope/Work Sans typography to the existing oklch token system.
5. Optional: role/persona switcher if multi-role analyst views are wanted.

---
No files were modified as part of this analysis.
