interface JourneyTimelineProps {
  sessionPath: string[]
  dwellTimes: number[]
}

export function JourneyTimeline({
  sessionPath,
  dwellTimes,
}: JourneyTimelineProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">Session Journey</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {sessionPath.length
          ? `${sessionPath.length} steps · ${dwellTimes.length} dwell records`
          : "Session not started"}
      </p>
    </section>
  )
}
