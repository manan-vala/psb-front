  # Implementation Guide — PSB Monitoring Dashboard (Frontend)
**Stack:** Vite + React 19 + TailwindCSS v4 + Shadcn/ui (radix-nova) · JavaScript
**Starting point:** psb-front — blank Vite scaffold, theme already configured in App.css

---

## Step 0 — Install missing packages

```bash
npm install socket.io-client recharts axios
```

Create `.env` in project root:
```
VITE_WS_URL=http://localhost:3000
```

Install the two Shadcn components you'll use:
```bash
npx shadcn@latest add progress
npx shadcn@latest add badge
```

Verify they appear in `src/components/ui/progress.jsx` and `src/components/ui/badge.jsx`.

---

## Step 1 — WebSocket hook

Create `src/hooks/useWebSocket.js`:

```js
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const MAX_HISTORY = 50

export function useWebSocket() {
  const socketRef = useRef(null)
  const [data, setData] = useState(null)
  const [connected, setConnected] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    const socket = io(import.meta.env.VITE_WS_URL, {
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('risk_update', (payload) => {
      setData(payload)
      setHistory((prev) => [payload, ...prev].slice(0, MAX_HISTORY))
    })

    return () => socket.disconnect()
  }, [])

  return { data, connected, history }
}
```

**Test:** Add `console.log(data)` in `App.jsx`. Open dashboard. Trigger any action from the mobile app or Postman. You should see the payload logged. **Do not proceed until this works.**

---

## Step 2 — App.jsx layout shell

Replace `src/App.jsx` entirely:

```jsx
import './App.css'
import { useWebSocket } from './hooks/useWebSocket'
import { RiskGauge } from './components/RiskGauge'
import { EngineScores } from './components/EngineScores'
import { AlertFeed } from './components/AlertFeed'
import { JourneyTimeline } from './components/JourneyTimeline'
import { ConnectionStatus } from './components/ConnectionStatus'

export default function App() {
  const { data, connected, history } = useWebSocket()

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Aegis</h1>
          <p className="text-sm text-muted-foreground">Fraud Operations Dashboard</p>
        </div>
        <ConnectionStatus connected={connected} />
      </div>

      {/* Top row: Gauge + Engines */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-1">
          <RiskGauge
            riskScore={data?.riskScore ?? null}
            action={data?.action ?? null}
          />
        </div>
        <div className="col-span-2">
          <EngineScores
            engines={data?.engines ?? null}
            flags={data?.flags ?? []}
          />
        </div>
      </div>

      {/* Journey */}
      <div className="mb-4">
        <JourneyTimeline
          sessionPath={data?.sessionPath ?? []}
          dwellTimes={data?.dwellTimes ?? []}
        />
      </div>

      {/* Alert feed */}
      <AlertFeed history={history} />
    </div>
  )
}
```

At this point the page renders with empty/null states. Build each component next.

---

## Step 3 — ConnectionStatus

Create `src/components/ConnectionStatus.jsx`:

```jsx
export function ConnectionStatus({ connected }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`size-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-muted-foreground">{connected ? 'Live' : 'Disconnected'}</span>
    </div>
  )
}
```

---

## Step 4 — RiskGauge

Create `src/components/RiskGauge.jsx`:

```jsx
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'
import { SessionStatus } from './SessionStatus'

function scoreColor(score) {
  if (score === null) return 'oklch(0.7 0 0)'
  if (score <= 30) return 'oklch(0.72 0.19 142)'   // green
  if (score <= 60) return 'oklch(0.78 0.18 70)'    // amber
  return 'oklch(0.65 0.22 27)'                      // red
}

export function RiskGauge({ riskScore, action }) {
  const score = riskScore ?? 0
  const data = [{ value: score }]

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center">
      <p className="text-sm text-muted-foreground mb-2">Identity Risk Score</p>

      <div className="relative">
        <RadialBarChart
          width={200}
          height={200}
          innerRadius={70}
          outerRadius={95}
          data={data}
          startAngle={225}
          endAngle={-45}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: 'oklch(0.922 0 0)' }}
            dataKey="value"
            angleAxisId={0}
            fill={scoreColor(riskScore)}
            cornerRadius={6}
          />
        </RadialBarChart>

        {/* Centered label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums">
            {riskScore !== null ? Math.round(riskScore) : '—'}
          </span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>

      <SessionStatus action={action} />
    </div>
  )
}
```

---

## Step 5 — SessionStatus

Create `src/components/SessionStatus.jsx`:

```jsx
import { ShieldCheck, ShieldX, AlertTriangle } from 'lucide-react'

const config = {
  ALLOW:   { label: 'Allow',    icon: ShieldCheck,    className: 'bg-green-500/15 text-green-600 border-green-500/30' },
  STEP_UP: { label: 'Step Up',  icon: AlertTriangle,  className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  BLOCK:   { label: 'Blocked',  icon: ShieldX,        className: 'bg-red-500/15 text-red-600 border-red-500/30' },
}

export function SessionStatus({ action }) {
  if (!action) return (
    <div className="mt-3 px-4 py-1.5 rounded-full border text-xs text-muted-foreground border-border">
      Awaiting session
    </div>
  )

  const { label, icon: Icon, className } = config[action] ?? config.ALLOW

  return (
    <div className={`mt-3 flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-medium ${className}`}>
      <Icon className="size-3" />
      {label}
    </div>
  )
}
```

---

## Step 6 — EngineScores

Create `src/components/EngineScores.jsx`:

```jsx
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

const ENGINE_FLAGS = {
  network:  ['VPN_DETECTED', 'IMPOSSIBLE_TRAVEL', 'NEW_NETWORK', 'HIGH_LATENCY'],
  device:   ['NEW_DEVICE_FINGERPRINT', 'FIRST_DEVICE'],
  behavior: ['PASTE_DETECTED', 'ML_ANOMALY_DETECTED', 'EMULATOR_SUSPECTED', 'UNIFORM_TYPING_BOT_PATTERN', 'SUPERHUMAN_TYPING_SPEED'],
  journey:  ['SPEEDRUN', 'HEADLESS_NAVIGATION', 'GOLDEN_PATH_DEVIATION'],
}

const ENGINE_LABELS = {
  network: 'Network',
  device: 'Device',
  behavior: 'Behavioral',
  journey: 'Journey',
}

function barColor(score) {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function EngineRow({ id, score, activeFlags }) {
  const relevantFlags = activeFlags.filter(f => ENGINE_FLAGS[id]?.includes(f))
  const displayScore = score ?? 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{ENGINE_LABELS[id]}</span>
        <span className="text-muted-foreground tabular-nums">
          {score !== null ? `${Math.round(displayScore)}` : '—'}
        </span>
      </div>

      <Progress
        value={displayScore}
        className="h-2"
        indicatorClassName={barColor(displayScore)}
      />

      {relevantFlags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {relevantFlags.map(flag => (
            <Badge key={flag} variant="destructive" className="text-[10px] py-0 px-1.5">
              {flag.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export function EngineScores({ engines, flags }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 h-full space-y-4">
      <p className="text-sm text-muted-foreground">Engine Trust Scores</p>
      {['network', 'device', 'behavior', 'journey'].map(id => (
        <EngineRow
          key={id}
          id={id}
          score={engines?.[id] ?? null}
          activeFlags={flags}
        />
      ))}
    </div>
  )
}
```

**Note:** Shadcn's `<Progress>` doesn't expose `indicatorClassName` by default. After `npx shadcn@latest add progress`, open `src/components/ui/progress.jsx` and add the prop:

```jsx
// In progress.jsx — add indicatorClassName prop
function Progress({ className, value, indicatorClassName, ...props }) {
  return (
    <ProgressPrimitive.Root ...>
      <ProgressPrimitive.Indicator
        className={cn("h-full bg-primary transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}
```

---

## Step 7 — JourneyTimeline

Create `src/components/JourneyTimeline.jsx`:

```jsx
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

function isAnomalous(path, dwellTimes, index) {
  // Flag: dwell < 1500ms on non-first screen
  if (index > 0 && dwellTimes[index] < 1500) return true
  // Flag: Login followed immediately by Transfer
  if (path[index] === 'Transfer' && !path.slice(0, index).includes('Home')) return true
  return false
}

export function JourneyTimeline({ sessionPath, dwellTimes }) {
  if (!sessionPath.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm text-muted-foreground">Session Journey</p>
        <p className="text-xs text-muted-foreground mt-2">Session not started</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-sm text-muted-foreground mb-4">Session Journey</p>
      <div className="flex items-start gap-0">
        {sessionPath.map((screen, i) => {
          const isLast = i === sessionPath.length - 1
          const isCurrent = isLast
          const anomalous = isAnomalous(sessionPath, dwellTimes, i)

          return (
            <div key={i} className="flex items-start flex-1">
              {/* Node + label */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  'size-7 rounded-full flex items-center justify-center text-xs font-medium border-2',
                  isCurrent && 'ring-2 ring-offset-2 ring-primary animate-pulse',
                  anomalous
                    ? 'bg-red-500/20 border-red-500 text-red-600'
                    : 'bg-primary/10 border-primary text-primary'
                )}>
                  {!isCurrent ? <Check className="size-3.5" /> : <span>{i + 1}</span>}
                </div>
                <span className={cn(
                  'text-xs mt-1 font-medium text-center',
                  anomalous ? 'text-red-500' : 'text-foreground'
                )}>
                  {screen}
                </span>
                {dwellTimes[i] !== undefined && !isCurrent && (
                  <span className="text-[10px] text-muted-foreground">
                    {(dwellTimes[i] / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className={cn(
                  'flex-1 h-0.5 mt-3.5',
                  anomalous ? 'bg-red-400' : 'bg-border'
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

## Step 8 — AlertFeed

Create `src/components/AlertFeed.jsx`:

```jsx
import { cn } from '@/lib/utils'

const ENGINE_COLORS = {
  network:  'border-blue-500',
  device:   'border-purple-500',
  behavior: 'border-orange-500',
  journey:  'border-teal-500',
}

// Determine which engine fired based on active flags
function detectEngine(flags = []) {
  const flagStr = flags.join(' ')
  if (/VPN|TRAVEL|NETWORK|LATENCY/.test(flagStr)) return 'network'
  if (/DEVICE|FIRST_DEVICE/.test(flagStr)) return 'device'
  if (/PASTE|ANOMALY|EMULATOR|TYPING|SPEED/.test(flagStr)) return 'behavior'
  if (/SPEEDRUN|HEADLESS|PATH/.test(flagStr)) return 'journey'
  return 'network'
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour12: false })
}

export function AlertFeed({ history }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-sm text-muted-foreground mb-3">Alert Feed</p>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {!history.length && (
          <p className="text-xs text-muted-foreground">Waiting for session data...</p>
        )}

        {history.map((event, i) => {
          const engine = detectEngine(event.flags)
          const isBlock = event.action === 'BLOCK'

          return (
            <div
              key={i}
              className={cn(
                'flex gap-3 p-2.5 rounded-lg border-l-4 text-xs',
                ENGINE_COLORS[engine],
                isBlock ? 'bg-red-500/8' : 'bg-muted/40'
              )}
            >
              <span className="text-muted-foreground tabular-nums shrink-0">
                {formatTime(event.timestamp)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium capitalize">{engine}</span>
                  {event.flags.map(f => (
                    <span key={f} className="text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded">
                      {f.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                {event.explanation && (
                  <p className="text-muted-foreground mt-0.5 truncate">{event.explanation}</p>
                )}
              </div>
              <span className={cn(
                'shrink-0 font-medium',
                event.action === 'ALLOW' ? 'text-green-600' :
                event.action === 'STEP_UP' ? 'text-amber-600' : 'text-red-600'
              )}>
                {event.action}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

## Step 9 — Verify everything wires up

Start the dashboard:
```bash
npm run dev
```

You should see the full layout with empty/skeleton states and "Disconnected" in the top right.

Start the backend (even with hardcoded data) and trigger a `risk_update` emit. Everything should update simultaneously. Use this Postman / curl to test without the mobile app:

```bash
# If your backend has a test endpoint, or just emit from a test script:
node -e "
const { io } = require('socket.io-client')
const s = io('http://localhost:3000')
s.on('connect', () => {
  // This won't work — dashboard is a subscriber, not emitter
  // Use the backend test route instead
})
"
```

Better: add a temporary `GET /api/test-emit` to your backend:
```js
app.get('/api/test-emit', (req, res) => {
  io.emit('risk_update', {
    riskScore: 78,
    action: 'STEP_UP',
    engines: { network: 45, device: 90, behavior: 20, journey: 70 },
    flags: ['VPN_DETECTED', 'PASTE_DETECTED'],
    sessionPath: ['Login', 'Home', 'Transfer'],
    dwellTimes: [0, 4200, 1100],
    explanation: 'VPN detected and credentials were pasted.',
    timestamp: Date.now()
  })
  res.json({ ok: true })
})
```

Hit `http://localhost:3000/api/test-emit` — dashboard should update instantly.

---

## Step 10 — Dark mode (optional, 10 min)

Your `App.css` already has `.dark` tokens defined. Add a toggle to the header:

```jsx
// In App.jsx header
import { Moon, Sun } from 'lucide-react'
import { useState, useEffect } from 'react'

const [dark, setDark] = useState(true) // default dark for drama

useEffect(() => {
  document.documentElement.classList.toggle('dark', dark)
}, [dark])

// In header JSX
<button onClick={() => setDark(d => !d)} className="text-muted-foreground hover:text-foreground">
  {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
</button>
```

---

## Build Order Summary

| Step | File | Time estimate |
|------|------|--------------|
| 0 | Install packages + `.env` | 5 min |
| 1 | `useWebSocket.js` + console test | 15 min |
| 2 | `App.jsx` layout shell | 10 min |
| 3 | `ConnectionStatus.jsx` | 5 min |
| 4 | `RiskGauge.jsx` | 20 min |
| 5 | `SessionStatus.jsx` | 10 min |
| 6 | `EngineScores.jsx` + patch Progress | 20 min |
| 7 | `JourneyTimeline.jsx` | 20 min |
| 8 | `AlertFeed.jsx` | 20 min |
| 9 | End-to-end wire test | 15 min |
| 10 | Dark mode toggle | 10 min |
| **Total** | | **~2.5 hours** |

---

## Common Issues

| Problem | Fix |
|---------|-----|
| WebSocket won't connect | Check `VITE_WS_URL` in `.env`, restart `npm run dev` after adding `.env` |
| Recharts not rendering | Wrap `RadialBarChart` in a `<div style={{ width: 200, height: 200 }}>` |
| Shadcn `<Progress>` has no color prop | Patch `progress.jsx` per Step 6 instructions |
| `indicatorClassName` not applying | Make sure Tailwind v4 is not purging dynamic class strings — use full class names, not template literals |
| Flags not matching engine rows | Check the regex in `detectEngine()` — add missing flag keywords |
| Layout breaks on small screen | Add `overflow-x-auto` to the outer grid container |
