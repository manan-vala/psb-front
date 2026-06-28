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
    <div className="rounded-xl border border-border bg-card p-4 h-[400px] flex flex-col">
      <p className="mb-3 text-sm font-medium text-muted-foreground border-b border-border/50 pb-2">Alert Feed</p>

      <div className="flex-1 space-y-2 overflow-y-auto pr-2">
        {!history.length && (
          <p className="text-sm text-muted-foreground text-center pt-8">
            Waiting for session data...
          </p>
        )}

        {history.map((event, i) => {
          const engine = detectEngine(event.flags)
          const isBlock = event.action === "BLOCK"

          return (
            <div
              key={`${event.timestamp}-${i}`}
              className={cn(
                "flex gap-3 rounded-lg border-l-4 p-3 text-xs shadow-sm slide-in-right",
                ENGINE_COLORS[engine],
                isBlock ? "bg-destructive/10 pulse-red" : "bg-muted/30",
              )}
            >
              <span className="shrink-0 tabular-nums text-muted-foreground mt-0.5">
                {formatTime(event.timestamp)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="font-semibold capitalize text-foreground">{engine}</span>
                  {event.flags.map((f) => (
                    <span
                      key={f}
                      className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive font-medium border border-destructive/20"
                    >
                      {f.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                {event.explanation && (
                  <p className="text-muted-foreground leading-relaxed">
                    {event.explanation}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 font-bold",
                  event.action === "ALLOW"
                    ? "text-green-500"
                    : event.action === "STEP_UP"
                      ? "text-amber-500"
                      : "text-destructive",
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
