import type { RiskUpdate } from "@/types/risk"
import { cn } from "@/lib/utils"

interface AlertFeedProps {
  history: RiskUpdate[]
}

const ENGINE_COLORS: Record<string, string> = {
  network: "border-blue-500",
  device: "border-purple-500",
  behavior: "border-orange-500",
  journey: "border-teal-500",
}

function detectEngine(flags: string[] = []) {
  const flagStr = flags.join(" ")
  if (/VPN|TRAVEL|NETWORK|LATENCY/.test(flagStr)) return "network"
  if (/DEVICE|FIRST_DEVICE/.test(flagStr)) return "device"
  if (/PASTE|ANOMALY|EMULATOR|TYPING|SPEED/.test(flagStr)) return "behavior"
  if (/SPEEDRUN|HEADLESS|PATH/.test(flagStr)) return "journey"
  return "network"
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour12: false })
}

export function AlertFeed({ history }: AlertFeedProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-sm text-muted-foreground">Alert Feed</p>

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {!history.length && (
          <p className="text-xs text-muted-foreground">
            Waiting for session data...
          </p>
        )}

        {history.map((event, i) => {
          const engine = detectEngine(event.flags)
          const isBlock = event.action === "BLOCK"

          return (
            <div
              key={i}
              className={cn(
                "flex gap-3 rounded-lg border-l-4 p-2.5 text-xs",
                ENGINE_COLORS[engine],
                isBlock ? "bg-red-500/8" : "bg-muted/40",
              )}
            >
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatTime(event.timestamp)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium capitalize">{engine}</span>
                  {event.flags.map((f) => (
                    <span
                      key={f}
                      className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive"
                    >
                      {f.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                {event.explanation && (
                  <p className="mt-0.5 truncate text-muted-foreground">
                    {event.explanation}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 font-medium",
                  event.action === "ALLOW"
                    ? "text-green-600"
                    : event.action === "STEP_UP"
                      ? "text-amber-600"
                      : "text-red-600",
                )}
              >
                {event.action}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
