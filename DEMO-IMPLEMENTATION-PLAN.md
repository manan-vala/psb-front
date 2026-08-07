# Aegis Demo — Implementation Plan

Three-scenario working demo across `psb-app-web` (customer mobile app) and
`psb-dashboard` (bank analyst security portal).

- **A.** Onboarding with manual bank approval
- **B.** Preventing multi-device account access (device binding)
- **C.** In-session behavioural anomaly detection → step-up

**Status:** Phases 0–3 are implemented — all three scenarios run end to end.
Phase 4 (polish, written demo script) is outstanding. Open questions from §9
have been answered and folded into the sections below.

Two decisions changed during the build and are reflected throughout:

- **Scenario B runs both devices in one browser window.** `/device-demo` puts a
  trusted phone and an unrecognised one side by side. That only works because
  the device-verification flow uses no session cookie — a cookie is per-origin,
  so two panes would share one identity. Each pane carries its own fingerprint
  and holds a `PENDING_DEVICE` token in its own React state instead.
- **Scenario C scores on the server, not the client.** The original rationale
  for client-side scoring was `psb-back`'s Render cold start, but none of this
  touches `psb-back` — it's a route handler in the same Next app as the analyst
  API. Moving it server-side removes the "client asserts its own risk" problem
  that used to be caveat 4 in §2.4.

---

## 0. Architecture decisions (confirmed)

| Decision | Choice |
|---|---|
| Shared state | **Neon Postgres**, owned by `psb-app-web`'s Next.js route handlers |
| Dashboard data access | New `/api/analyst/*` routes on `psb-app-web`, called cross-origin |
| Live updates | **Polling** (2–3s) — not sockets |
| Scenario A truth source | Seeded `bank_accounts` core-banking reference table |
| Scenario B code delivery | In-app banner on trusted device **+** visible in dashboard |
| Scenario C location | New route in `psb-app-web`, right panel mirrors `/analyze` sidebar exactly |
| Analyst login | **Deferred.** Dashboard stays open; `reviewed_by` is recorded as a fixed demo analyst for now |
| Face enrolment ordering | **Deferred.** Keeps today's order: approve → enrol. Revisit before Phase 2 |
| Demo data | **Seeded with variety** — active accounts with devices already bound, one request already queued, one already rejected, so every screen has content on first load and Scenario B is demoable without running A first |
| Dashboard nav | Plan's four real routes are live; the wider analyst-platform items from the gap analysis stay visible but disabled with a `Soon` badge |
| Dashboard live feed | Re-laid-out to sit inside the console shell. Socket behaviour and design tokens unchanged — presentation only |

### Why this shape

`psb-back` (Express + Socket.io on Render) is **not in the mounted folders**, so it
can't be edited. It also sleeps on Render's free tier, which makes it a liability
for a live demo. This plan therefore:

- leaves `psb-back` **completely untouched** — it keeps powering the existing
  live risk feed on the dashboard's current screen, exactly as today;
- puts all three new scenarios on Neon + Next.js route handlers, which are in
  repos I can edit and which have no cold-start problem;
- scores Scenario C **client-side** so the anomaly demo never depends on a
  sleeping Render service.

```
┌────────────────────┐         ┌─────────────────────┐
│   psb-app-web      │         │   psb-dashboard     │
│   (Next.js)        │         │   (Vite SPA)        │
│                    │         │                     │
│  /api/auth/*   ────┼──┐      │  polls /api/analyst │
│  /api/devices/* ───┼──┤      │        │            │
│  /api/analyst/* ◄──┼──┼──────┼────────┘            │
│                    │  │      │                     │
└────────────────────┘  │      │  socket.io ─────────┼──► psb-back
                        ▼      └─────────────────────┘    (unchanged)
                  ┌──────────┐
                  │   Neon   │
                  └──────────┘
```

---

## 1. Database schema

> **Applied.** Migrations `005`, `006` and `007` have been run against the Neon
> project `PSB` (`cold-term-57080986`) and verified: 8 bank accounts, 4 seeded
> users, 5 devices (3 trusted), 4 onboarding requests (1 pending). The database
> held exactly one row before this — the `is_demo` account used by
> `/face-id-test` — which the `status` backfill correctly left `ACTIVE`.
>
> **Numbering.** `002_face_enrollments`, `003_account_number` and
> `004_demo_users` already exist in `psb-app-web/migrations/`, so this plan's
> new migrations are **005–007**, not 004–006 as originally drafted.
>
> ⚠️ Do **not** re-run `003_account_number.sql`. It opens with
> `DELETE FROM users`, which would wipe the seeded demo cast.
>
> `users.account_number` is already `NOT NULL UNIQUE` with a 14-digit CHECK
> (migration 003), so no additional guard against duplicate account numbers is
> needed — a second registration on the same passbook fails at the database.

### 1.1 Alter existing (migration `005`)

```sql
-- Registration is no longer instantly active; it now waits on bank approval.
--
-- DEFAULT is 'ACTIVE', not 'PENDING_APPROVAL': the column has to backfill every
-- existing row, and defaulting to PENDING would retroactively lock out the
-- accounts already in the database the moment the login gate below ships.
-- New registrations get PENDING_APPROVAL by writing it explicitly in the
-- register route, which is the only place that should ever mint one.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE';
  -- PENDING_APPROVAL | ACTIVE | REJECTED | SUSPENDED

ALTER TABLE users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('PENDING_APPROVAL','ACTIVE','REJECTED','SUSPENDED'));

CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);

-- Sessions gain a scope. Both new flows need a cookie that proves "we know who
-- you are" without granting access to the banking app:
--
--   LIMITED         — registered, waiting on approval. Can poll
--                     /api/onboarding/status and nothing else.
--   PENDING_DEVICE  — password was correct but the device isn't trusted yet.
--                     Can drive the /device-verify challenge and nothing else.
--   FULL            — ordinary authenticated session.
--
-- Without this the plan contradicts itself: §2.2 lists the device-challenge
-- routes under "session-cookie auth", but a user on an unrecognised device has
-- no session yet — that's the whole reason they're in the flow.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'FULL';

ALTER TABLE sessions
  ADD CONSTRAINT sessions_scope_check
  CHECK (scope IN ('LIMITED','PENDING_DEVICE','FULL'));
```

### 1.2 New tables (migration `006`)

```sql
-- ── Scenario A: core-banking reference ("what the passbook says") ──────────
CREATE TABLE bank_accounts (
  account_number  varchar(14) PRIMARY KEY
                  CHECK (account_number ~ '^[0-9]{14}$'),
  full_name       text        NOT NULL,
  mobile          varchar(15) NOT NULL,
  branch          text        NOT NULL,
  ifsc            varchar(11) NOT NULL,
  date_of_birth   date,
  is_active       boolean     NOT NULL DEFAULT true
);

-- ── Scenario A: the analyst's approval queue ───────────────────────────────
CREATE TABLE onboarding_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_number      varchar(14) NOT NULL,
  submitted_full_name text NOT NULL,
  submitted_mobile    varchar(15) NOT NULL,
  device_fingerprint  text,
  device_label        text,
  status              text NOT NULL DEFAULT 'PENDING',
                      -- PENDING | APPROVED | REJECTED
  match_result        jsonb,       -- per-field verification outcome
  reviewed_by         text,
  reviewed_at         timestamptz,
  rejection_reason    text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_onboarding_status ON onboarding_requests (status, created_at DESC);

-- One open request per user. Without this, hitting register twice puts two
-- PENDING rows in the analyst's queue for the same person — exactly the kind
-- of thing that shows up on a projector. Partial, so the historical APPROVED
-- and REJECTED rows are still kept for the audit trail.
CREATE UNIQUE INDEX idx_onboarding_one_open_per_user
  ON onboarding_requests (user_id) WHERE status = 'PENDING';

-- ── Scenario B: which devices an account is bound to ───────────────────────
CREATE TABLE user_devices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint_hash text NOT NULL,
  label            text NOT NULL,          -- "Chrome on Windows"
  platform         text,
  user_agent       text,
  is_trusted       boolean NOT NULL DEFAULT false,
  trusted_at       timestamptz,
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint_hash)
);

-- ── Scenario B: new-device verification challenges ─────────────────────────
CREATE TABLE device_trust_challenges (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_device_fingerprint text NOT NULL,
  new_device_label       text,
  target_device_id       uuid REFERENCES user_devices(id) ON DELETE CASCADE,
  code                   varchar(6) NOT NULL,
  status                 text NOT NULL DEFAULT 'PENDING',
                         -- PENDING | VERIFIED | EXPIRED | FAILED
  attempts               integer NOT NULL DEFAULT 0,
  expires_at             timestamptz NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_challenges_target ON device_trust_challenges (target_device_id, status);

-- NOTE: nothing ever writes status = 'EXPIRED'. Neon's HTTP driver has no
-- background jobs and there is no cron, so expiry is evaluated lazily at read
-- time (`status = 'PENDING' AND expires_at > now()`), the same way
-- src/lib/session.ts already handles expired sessions. 'EXPIRED' exists only
-- for rows a read path chooses to tombstone on the way past.

-- ── Scenario C: session risk events (feeds the dashboard) ──────────────────
CREATE TABLE session_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id         text NOT NULL,
  device_fingerprint text,
  screen             text,
  risk_score         integer NOT NULL,
  action             text NOT NULL,  -- ALLOW | STEP_UP | BLOCK
  engines            jsonb,
  flags              jsonb,
  features           jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_session_events_session ON session_events (session_id, created_at DESC);
```

### 1.3 Seed data (migration `007`)

Two layers. The first is core-banking reference data; the second is a set of
pre-existing users so that **no screen is empty on first load** and Scenario B
can be demonstrated without running Scenario A first.

**Layer 1 — `bank_accounts`, eight fake passbook records:**

| Account number | Name | Mobile | Branch | Demo role |
|---|---|---|---|---|
| `10250043100781` | Ramesh Kumar Patel | 9825012345 | Ahmedabad – Navrangpura | **Approve** — clean match, the main happy path |
| `10250043100782` | Sunita Ramesh Patel | 9825067890 | Ahmedabad – Navrangpura | Pre-registered ACTIVE + 2 bound devices → Scenario B |
| `10250043100783` | Arjun Mehta | 9825055512 | Surat – Ring Road | **Reject** — walk-up registers under the wrong name |
| `10250043100784` | Priya Nair | 9825033344 | Vadodara – Alkapuri | Pre-registered ACTIVE + 1 bound device |
| `10250043100785` | Imran Shaikh | 9825099001 | Rajkot – Kalawad Rd | Already sitting PENDING in the analyst queue |
| `10250043100786` | Kavita Deshmukh | 9825077220 | Ahmedabad – Bodakdev | Already REJECTED — shows the terminal state |
| `10250043100787` | Faisal Qureshi | 9825044118 | Bharuch – Station Rd | Spare / second walk-up |
| `10250043100788` | Neha Trivedi | 9825088934 | Gandhinagar – Sector 11 | Spare, `is_active = false` — closed account edge case |

**Layer 2 — pre-existing users, devices and requests.** Every seeded user shares
one known password (`Demo@1234`) so the presenter never has to remember which is
which; the bcrypt hash is written into the migration literally rather than
computed at runtime.

| Account | User status | Devices bound | Onboarding row | What it demonstrates |
|---|---|---|---|---|
| `...782` Sunita | `ACTIVE` | Chrome on Windows *(trusted)*, Safari on iPhone *(trusted)* | `APPROVED` | Logging in from a third device triggers the whole of Scenario B |
| `...784` Priya | `ACTIVE` | Chrome on Windows *(trusted)* | `APPROVED` | Single-trusted-device case — only one option in the picker |
| `...785` Imran | `PENDING_APPROVAL` | Edge on Windows *(untrusted)* | `PENDING` | Analyst queue has a row waiting the instant the dashboard opens |
| `...786` Kavita | `REJECTED` | Chrome on Android *(untrusted)* | `REJECTED`, reason "Name does not match branch records" | `/registration-rejected` renders against real data |

Seeded rows use fixed UUIDs so the migration is idempotent (`ON CONFLICT DO
NOTHING`) and so the demo-reset endpoint in Phase 4 can restore exactly this
state rather than an approximation.

> `...788` Neha is deliberately `is_active = false`. If a walk-up registers
> against a closed account the verification form should fail on it — a cheap
> extra failure mode to show if judges push on the happy path.

---

## 2. API surface

### 2.1 Changes to existing routes

| Route | Change |
|---|---|
| `POST /api/auth/register` | No longer creates an active session. Creates `users` row with `status='PENDING_APPROVAL'`, inserts `onboarding_requests` row, registers the device as untrusted, returns `{ ok, requestId }`. Issues a `scope='LIMITED'` session cookie so `/pending-approval` can poll. |
| `GET /api/auth/status` | **Must be rewritten.** Currently `SELECT pin_hash FROM users LIMIT 1` and `hasAccount = count(*) > 0` — a single-account assumption that breaks the moment there are two users. Change to session-scoped: return `{ isAuthenticated, status, profile, deviceTrusted, pendingRequestId }`. |
| `POST /api/auth/login` | After password check, gate on `users.status` (reject unless `ACTIVE`) and then on device trust — if the fingerprint isn't a trusted device, issue a `scope='PENDING_DEVICE'` session and return `{ requiresDeviceVerification: true }` instead of a full one. |
| `POST /api/auth/pin/verify` | Same device-trust gate. |

> The `/api/auth/status` rewrite is a prerequisite, not optional — Scenario B is
> inherently multi-account and the current implementation cannot express it.

**Session scope is enforced in one place.** `getSessionUser()` gains a required
scope argument rather than every route remembering to check: a route that wants
a real customer calls `requireSession('FULL')`, `/pending-approval`'s poller
accepts `LIMITED`, and the device-challenge routes accept `PENDING_DEVICE`. A
route that forgets to specify gets `FULL`, which fails closed.

### 2.2 New app-facing routes (session-cookie auth)

```
GET  /api/onboarding/status          → { status, requestId, rejectionReason }
POST /api/devices/register           → upserts current device, returns { known, trusted }
GET  /api/devices/trusted            → masked list of trusted devices for the account
POST /api/devices/challenge          → { targetDeviceId } → creates code, returns { challengeId, expiresAt }
POST /api/devices/challenge/verify   → { challengeId, code } → trusts device, issues session
GET  /api/devices/notifications      → polled by the TRUSTED device; returns pending code banner
POST /api/session/event              → records a Scenario C risk assessment
```

### 2.3 New analyst routes (API-key auth, CORS-enabled)

```
GET   /api/analyst/onboarding                 → queue, ?status=PENDING
GET   /api/analyst/onboarding/:id             → request + matching core record (masked)
POST  /api/analyst/onboarding/:id/verify      → analyst-typed passbook fields → per-field match result
POST  /api/analyst/onboarding/:id/decision    → { decision: 'APPROVE'|'REJECT', reason?, analyst }
GET   /api/analyst/devices                    → accounts + bound devices
POST  /api/analyst/devices/:id/revoke         → revoke device trust
GET   /api/analyst/challenges                 → live challenges incl. code + countdown
GET   /api/analyst/sessions                   → recent sessions from session_events
GET   /api/analyst/sessions/:sessionId        → full event timeline for one session
```

**Auth & CORS.** New `src/lib/analystAuth.ts` checks an `x-analyst-key` header
against `ANALYST_API_KEY`. New `src/middleware.ts` (or per-route helper) adds
`Access-Control-Allow-Origin` for the dashboard origin and handles `OPTIONS`.

### 2.4 Demo-only compromises, stated deliberately

Three things in this design are wrong for production and right for a demo. Each
is better said out loud first than found by a judge.

1. **The analyst API key ships in the client bundle.** The dashboard is a static
   SPA, so `VITE_ANALYST_API_KEY` is readable by anyone who opens devtools. Real
   deployments would put a session-authenticated BFF in front of `/api/analyst/*`.
2. **The dashboard displays live device-verification codes.** `GET
   /api/analyst/challenges` returns the 6-digit code so the presenter can read it
   off the second screen. That is a total bypass of the control Scenario B exists
   to demonstrate: an analyst could approve their own device against any account.
   In production the analyst sees that a challenge is *outstanding*, never its code.
3. **The console can autofill the passbook check.** `/api/analyst/onboarding/:id`
   returns a `demoPassbook` object holding the *unmasked* core record, and the
   review dialog has a "From passbook" button that types it. This defeats the
   masking sitting right next to it, deliberately: verifying four fields by
   hand on stage is slow, and one mistyped digit derails the demo. In
   production the field doesn't exist and the analyst reads paper. The same
   applies to `/api/demo/applicant` on the app side, which hands out real
   unclaimed core-banking records so the registration form can be filled in one
   click.
4. **~~Scenario C's risk score is computed on the client.~~** *Resolved during
   the build.* Scoring moved to `POST /api/session/assess`, a server route in
   psb-app-web. The browser reports telemetry — keystroke gaps and the amount —
   and the server decides. The dashboard now displays the bank's verdict rather
   than the client's claim about itself.

5. **The step-up's face stage checks liveness, not identity.** It runs the real
   camera and the real MediaPipe blink/turn challenge, so a held-up photo fails
   — but it doesn't compare against a stored template, because the seeded demo
   accounts have no enrolled face. The capture payload is already the right
   shape for `/api/face/verify`; enrolling a face for the demo account is all
   that stands between this and a genuine match.

---

## 3. Scenario A — Onboarding with bank approval

### Flow

```
APP                                   DASHBOARD
────────────────────────────────      ─────────────────────────────
/register  (already built)
  fullName, mobile, account no.,
  password
        │
        ▼  status = PENDING_APPROVAL
/pending-approval  ──── polls 3s ───►  /onboarding queue
  timeline: Submitted → Under         analyst opens request
  review → Approved                     │
                                        ├─ left: submitted details
                                        ├─ right: "Verify against
                                        │   passbook" form
                                        │   (analyst TYPES acct no,
                                        │    name, mobile, branch)
                                        │
                                        ├─ per-field ✓/✗ vs core record
                                        └─ Approve (enabled only on
                                            full match) / Reject+reason
        │                                       │
        ◄───────────── approved ────────────────┘
        ▼
/face-enroll → /set-pin → /home
```

### Verification logic

The analyst's typed values are checked **twice**:

1. against `bank_accounts` (does this passbook actually exist in core banking?)
2. against `onboarding_requests.submitted_*` (does the customer's claim match it?)

Both must pass for Approve to enable. The per-field result is stored in
`match_result` jsonb so the decision is auditable. This is what makes the
"four-eyes" story real rather than a rubber stamp — and account `...783`
demonstrates the reject path.

The masked core record shown to the analyst must stay masked enough that it
can't be copied off the screen into the form. If the analyst can read the
answer, the four-eyes check is theatre — the point is that they are reading a
physical passbook.

### What approval actually does

Approval is not just a status flip. In one transaction it:

1. sets `onboarding_requests.status = 'APPROVED'`, with `reviewed_by` and `reviewed_at`;
2. sets `users.status = 'ACTIVE'`;
3. **marks the device the customer registered on as trusted** —
   `user_devices.is_trusted = true, trusted_at = now()`.

Step 3 is easy to miss and Scenario B deadlocks without it. `/device-verify`
asks the user to pick an existing trusted device to approve from; if enrolment
never produces one, a freshly approved user's first login has an empty picker
and no way forward. Approving the person on the device they enrolled on is also
the honest reading of what the bank just did.

Rejection is the mirror: `onboarding_requests.status = 'REJECTED'` with
`rejection_reason`, and `users.status = 'REJECTED'`. The device stays untrusted.

### App screens to build

| Route | Purpose |
|---|---|
| `/pending-approval` | Waiting state. Hero icon, request reference, submitted-details summary, 3-step timeline, polling. Auto-advances on approval. |
| `/registration-rejected` | Terminal state with the analyst's reason and a "contact branch" CTA. |

Both use existing primitives only — `.card`, `.hero-icon`, `t-*` type classes,
`Button`, `Icon`. No new design language.

---

## 4. Scenario B — Device binding

### Flow

```
NEW DEVICE                    SERVER                   TRUSTED DEVICE
──────────────────────        ──────────────           ──────────────────
/login
 account no. + password
        │
        ├──── credentials ok? ────►  ✓
        │
        ├──── device known? ──────►  ✗ unknown
        │
        ▼
/device-verify  step 1
 "This device isn't recognised"
 list of trusted devices
 (masked: "Chrome on Windows
  · last used 2 days ago")
        │
        ├──── select target ──────►  create challenge
        │                            6-digit code, 5-min TTL
        │                                    │
        │                                    ├──────────────► banner appears
        │                                    │                "Approve new
        │                                    │                 device? Code
        │                                    │                 482913"
        │                                    │
        │                                    └──────────────► also visible in
        │                                                      dashboard
        ▼
/device-verify  step 2
 enter 6-digit code
        │
        ├──── verify ─────────────►  mark device trusted
        │                            issue full session
        ▼
/home
```

### Rules

- Code: 6 digits, **5-minute TTL**, max **5 attempts**, single use.
- Expired/failed challenges are terminal — user restarts the flow.
- Login on a **known + trusted** device skips all of this entirely.
- Analyst can revoke a device from the dashboard, which immediately forces
  re-verification on next login — a nice live thing to show.

### App screens to build

| Route / component | Purpose |
|---|---|
| `/login` (modify) | New-device branch: account number + password instead of PIN-only. |
| `/device-verify` | Two-step. Step 1 = trusted-device picker list. Step 2 = 6-digit entry, reusing `PinDots`/`PinKeypad` at `length=6`. |
| `DeviceApprovalBanner` (new) | Push-style banner on the trusted device, polling `/api/devices/notifications`. Slides in from top, shows code + "Not you? Deny". |

---

## 5. Scenario C — In-session anomaly detection

### Approach

New route `/session-monitor` in `psb-app-web`, reusing the exact `/analyze`
layout: `PhoneFrame` in `stage--docked` mode with the sidebar on the right.

Per your note, the right panel **mirrors the `/analyze` sidebar completely** —
same `CaptureSidebar` component, same `analyze.module.css`, all existing
sections (features-captured segments, live signals, keystroke dwell/flight,
motion, touch, device, location, JSON payload) unchanged — with one **new card
added at the top**: the live risk verdict.

```
┌─────────────┬──────────────────────────────┐
│             │ ● LIVE   RISK 78 / STEP_UP   │ ◄── NEW card
│   phone     │ ┌──────────────────────────┐ │
│   frame     │ │ network ▓▓▓▓▓▓▓░░  72    │ │
│             │ │ device  ▓▓▓▓▓▓▓▓▓  94    │ │
│  real user  │ │ behavior ▓▓░░░░░░░  21   │ │
│  actions    │ │ journey ▓▓▓▓▓░░░░  55    │ │
│             │ │ ⚑ ROBOTIC_TYPING         │ │
│             │ │ ⚑ PASTED_CREDENTIAL      │ │
│             │ └──────────────────────────┘ │
│             ├──────────────────────────────┤
│             │ Features captured   41/63    │ ◄── existing, unchanged
│             │ Live signals                 │
│             │ Keystroke dynamics           │
│             │ Motion / Touch / Device …    │
│             │ Live capture · JSON          │
└─────────────┴──────────────────────────────┘
```

### Scoring — client-side, deliberately

New `src/lib/riskEngine.ts`. A transparent rule-based scorer over the features
`AnalyzeCaptureContext` already captures. Rationale: `psb-back` sleeps on
Render's free tier, and a demo that hangs on a cold start in front of judges is
not worth the realism. The rules are also *explainable*, which is the whole
point of the panel.

| Signal | Flag | Weight |
|---|---|---|
| Keystroke interval variance ≈ 0 | `ROBOTIC_TYPING` | +30 |
| Paste into password/amount | `PASTED_CREDENTIAL` | +25 |
| ≥3 failed PIN attempts | `PIN_BRUTE_FORCE` | +25 |
| Motion variance flatline while "on phone" | `NO_DEVICE_MOTION` | +20 |
| Dwell time below human floor | `IMPOSSIBLE_NAVIGATION` | +15 |
| Repeated tab switches mid-transfer | `CONTEXT_SWITCHING` | +10 |
| High amount to new payee | `HIGH_VALUE_NEW_PAYEE` | +15 |
| Untrusted device | `UNTRUSTED_DEVICE` | +20 |

Thresholds: `< 40` ALLOW · `40–74` STEP_UP · `≥ 75` BLOCK.

Weights sum to 160, so the total is **clamped to 100** before thresholding.

**Flags map to engines.** The panel above draws four engine bars, but the table
is a flat additive list — something has to say which flag feeds which bar, or
the card can't be rendered. Each engine starts at 100 and its own flags subtract:

| Engine | Flags that reduce it |
|---|---|
| `network` | `IMPOSSIBLE_TRAVEL`, VPN heuristics from `useNetworkSignals` |
| `device` | `UNTRUSTED_DEVICE`, `NO_DEVICE_MOTION` |
| `behavior` | `ROBOTIC_TYPING`, `PASTED_CREDENTIAL`, `PIN_BRUTE_FORCE` |
| `journey` | `IMPOSSIBLE_NAVIGATION`, `CONTEXT_SWITCHING`, `HIGH_VALUE_NEW_PAYEE` |

This keeps the same shape the dashboard's existing `EngineScores.tsx` already
renders, so `/sessions` and `/session-monitor` display identical structures.

### Triggering the escalation

When the score crosses STEP_UP, the phone raises the existing `StepUpModal`
(face or password re-auth). At BLOCK it routes to the existing `/blocked`
screen. Both components already exist — no new phone UI needed for the payoff.

Each assessment also POSTs to `/api/session/event`, so the dashboard's session
view shows the same escalation from the bank's side.

### Presenter reliability

Anomalies fire from natural actions — paste the password, hammer the keypad,
type at machine speed. To de-risk a live demo, add a hidden presenter toggle
(e.g. `?present=1`) exposing "inject: robotic typing / paste / brute force"
buttons in the sidebar footer. Optional, but cheap insurance.

---

## 6. `psb-dashboard` UI plan

### Constraint honoured

The **design system** is fixed: the oklch token set, Geist, the shadcn
`radix-nova` style, `--radius` and the chart palette are not touched, and every
new component is stock shadcn consuming those same tokens. Nothing drifts.

The **layout** is not fixed. The app grows from one page into a routed console,
and the existing risk-feed screen is re-laid-out to sit inside that shell rather
than being dropped in verbatim — its page-level header, footer wordmark and
`LiveActivityBar` all duplicate chrome that `ConsoleLayout` now owns.

> Scope boundary for the feed rework: **presentation only.** `useWebSocket.ts`,
> the four socket event names, and the props of every widget
> (`RiskGauge`, `EngineScores`, `ThreatMap`, `RiskTrendChart`,
> `JourneyTimeline`, `AlertFeed`, `TransactionTable`) stay as they are. This is
> the one part of the demo that already works live; the rework must not be able
> to break how it gets its data.

### Shell

```
┌──────────────┬────────────────────────────────────────────┐
│ ◆ Aegis      │  Onboarding Approvals          ● LIVE  ⬤ AK│
│ Security     ├────────────────────────────────────────────┤
│ Portal       │                                            │
│              │                                            │
│ MONITORING   │              <Outlet />                    │
│  ▸ Live Feed │                                            │
│  ▸ Sessions  │                                            │
│              │                                            │
│ OPERATIONS   │                                            │
│  ▸ Onboarding│ ③                                          │
│  ▸ Device    │                                            │
│    Trust     │                                            │
│              │                                            │
│ ─────────────│                                            │
│ ⬤ A. Kumar   │                                            │
│   Fraud Ops  │                                            │
└──────────────┴────────────────────────────────────────────┘
```

- Persistent collapsible sidebar, grouped nav, **live pending-count badge**
- Top bar: route title, connection pill, analyst identity
- Add `react-router-dom`; today's `App.tsx` becomes the `/` route, with the
  chrome that `ConsoleLayout` now owns lifted out of it

**Nav contents.** The four routes below are live. The wider analyst-platform
items already sketched in the current `Sidebar.tsx` — Executive Summary,
Customer 360, Behaviour Intelligence, Cluster Distribution, Product
Intelligence, AI Copilot — stay visible but **disabled, with a `Soon` badge**.
The console reads as a full platform without any nav item that leads somewhere
broken.

### Routes

| Route | Content |
|---|---|
| `/` **Live Feed** | Today's screen, re-laid-out for the console — same socket.io feed from `psb-back`, same widgets, same data path |
| `/onboarding` | **Scenario A.** Queue table (ref, name, account, device, age, status) + detail sheet with the passbook verification form and per-field ✓/✗ |
| `/devices` | **Scenario B.** Accounts with bound devices, trust status, last seen, revoke action; live challenge panel showing code + countdown |
| `/sessions` | **Scenario C.** Session list; detail view with risk timeline, engine scores, flag history, feature breakdown |

### New shadcn primitives to add

`sidebar`, `table`, `tabs`, `dialog`/`sheet`, `input`, `label`, `select`,
`card`, `separator`, `scroll-area`, `skeleton`, `avatar`, `tooltip`, `sonner`.

All pulled via the existing `shadcn` setup so they inherit current tokens.

### New dashboard plumbing

```
src/lib/analystApi.ts          — fetch wrapper, base URL + x-analyst-key
src/hooks/usePolling.ts        — generic interval poller w/ pause-on-hidden
src/hooks/useOnboardingQueue.ts
src/hooks/useDeviceRegistry.ts
src/hooks/useSessionFeed.ts
src/layouts/ConsoleLayout.tsx  — sidebar + topbar shell
```

---

## 7. `psb-app-web` UI plan

### Constraint honoured

The Material-3-derived token set in `globals.css` (orange `--primary`,
Manrope/Work Sans, radius/stack scale, `.card` / `.field` / `.row` / `t-*`
classes) is **untouched**. Every new screen is assembled from existing
primitives — `Button`, `Input`, `Icon`, `PinKeypad`, `TopAppBar`, `.hero-icon`.
The phone frame and `stage--docked` layout are reused as-is.

### New / changed screens

| Route | Status | Notes |
|---|---|---|
| `/register` | ✅ done | 14-digit account number already shipped |
| `/pending-approval` | **new** | Polling waiting room + 3-step timeline |
| `/registration-rejected` | **new** | Terminal state + reason |
| `/login` | **modify** | New-device branch → account no. + password |
| `/device-verify` | **new** | Trusted-device picker, then 6-digit code |
| `/session-monitor` | **new** | Docked phone + mirrored capture sidebar |
| `/analyze` | unchanged | Stays as the pure capture demo |

### New components

```
src/components/ui/StatusTimeline.tsx        — 3-step vertical stepper
src/components/ui/DeviceApprovalBanner.tsx  — push-style code banner
src/components/ui/DeviceListItem.tsx        — trusted-device row
src/app/session-monitor/RiskVerdictCard.tsx — the new top card in the sidebar
src/lib/riskEngine.ts                       — client-side rule scorer
src/context/SessionMonitorContext.tsx       — extends AnalyzeCapture w/ scoring
```

`AppShell.tsx` gains one branch for `/session-monitor`, mirroring the existing
`/analyze` branch.

---

## 8. Build order

**Phase 0 — Foundation** *(nothing demoable yet, everything depends on it)*
1. Migrations `005`–`007` + seeded bank accounts, users and devices
2. Session scope in `src/lib/session.ts`, then rewrite `/api/auth/status` to be
   session-scoped (removes the single-account assumption)
3. `analystAuth.ts` + CORS + `ANALYST_API_KEY`
4. Dashboard: add `react-router-dom`, build `ConsoleLayout`, move current screen to `/`
5. Dashboard: `analystApi.ts` + `usePolling.ts`

**Phase 1 — Scenario A**
6. Register route gating + `onboarding_requests` insert
7. `/pending-approval`, `/registration-rejected`
8. Analyst onboarding endpoints
9. Dashboard `/onboarding` queue + verification sheet
10. **Demo reset endpoint** — moved up from Phase 4. Scenario A gets run dozens
    of times while building and rehearsing it, and every run leaves a
    `PENDING_APPROVAL` user plus a queue row behind. Without a reset that's
    hand-written DELETEs in the Neon console each time.
11. End-to-end: register → approve → face-enroll → home; and the reject path

**Phase 2 — Scenario B**
12. Device register/lookup endpoints + `user_devices`
13. Login device gate
14. `/device-verify` two-step
15. `DeviceApprovalBanner` + notifications polling
16. Dashboard `/devices` + live challenge panel

**Phase 3 — Scenario C**
17. `riskEngine.ts` + `SessionMonitorContext`
18. `RiskVerdictCard` + `/session-monitor` route
19. StepUp / block wiring
20. `/api/session/event` + dashboard `/sessions`

**Phase 4 — Polish**
21. Empty/loading/error states across new screens
22. Written demo script with exact click paths
23. Typecheck + build both apps

> If time compresses, cut from Phase 2, not Phase 3. Scenario C is the cheapest
> of the three to finish — it reuses `CaptureSidebar`, `analyze.module.css`,
> `StepUpModal` and `/blocked` wholesale, so the genuinely new code is one
> scorer and one card. Scenario B is the most plumbing per unit of demo, and the
> most fragile live: two browsers, two sessions, a 5-minute TTL and fingerprint
> stability all have to hold at once.

---

## 9. Risks & open items

| Risk | Mitigation |
|---|---|
| `/api/auth/status` single-account assumption | Rewritten in Phase 0 — hard prerequisite |
| Render cold start on `psb-back` | Scenario C scores client-side; A and B never touch `psb-back` |
| Analyst API key in client bundle | Accepted for demo; documented, not presented as production auth |
| Device fingerprint stability | Different browsers/profiles = different devices. Incognito may reset `localStorage` between runs — rehearse the exact browsers used |
| Polling load | 2–3s interval, paused when tab hidden |
| Demo state drift between runs | Reset endpoint, moved up to Phase 1 |
| First device has nothing to verify against | Approval marks the enrolling device trusted (§3) |
| Partial-auth states have no representation | `sessions.scope`, added in migration `005` (§1.1) |
| Existing accounts locked out by the status column | `status` defaults to `ACTIVE`; only the register route writes `PENDING_APPROVAL` (§1.1) |

### Resolved

1. **Analyst login for the dashboard — deferred.** Anyone with the URL is an
   analyst for now. `reviewed_by` is written as a fixed demo analyst so the
   audit trail is still populated and the column doesn't have to change later.
   Revisit if there's time before the demo; it's roughly an hour's work and it
   would also give the top bar a real identity.
2. **Face enrolment before activation — deferred, still open in substance.**
   The current order stands: approve → *then* enrol. Worth settling before
   Phase 2. One argument for keeping it: inverting means capturing face
   embeddings for people who are subsequently rejected, which creates a
   deletion obligation to build and to explain.
3. **Multi-user demo data — yes, seeded with variety.** Specified in §1.3:
   eight passbook records plus four pre-existing users covering active-with-two-
   devices, active-with-one-device, already-queued and already-rejected. Every
   screen has content on first load, and Scenario B no longer depends on running
   Scenario A first.
