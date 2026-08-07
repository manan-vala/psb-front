import { useCallback, useState } from "react"
import { Laptop, ShieldCheck, ShieldOff, Smartphone, Timer } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { usePolling } from "@/hooks/usePolling"
import {
  fetchChallenges,
  fetchDeviceAccounts,
  revokeDevice,
  type BoundDevice,
  type TrustChallenge,
} from "@/lib/analystApi"
import { cn } from "@/lib/utils"

function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

/** mm:ss until expiry, floored at zero. */
function remaining(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return "0:00"
  const total = Math.floor(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

/**
 * Scenario B — bound devices and live verification challenges.
 *
 * Two pollers on different intervals: challenges tick every second because
 * they carry a five-minute countdown that has to look alive, while the device
 * registry only changes when someone binds or revokes one.
 */
export function DevicesPage() {
  const [revoking, setRevoking] = useState<string | null>(null)

  const accountsPoll = usePolling(fetchDeviceAccounts, 4000)
  const challengePoll = usePolling(fetchChallenges, 1000)

  const handleRevoke = useCallback(
    async (id: string) => {
      setRevoking(id)
      try {
        await revokeDevice(id)
        await accountsPoll.refresh()
      } catch {
        /* the poller surfaces the error state on its next tick */
      } finally {
        setRevoking(null)
      }
    },
    [accountsPoll]
  )

  const accounts = accountsPoll.data?.accounts ?? []
  const challenges = challengePoll.data?.challenges ?? []
  const live = challenges.filter((c) => c.isLive)

  return (
    <div className="flex flex-col gap-6">
      <ChallengePanel live={live} recent={challenges.filter((c) => !c.isLive).slice(0, 5)} />

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Bound devices
        </h2>

        {accountsPoll.loading && accounts.length === 0 && (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        )}

        {accountsPoll.error && (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
            {accountsPoll.error}
          </div>
        )}

        {accounts.map((account) => (
          <div key={account.userId} className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{account.fullName}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {account.accountNumber}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {account.devices.filter((d) => d.isTrusted).length} trusted ·{" "}
                {account.devices.length} known
              </p>
            </div>

            {account.devices.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                No devices bound to this account.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {account.devices.map((device) => (
                  <DeviceRow
                    key={device.id}
                    device={device}
                    busy={revoking === device.id}
                    onRevoke={() => handleRevoke(device.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}

function DeviceRow({
  device,
  busy,
  onRevoke,
}: {
  device: BoundDevice
  busy: boolean
  onRevoke: () => void
}) {
  const Icon = device.platform === "iOS" || device.platform === "Android" ? Smartphone : Laptop

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
          device.isTrusted
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{device.label}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {device.fingerprint}… · last seen {relativeTime(device.lastSeenAt)}
        </p>
      </div>

      {device.isTrusted ? (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/25 bg-emerald-500/10 font-semibold text-emerald-600"
        >
          <ShieldCheck className="h-3 w-3" />
          Trusted
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 font-semibold text-muted-foreground">
          <ShieldOff className="h-3 w-3" />
          Untrusted
        </Badge>
      )}

      {device.isTrusted && (
        <Button variant="outline" size="sm" onClick={onRevoke} disabled={busy}>
          {busy ? "Revoking…" : "Revoke"}
        </Button>
      )}
    </div>
  )
}

/**
 * Live challenge panel.
 *
 * ⚠️ Shows the code. That's a demo affordance and a real bypass of the control
 * — see the plan's §2.4. The warning is on screen rather than only in a comment
 * so nobody mistakes it for how the product would ship.
 */
function ChallengePanel({
  live,
  recent,
}: {
  live: TrustChallenge[]
  recent: TrustChallenge[]
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Verification challenges
      </h2>

      {live.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-8 text-center">
          <Timer className="mx-auto h-5 w-5 text-muted-foreground/60" />
          <p className="mt-2 text-sm font-medium">No live challenges</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Signing in from an unrecognised device raises one here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {live.map((challenge) => (
            <div
              key={challenge.id}
              className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{challenge.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {challenge.newDeviceLabel ?? "Unknown device"} → approving from{" "}
                    {challenge.targetLabel ?? "a trusted device"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono text-2xl font-bold tracking-[0.2em] tabular-nums">
                      {challenge.code}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      demo only — code hidden in production
                    </p>
                  </div>
                  <div className="flex flex-col items-center rounded-lg bg-background px-3 py-1.5">
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {remaining(challenge.expiresAt)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">left</span>
                  </div>
                </div>
              </div>

              {challenge.attempts > 0 && (
                <p className="mt-2 text-xs text-destructive">
                  {challenge.attempts} failed attempt
                  {challenge.attempts === 1 ? "" : "s"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <p className="border-b border-border px-4 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Recent
          </p>
          <div className="divide-y divide-border">
            {recent.map((challenge) => (
              <div key={challenge.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-xs">
                  <span className="font-medium">{challenge.fullName}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {challenge.newDeviceLabel ?? "unknown device"}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {relativeTime(challenge.createdAt)}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-semibold",
                    challenge.status === "VERIFIED" &&
                      "border-emerald-500/25 bg-emerald-500/10 text-emerald-600",
                    challenge.status === "FAILED" &&
                      "border-destructive/25 bg-destructive/10 text-destructive"
                  )}
                >
                  {challenge.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
