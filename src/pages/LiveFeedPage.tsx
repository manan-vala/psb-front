import { AlertFeed } from "@/components/AlertFeed"
import { EngineScores } from "@/components/EngineScores"
import { HighValueAlert } from "@/components/HighValueAlert"
import { JourneyTimeline } from "@/components/JourneyTimeline"
import { RiskGauge } from "@/components/RiskGauge"
import { RiskTrendChart } from "@/components/RiskTrendChart"
import { SecuritySignalBanner } from "@/components/SecuritySignalBanner"
import { StatsBanner } from "@/components/StatsBanner"
import { ThreatMap } from "@/components/ThreatMap"
import { TransactionTable } from "@/components/TransactionTable"
import type { useWebSocket } from "@/hooks/useWebSocket"

type FeedData = ReturnType<typeof useWebSocket>

/**
 * The original single-page risk feed, re-laid-out for the console shell.
 *
 * Every widget is untouched — same components, same props, same
 * `useWebSocket` data path. This is the one part of the demo that already
 * worked live against `psb-back`, so the rework is strictly presentational:
 * the page-level header, footer and connection bar moved up into
 * `ConsoleLayout`, and what's left is arranged on a 12-column grid with
 * section labels instead of a stack of full-width rows.
 *
 * See DEMO-IMPLEMENTATION-PLAN.md §6.
 */
export function LiveFeedPage({
  data,
  history,
  riskHistory,
  highValuePayments,
  securitySignals,
  liveStats,
  liveTransactions,
  connected,
}: FeedData) {
  const hasAlerts = securitySignals.length > 0 || highValuePayments.length > 0

  return (
    <div className="flex flex-col gap-6">
      {hasAlerts && (
        <div className="flex flex-col gap-3">
          {securitySignals.map((signal, i) => (
            <SecuritySignalBanner key={`sec-${i}`} signal={signal} />
          ))}
          {highValuePayments.map((payment, i) => (
            <HighValueAlert key={`hvp-${i}`} payment={payment} />
          ))}
        </div>
      )}

      <StatsBanner stats={liveStats} />

      {/*
        Gauge and engines are narrow readouts; the map wants the remaining
        width. A fixed row height only applies from `lg` up — RiskGauge sizes
        itself with h-full, so on narrow screens the widgets stack and size
        naturally rather than being squeezed into one shared height.
      */}
      <Section label="Current session">
        <div className="grid grid-cols-1 gap-4 lg:h-[360px] lg:grid-cols-12">
          <div className="lg:col-span-3 lg:h-full">
            <RiskGauge riskScore={data?.riskScore ?? null} action={data?.action ?? null} />
          </div>
          <div className="lg:col-span-3 lg:h-full">
            <EngineScores engines={data?.engines ?? null} flags={data?.flags ?? []} />
          </div>
          <div className="lg:col-span-6 lg:h-full">
            <ThreatMap phase={connected ? "LIVE" : "CONNECTING"} data={data} />
          </div>
        </div>
      </Section>

      <Section label="Risk over time">
        <RiskTrendChart data={riskHistory} />
        <JourneyTimeline
          sessionPath={data?.sessionPath ?? []}
          dwellTimes={data?.dwellTimes ?? []}
        />
      </Section>

      <Section label="Activity">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AlertFeed history={history} />
          <TransactionTable transactions={liveTransactions} />
        </div>
      </Section>
    </div>
  )
}

/**
 * Small labelled grouping. The old page was an undifferentiated stack of
 * widgets; on a console with four routes it helps to say what each band of the
 * screen is for.
 */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </h2>
      {children}
    </section>
  )
}
