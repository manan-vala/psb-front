# TRD — PSB Dashboard (Frontend)
**Project:** Bank of Baroda Hackathon · Aegis Identity Trust System
**Repo baseline:** psb-front — Vite + React 19 + TailwindCSS v4 + Shadcn/ui (radix-nova) · JavaScript (not TypeScript)

---

## 1. Repo State (from file analysis)

### Already installed — no action needed
```
react 19.2.7
react-dom 19.2.7
vite 8.1.0
tailwindcss 4.3.1          @tailwindcss/vite plugin
tw-animate-css 1.4.0
shadcn 4.12.0              radix-nova style
radix-ui 1.6.0
class-variance-authority
clsx + tailwind-merge      cn() utility already in src/lib/utils.js
lucide-react 1.21.0
@fontsource-variable/geist  already imported in App.css
```

### CSS / theming already configured
`src/App.css` already has:
- Full oklch color token set (light + dark)
- `@theme inline` mapping all Shadcn CSS vars to Tailwind
- `@custom-variant dark` for `.dark` class switching
- Geist Variable font loaded and set as `--font-sans`
- `tw-animate-css` and `shadcn/tailwind.css` imported

**Do not touch `App.css` theme tokens.** Add only component-level styles.

### Still needs installation
```bash
npm install socket.io-client recharts axios
```

### `src/App.jsx` state
Blank Vite scaffold. Full replacement required.

---

## 2. What the Dashboard Does

The dashboard is a **read-only real-time analyst view**. It does not control the mobile app. It receives data from the backend via WebSocket and renders it. One user, one session at a time.

---

## 3. Data Contract (from backend)

The dashboard receives one WebSocket event: `risk_update`.

```js
// Emitted by backend on every /api/assess and /api/journey call
{
  riskScore: Number,        // 0–100. Higher = more suspicious
  action: String,           // 'ALLOW' | 'STEP_UP' | 'BLOCK'
  engines: {
    network: Number,        // trust scores 0–100
    device: Number,
    behavior: Number,
    journey: Number
  },
  flags: String[],          // e.g. ['PASTE_DETECTED', 'VPN_DETECTED']
  sessionPath: String[],    // e.g. ['Login', 'Home', 'Transfer']
  dwellTimes: Number[],     // ms per screen, parallel array to sessionPath
  explanation: String,      // human-readable summary
  timestamp: Number         // Date.now()
}
```

Connect via:
```js
import { io } from 'socket.io-client'
const socket = io(import.meta.env.VITE_WS_URL)
socket.on('risk_update', (data) => { /* update state */ })
```

---

## 4. File Structure

```
src/
  components/
    RiskGauge.jsx           radial score display
    EngineScores.jsx        4 engine trust bars + flag badges
    AlertFeed.jsx           scrollable event log
    JourneyTimeline.jsx     screen path breadcrumb + dwell times
    SessionStatus.jsx       ALLOW / STEP_UP / BLOCK pill
    ConnectionStatus.jsx    WebSocket connected / disconnected indicator
  hooks/
    useWebSocket.js         socket.io connection + state
  lib/
    utils.js                cn() — already exists, do not modify
  App.jsx                   root layout, composes all components
  App.css                   theme tokens — already configured
  index.css                 @import tailwindcss — already correct
  main.jsx                  entry — already correct
.env                        VITE_WS_URL=http://localhost:3000
```

---

## 5. Component Specifications

### `useWebSocket.js`
```js
// Returns: { data, connected, history }
// data       — latest risk_update payload (null before first event)
// connected  — boolean WebSocket connection state
// history    — last 50 events, newest first (for AlertFeed)
```
Reconnects automatically (socket.io default). On disconnect, `connected` flips to false — show indicator.

---

### `<RiskGauge />`
**Purpose:** The headline number. Most prominent element on the page.

**Inputs:** `riskScore` (0–100), `action` ('ALLOW'|'STEP_UP'|'BLOCK')

**Behaviour:**
- Recharts `RadialBarChart` — single arc showing riskScore
- Color: `--color-chart-1` (light gray) baseline arc; filled arc color driven by score:
  - 0–30 → green (`oklch(0.72 0.19 142)`)
  - 31–60 → amber (`oklch(0.78 0.18 70)`)
  - 61–100 → red (`oklch(0.65 0.22 27)`)
- Large numeric label centered inside arc
- Label below: "Identity Risk Score"
- `action` badge rendered below label (see `<SessionStatus />`)
- Animate on value change via `tw-animate-css` `animate-in`

---

### `<EngineScores />`
**Purpose:** Breakdown of the 4 trust engines.

**Inputs:** `engines` object, `flags` array

**Behaviour:**
- 4 rows: Network / Device / Behavioral / Journey
- Each row: engine name + Shadcn `<Progress>` bar (value = engine trust score) + score number
- Bar color mirrors risk level (green/amber/red) based on score
- Active flags rendered as small `<Badge>` chips below relevant engine row
  - Flag → engine mapping:
    - `VPN_DETECTED`, `IMPOSSIBLE_TRAVEL`, `NEW_NETWORK`, `HIGH_LATENCY` → Network
    - `NEW_DEVICE_FINGERPRINT`, `FIRST_DEVICE` → Device
    - `PASTE_DETECTED`, `ML_ANOMALY_DETECTED`, `EMULATOR_SUSPECTED`, `UNIFORM_TYPING_BOT_PATTERN` → Behavioral
    - `SPEEDRUN`, `HEADLESS_NAVIGATION`, `GOLDEN_PATH_DEVIATION` → Journey
- Badge variant: `destructive` for active flags

---

### `<AlertFeed />`
**Purpose:** Chronological log of all fired alerts this session.

**Inputs:** `history` array (from `useWebSocket`)

**Behaviour:**
- Renders last 50 events, newest at top
- Each row: timestamp (HH:MM:SS) · engine name · flags joined by comma · explanation snippet
- Color-coded left border by engine:
  - Network → blue
  - Device → purple
  - Behavioral → orange
  - Journey → teal
- Rows with `action === 'BLOCK'` get a red background tint
- Auto-scrolls to top on new event
- Empty state: "Waiting for session data..."

---

### `<JourneyTimeline />`
**Purpose:** Shows the user's current navigation path through the app.

**Inputs:** `sessionPath` string[], `dwellTimes` number[]

**Behaviour:**
- Horizontal stepper — each screen is a node
- Completed steps: filled circle with checkmark
- Current step: pulsing ring (use `tw-animate-css` `animate-pulse`)
- Dwell time shown below each completed step in muted text (e.g. "4.2s")
- Anomalous transitions highlighted red:
  - Any dwell < 1500ms on non-Login screen
  - Login → Transfer with no Home in between
- Empty state: "Session not started"

---

### `<SessionStatus />`
**Purpose:** Clear visual of current system decision.

**Inputs:** `action` string

**Behaviour:**
- Large pill badge, centered
- `ALLOW` → green background, shield-check icon (lucide)
- `STEP_UP` → amber background, alert-triangle icon
- `BLOCK` → red background, shield-x icon
- Subtle pulse animation on state change

---

### `<ConnectionStatus />`
**Purpose:** Tells analyst if live data is flowing.

**Inputs:** `connected` boolean

**Behaviour:**
- Small fixed indicator top-right corner
- Green dot + "Live" when connected
- Red dot + "Disconnected" when socket drops
- No interaction needed

---

## 6. Layout

```
┌─────────────────────────────────────────────────────┐
│  Aegis  ·  Fraud Operations Dashboard    [● Live]   │
├──────────────────┬──────────────────────────────────┤
│                  │                                   │
│   <RiskGauge>    │      <EngineScores>               │
│   (left col)     │      (right col)                  │
│                  │                                   │
├──────────────────┴──────────────────────────────────┤
│              <JourneyTimeline>                       │
├─────────────────────────────────────────────────────┤
│              <AlertFeed>                             │
│              (scrollable, fixed height)              │
└─────────────────────────────────────────────────────┘
```

Tailwind grid: `grid grid-cols-3` — gauge takes 1 col, engines take 2 cols.
Full page height: `min-h-screen`, dark background (`bg-background`).

---

## 7. State Management

No external state library needed. Single `useWebSocket` hook owns all data. Pass props down.

```js
// App.jsx
const { data, connected, history } = useWebSocket()

// data is null until first event — show skeleton loaders until then
```

Use `useState` inside `useWebSocket` for `data` and `history`. Use `useRef` for the socket instance so it isn't recreated on re-render.

---

## 8. Environment

```bash
# .env
VITE_WS_URL=http://localhost:3000
```

Vite exposes this as `import.meta.env.VITE_WS_URL`. Never hardcode the URL.

---

## 9. Packages to Install

```bash
npm install socket.io-client recharts axios
```

No other additions needed. Do not install a router — this is a single-page dashboard with no routes.
