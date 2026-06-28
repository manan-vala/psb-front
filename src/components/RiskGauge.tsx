import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts"
import type { RiskAction } from "@/types/risk"
import { SessionStatus } from "./SessionStatus"

interface RiskGaugeProps {
  riskScore: number | null
  action: RiskAction | null
}

function scoreColor(score: number | null) {
  if (score === null) return "oklch(0.7 0 0)"
  if (score <= 30) return "var(--chart-2)" // green
  if (score <= 60) return "var(--chart-3)" // amber
  return "var(--chart-4)" // red
}

export function RiskGauge({ riskScore, action }: RiskGaugeProps) {
  const score = riskScore ?? 0
  const data = [{ value: score }]

  return (
    <section className="flex h-full flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center relative overflow-hidden">
      {riskScore !== null && riskScore > 80 && (
        <div className="absolute inset-0 bg-destructive/5 animate-pulse pointer-events-none" />
      )}
      <p className="mb-2 text-sm text-muted-foreground z-10">Identity Risk Score</p>
      
      <div className="relative z-10 w-full h-[200px] flex justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
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
            background={{ fill: "var(--input)" }}
            dataKey="value"
            angleAxisId={0}
            fill={scoreColor(riskScore)}
            cornerRadius={6}
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center drop-shadow-md">
          <span className="text-5xl font-bold tabular-nums" style={{ color: scoreColor(riskScore) }}>
            {riskScore !== null ? Math.round(riskScore) : "—"}
          </span>
          <span className="text-xs text-muted-foreground mt-1">/ 100</span>
        </div>
      </div>

      <div className="z-10">
        <SessionStatus action={action} />
      </div>
    </section>
  )
}
