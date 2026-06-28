import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts"
import type { RiskAction } from "@/types/risk"
import { SessionStatus } from "./SessionStatus"

interface RiskGaugeProps {
  riskScore: number | null
  action: RiskAction | null
}

function scoreColor(score: number | null) {
  if (score === null) return "oklch(0.7 0 0)"
  if (score <= 30) return "oklch(0.72 0.19 142)" // green
  if (score <= 60) return "oklch(0.78 0.18 70)" // amber
  return "oklch(0.65 0.22 27)" // red
}

export function RiskGauge({ riskScore, action }: RiskGaugeProps) {
  const score = riskScore ?? 0
  const data = [{ value: score }]

  return (
    <section className="flex h-full flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center">
      <p className="mb-2 text-sm text-muted-foreground">Identity Risk Score</p>
      
      <div className="relative">
        <RadialBarChart
          width={200}
          height={200}
          innerRadius={70}
          outerRadius={95}
          data={data}
          startAngle={225}
          endAngle={-45}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: "oklch(0.922 0 0)" }}
            dataKey="value"
            angleAxisId={0}
            fill={scoreColor(riskScore)}
            cornerRadius={6}
          />
        </RadialBarChart>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums">
            {riskScore !== null ? Math.round(riskScore) : "—"}
          </span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>

      <SessionStatus action={action} />
    </section>
  )
}
