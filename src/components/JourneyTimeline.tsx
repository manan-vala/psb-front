import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface JourneyTimelineProps {
  sessionPath: string[]
  dwellTimes: number[]
}

function isAnomalous(path: string[], dwellTimes: number[], index: number) {
  // Flag: dwell < 1500ms on non-first screen
  if (index > 0 && dwellTimes[index] < 1500) return true
  // Flag: Login followed immediately by Transfer
  if (
    path[index] === "Transfer" &&
    !path.slice(0, index).includes("Home")
  )
    return true
  return false
}

export function JourneyTimeline({
  sessionPath,
  dwellTimes,
}: JourneyTimelineProps) {
  if (!sessionPath.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Session Journey</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Session not started
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-4 text-sm text-muted-foreground">Session Journey</p>
      <div className="flex items-start gap-0">
        {sessionPath.map((screen, i) => {
          const isLast = i === sessionPath.length - 1
          const isCurrent = isLast
          const anomalous = isAnomalous(sessionPath, dwellTimes, i)

          return (
            <div key={i} className="flex flex-1 items-start fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
              {/* Node + label */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                    isCurrent && "ring-4 ring-primary/20",
                    anomalous
                      ? "border-destructive bg-destructive/20 text-destructive animate-pulse"
                      : "border-primary bg-primary/10 text-primary",
                  )}
                >
                  {!isCurrent ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-center text-xs font-semibold",
                    anomalous ? "text-destructive" : "text-foreground",
                  )}
                >
                  {screen}
                </span>
                {dwellTimes[i] !== undefined && !isCurrent && (
                  <span className="text-[10px] font-medium text-muted-foreground mt-0.5 bg-muted px-1.5 py-0.5 rounded">
                    {(dwellTimes[i] / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "mt-3.5 h-0.5 flex-1 transition-colors",
                    anomalous ? "bg-destructive/50" : "bg-primary/30",
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
