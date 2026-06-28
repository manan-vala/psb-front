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
            <div key={i} className="flex flex-1 items-start">
              {/* Node + label */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border-2 text-xs font-medium",
                    isCurrent && "animate-pulse ring-2 ring-primary ring-offset-2",
                    anomalous
                      ? "border-red-500 bg-red-500/20 text-red-600"
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
                    "mt-1 text-center text-xs font-medium",
                    anomalous ? "text-red-500" : "text-foreground",
                  )}
                >
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
                <div
                  className={cn(
                    "mt-3.5 h-0.5 flex-1",
                    anomalous ? "bg-red-400" : "bg-border",
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
