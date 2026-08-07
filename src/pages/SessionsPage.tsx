import { useCallback, useEffect, useState } from "react"
import { Activity, AlertTriangle, ShieldAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { usePolling } from "@/hooks/usePolling"
import {
  fetchSessionDetail,
  fetchSessions,
  type SessionEvent,
  type SessionSummary,
} from "@/lib/analystApi"
import { cn } from "@/lib/utils"

const ACTION_STYLES: Record<string, string> = {
  ALLOW: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600",
  STEP_UP: "border-amber-500/25 bg-amber-500/10 text-amber-600",
  BLOCK: "border-destructive/25 bg-destructive/10 text-destructive",
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

/**
 * Scenario C — sessions scored in the app, as the bank sees them.
 *
 * The list polls; opening a session loads its full event timeline. Selection is
 * kept as an id rather than the row object so a poll that refreshes the list
 * doesn't drop what's open.
 */
export function SessionsPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const { data, error, loading } = usePolling(fetchSessions, 3000)

  const sessions = data?.sessions ?? []
  const alertCount = data?.alertCount ?? 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Recent sessions
        </span>
        {alertCount > 0 && (
          <Badge
            variant="outline"
            className="gap-1.5 border-destructive/25 bg-destructive/10 font-semibold text-destructive"
          >
            <ShieldAlert className="h-3 w-3" />
            {alertCount} needing attention
          </Badge>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && sessions.length === 0 && <Skeleton className="h-40 w-full rounded-xl" />}

      {!loading && sessions.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-12 text-center">
          <Activity className="mx-auto h-5 w-5 text-muted-foreground/60" />
          <p className="mt-2 text-sm font-medium">No sessions scored yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Making a transfer in the app&rsquo;s session monitor records one here.
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {sessions.length > 0 && (
          <div className="flex flex-col gap-2">
            {sessions.map((session) => (
              <SessionRow
                key={session.sessionId}
                session={session}
                active={selected === session.sessionId}
                onSelect={() => setSelected(session.sessionId)}
              />
            ))}
          </div>
        )}

        {selected && <SessionTimeline sessionId={selected} />}
      </div>
    </div>
  )
}

function SessionRow({
  session,
  active,
  onSelect,
}: {
  session: SessionSummary
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-xl border bg-card p-3.5 text-left transition-colors",
        active ? "border-primary" : "border-border hover:border-muted-foreground/30"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {session.fullName ?? "Unattributed session"}
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {session.sessionId}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("flex-shrink-0 font-semibold", ACTION_STYLES[session.worstAction])}
        >
          {session.worstAction.replace("_", " ")}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          Peak risk <span className="font-semibold tabular-nums">{session.maxRiskScore}</span>
        </span>
        <span>{session.eventCount} events</span>
        <span>{time(session.lastSeenAt)}</span>
      </div>

      {session.flags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {session.flags.map((flag) => (
            <span
              key={flag}
              className="rounded-full bg-destructive/10 px-2 py-0.5 text-[9.5px] font-semibold tracking-wide text-destructive uppercase"
            >
              {flag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

function SessionTimeline({ sessionId }: { sessionId: string }) {
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const result = await fetchSessionDetail(sessionId)
      setEvents(result.events)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    setLoading(true)
    load()
    // Keeps an open session updating while it's still being used in the app.
    const id = window.setInterval(load, 3000)
    return () => window.clearInterval(id)
  }, [load])

  return (
    <div className="rounded-xl border border-border bg-card">
      <p className="border-b border-border px-4 py-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Assessment timeline
      </p>

      {loading && events.length === 0 ? (
        <div className="p-4">
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {events.map((event) => {
            const reasons = (event.features?.reasons as string[] | undefined) ?? []
            // Bound to a local so the null check survives into the map callback
            // below — narrowing on event.engines doesn't reach inside it.
            const engines = event.engines
            return (
              <div key={event.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {time(event.createdAt)} · {event.screen ?? "—"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {event.riskScore}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold",
                        ACTION_STYLES[event.action]
                      )}
                    >
                      {event.action.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                {engines && (
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {(["network", "device", "behavior", "journey"] as const).map((key) => (
                      <div key={key}>
                        <p className="text-[9.5px] tracking-wide text-muted-foreground uppercase">
                          {key}
                        </p>
                        <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              engines[key] < 70 ? "bg-destructive" : "bg-emerald-500"
                            )}
                            style={{ width: `${engines[key]}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {reasons.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {reasons.map((reason) => (
                      <li
                        key={reason}
                        className="flex gap-1.5 text-[11px] leading-snug text-muted-foreground"
                      >
                        <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-500" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
