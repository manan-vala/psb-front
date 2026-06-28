import type { RiskEngines } from "@/types/risk"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface EngineScoresProps {
  engines: RiskEngines | null
  flags: string[]
}

const ENGINE_FLAGS: Record<string, string[]> = {
  network: ["VPN_DETECTED", "IMPOSSIBLE_TRAVEL", "NEW_NETWORK", "HIGH_LATENCY"],
  device: ["NEW_DEVICE_FINGERPRINT", "FIRST_DEVICE"],
  behavior: [
    "PASTE_DETECTED",
    "ML_ANOMALY_DETECTED",
    "EMULATOR_SUSPECTED",
    "UNIFORM_TYPING_BOT_PATTERN",
    "SUPERHUMAN_TYPING_SPEED",
  ],
  journey: ["SPEEDRUN", "HEADLESS_NAVIGATION", "GOLDEN_PATH_DEVIATION"],
}

const ENGINE_LABELS: Record<keyof RiskEngines, string> = {
  network: "Network",
  device: "Device",
  behavior: "Behavioral",
  journey: "Journey",
}

function barColor(score: number) {
  if (score >= 70) return "bg-green-500"
  if (score >= 40) return "bg-amber-500"
  return "bg-red-500"
}

function EngineRow({
  id,
  score,
  activeFlags,
}: {
  id: keyof RiskEngines
  score: number | null
  activeFlags: string[]
}) {
  const relevantFlags = activeFlags.filter((f) =>
    ENGINE_FLAGS[id]?.includes(f),
  )
  const displayScore = score ?? 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{ENGINE_LABELS[id]}</span>
        <span className="tabular-nums text-muted-foreground">
          {score !== null ? `${Math.round(displayScore)}` : "—"}
        </span>
      </div>

      <Progress
        value={displayScore}
        className="h-2"
        indicatorClassName={barColor(displayScore)}
      />

      {relevantFlags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {relevantFlags.map((flag) => (
            <Badge
              key={flag}
              variant="destructive"
              className="px-1.5 py-0 text-[10px]"
            >
              {flag.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export function EngineScores({ engines, flags }: EngineScoresProps) {
  return (
    <div className="h-full space-y-4 rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">Engine Trust Scores</p>
      {(Object.keys(ENGINE_LABELS) as Array<keyof RiskEngines>).map((id) => (
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
