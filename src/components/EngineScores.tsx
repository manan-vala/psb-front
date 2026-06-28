import type { RiskEngines } from "@/types/risk"

interface EngineScoresProps {
  engines: RiskEngines | null
  flags: string[]
}

export function EngineScores({ engines, flags }: EngineScoresProps) {
  return (
    <section className="h-full rounded-xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">Engine Trust Scores</p>
      <p className="mt-4 text-sm">
        {engines ? "Engine data received" : "Awaiting engine data"}
      </p>
      {flags.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {flags.length} active {flags.length === 1 ? "flag" : "flags"}
        </p>
      )}
    </section>
  )
}
