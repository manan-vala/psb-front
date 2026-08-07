/**
 * Client for the analyst API, which lives in the *other* app — the Next.js
 * route handlers under `psb-app-web/src/app/api/analyst/*`, backed by Neon.
 *
 * This is a separate transport from the live risk feed. `useWebSocket` holds a
 * socket.io connection to `psb-back` for real-time risk events; everything
 * here is cross-origin `fetch` against psb-app-web and is polled. The two
 * never touch, on purpose — `psb-back` isn't editable and sleeps on Render's
 * free tier, so nothing new was built on it.
 *
 * ⚠️ This is a static SPA, so `VITE_ANALYST_API_KEY` ships in the client
 * bundle and is readable by anyone who opens devtools. Accepted for the demo
 * and documented in DEMO-IMPLEMENTATION-PLAN.md §2.4 — not a production auth
 * model.
 */

const BASE_URL = (import.meta.env.VITE_ANALYST_API_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
)
const API_KEY = import.meta.env.VITE_ANALYST_API_KEY ?? ""

export class AnalystApiError extends Error {
  // Declared as a plain field rather than a constructor parameter property:
  // this project builds with `erasableSyntaxOnly`, which rejects the shorthand
  // because it emits runtime code rather than being purely type-level.
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "AnalystApiError"
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}/api/analyst${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-analyst-key": API_KEY,
        ...init?.headers,
      },
    })
  } catch {
    // A network-level failure is not the same as a rejected request, and the
    // console should say so rather than showing an empty queue as if the bank
    // simply had no work waiting.
    throw new AnalystApiError(
      "Could not reach the bank API. Is psb-app-web running?",
      0
    )
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new AnalystApiError(
      body.error ?? `Request failed (${res.status})`,
      res.status
    )
  }
  return body as T
}

/* ── types ─────────────────────────────────────────────────────────────── */

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface OnboardingSummary {
  id: string
  accountNumber: string
  submittedFullName: string
  submittedMobile: string
  deviceLabel: string | null
  status: RequestStatus
  userStatus: string
  reviewedBy: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  createdAt: string
}

export interface OnboardingQueue {
  pendingCount: number
  requests: OnboardingSummary[]
}

/** The masked core-banking record. Never contains readable values. */
export interface MaskedCoreRecord {
  accountNumber: string
  fullName: string
  mobile: string
  branch: string
  ifsc: string
  isActive: boolean
}

export type FieldName = "accountNumber" | "fullName" | "mobile" | "branch"

export interface MatchResult {
  coreRecordExists: boolean
  accountActive: boolean
  fields: Record<FieldName, boolean>
  allMatch: boolean
  checkedAt: string
}

/**
 * Unmasked passbook values, for the demo "Fill from passbook" shortcut.
 *
 * ⚠️ This is the answer key. It exists so the console can type what a physical
 * passbook would say, because doing it by hand on stage is slow and one
 * mistyped digit derails the demo. In production it doesn't exist — the
 * analyst reads paper. See DEMO-IMPLEMENTATION-PLAN.md §2.4.
 */
export interface DemoPassbook {
  accountNumber: string
  fullName: string
  mobile: string
  branch: string
}

export interface OnboardingDetail {
  request: OnboardingSummary & {
    deviceFingerprint: string | null
    matchResult: MatchResult | null
  }
  coreRecord: MaskedCoreRecord | null
  demoPassbook: DemoPassbook | null
}

/* ── endpoints ─────────────────────────────────────────────────────────── */

export function fetchOnboardingQueue(status?: RequestStatus): Promise<OnboardingQueue> {
  return request(`/onboarding${status ? `?status=${status}` : ""}`)
}

export function fetchOnboardingDetail(id: string): Promise<OnboardingDetail> {
  return request(`/onboarding/${id}`)
}

/** Scores the analyst's typed passbook values. Server-side — see the plan §3. */
export function verifyOnboarding(
  id: string,
  typed: { accountNumber: string; fullName: string; mobile: string; branch: string }
): Promise<MatchResult> {
  return request(`/onboarding/${id}/verify`, {
    method: "POST",
    body: JSON.stringify(typed),
  })
}

export function decideOnboarding(
  id: string,
  decision: "APPROVE" | "REJECT",
  reason?: string
): Promise<{ ok: boolean; decision: string; reviewedBy: string }> {
  return request(`/onboarding/${id}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision, reason }),
  })
}

/** Restores the seeded demo state. Destructive — see the plan §8, step 10. */
export function resetDemo(): Promise<{ ok: boolean; deletedUsers: number }> {
  return request("/demo/reset", { method: "POST" })
}

/* ── Scenario B: device trust ──────────────────────────────────────────── */

export interface BoundDevice {
  id: string
  label: string
  platform: string | null
  isTrusted: boolean
  trustedAt: string | null
  lastSeenAt: string
  fingerprint: string
}

export interface DeviceAccount {
  userId: string
  fullName: string
  accountNumber: string
  mobile: string
  devices: BoundDevice[]
}

export interface TrustChallenge {
  id: string
  /** Present only while the challenge is genuinely live. */
  code: string | null
  status: "PENDING" | "VERIFIED" | "EXPIRED" | "FAILED"
  isLive: boolean
  attempts: number
  fullName: string
  accountNumber: string
  newDeviceLabel: string | null
  targetLabel: string | null
  expiresAt: string
  createdAt: string
}

export function fetchDeviceAccounts(): Promise<{ accounts: DeviceAccount[] }> {
  return request("/devices")
}

export function fetchChallenges(): Promise<{ challenges: TrustChallenge[] }> {
  return request("/challenges")
}

export function revokeDevice(id: string): Promise<{ ok: boolean }> {
  return request(`/devices/${id}/revoke`, { method: "POST" })
}

/* ── Scenario C: session risk ──────────────────────────────────────────── */

export interface SessionEngines {
  network: number
  device: number
  behavior: number
  journey: number
}

export interface SessionEvent {
  id: string
  sessionId: string
  screen: string | null
  riskScore: number
  action: "ALLOW" | "STEP_UP" | "BLOCK"
  engines: SessionEngines | null
  flags: string[]
  features: Record<string, unknown> | null
  fullName: string | null
  accountNumber: string | null
  createdAt: string
}

export interface SessionSummary {
  sessionId: string
  fullName: string | null
  accountNumber: string | null
  eventCount: number
  maxRiskScore: number
  worstAction: "ALLOW" | "STEP_UP" | "BLOCK"
  flags: string[]
  startedAt: string
  lastSeenAt: string
}

export function fetchSessions(): Promise<{
  sessions: SessionSummary[]
  alertCount: number
}> {
  return request("/sessions")
}

export function fetchSessionDetail(
  sessionId: string
): Promise<{ events: SessionEvent[] }> {
  return request(`/sessions/${encodeURIComponent(sessionId)}`)
}
