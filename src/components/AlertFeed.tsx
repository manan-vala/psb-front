import type { RiskUpdate } from "@/types/risk"

interface AlertFeedProps {
  history: RiskUpdate[]
}

export function AlertFeed({ history }: AlertFeedProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">Alert Feed</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {history.length
          ? `${history.length} events received`
          : "Waiting for session data..."}
      </p>
    </section>
  )
}
