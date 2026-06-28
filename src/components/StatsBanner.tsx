import type { Stats } from "@/hooks/useDemoEngine"

export function StatsBanner({ stats }: { stats: Stats }) {
  const formatNumber = (num: number) => num.toLocaleString()

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Transactions Analyzed</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{formatNumber(stats.total)}</p>
      </div>
      
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Flagged (Step Up)</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-amber-500">{formatNumber(stats.flagged)}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Blocked Transactions</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-destructive">{formatNumber(stats.blocked)}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Average Risk Score</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-primary">{stats.avgRisk}</p>
      </div>
    </div>
  )
}
