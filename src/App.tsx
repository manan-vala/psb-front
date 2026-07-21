import { useEffect } from "react"
import "./App.css"

import { AlertFeed } from "./components/AlertFeed"
import { EngineScores } from "./components/EngineScores"
import { JourneyTimeline } from "./components/JourneyTimeline"
import { RiskGauge } from "./components/RiskGauge"
import { DemoConnectButton } from "./components/DemoConnectButton"
import { StatsBanner } from "./components/StatsBanner"
import { LiveActivityBar } from "./components/LiveActivityBar"
import { RiskTrendChart } from "./components/RiskTrendChart"
import { ThreatMap } from "./components/ThreatMap"
import { TransactionTable } from "./components/TransactionTable"
import { HighValueAlert } from "./components/HighValueAlert"
import { useDemoEngine } from "./hooks/useDemoEngine"
import { useWebSocket } from "./hooks/useWebSocket"
// import { Shield } from "lucide-react"
import { BobIconPrimary } from "./components/icons/bob-icon-primary"
import { BobIconCaptionPrimary } from "./components/icons/bob-icon-caption-primary"

export default function App() {
  const { data: demoData, phase, history: demoHistory, transactions: demoTx, stats: demoStats, riskHistory, startDemo, resetDemo } = useDemoEngine()
  const { highValuePayments, liveStats, liveTransactions, data: liveData, history: liveHistory } = useWebSocket()

  const displayStats = liveTransactions.length > 0 ? liveStats : demoStats
  const displayTransactions = liveTransactions.length > 0 ? liveTransactions : demoTx
  const displayData = liveData || demoData
  const displayHistory = liveHistory.length > 0 ? liveHistory : demoHistory

  useEffect(() => {
    // Remove dark mode for the demo
    document.documentElement.classList.remove("dark")
  }, [])

  return (
    <>
      <LiveActivityBar phase={phase} />
      <main className="min-h-screen bg-background p-4 text-foreground sm:p-6 pb-20 pt-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/10 p-2 rounded-lg text-primary flex items-center justify-center">
              <BobIconPrimary className="w-14 h-auto" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Aegis</h1>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">
                Fraud Intelligence & Monitoring
              </p>
            </div>
          </div>
          
          <DemoConnectButton 
            phase={phase}
            onStart={startDemo}
            onReset={resetDemo}
          />
        </header>

        <div className="flex flex-col gap-4 mb-6">
          {highValuePayments.map((payment, i) => (
            <HighValueAlert key={i} payment={payment} />
          ))}
        </div>

        <StatsBanner stats={displayStats} />

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-4 h-[350px]">
          <div className="lg:col-span-1 h-full">
            <RiskGauge
              riskScore={displayData?.riskScore ?? null}
              action={displayData?.action ?? null}
            />
          </div>
          <div className="lg:col-span-1 h-full">
            <EngineScores
              engines={displayData?.engines ?? null}
              flags={displayData?.flags ?? []}
            />
          </div>
          <div className="lg:col-span-2 h-full">
            <ThreatMap phase={phase} data={displayData} />
          </div>
        </div>

        <RiskTrendChart data={riskHistory} />

        <div className="mb-6">
          <JourneyTimeline
            sessionPath={displayData?.sessionPath ?? []}
            dwellTimes={displayData?.dwellTimes ?? []}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AlertFeed history={displayHistory} />
          <TransactionTable transactions={displayTransactions} />
        </div>

        <footer className="mt-12 flex items-center justify-center pb-4 opacity-50 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
          <BobIconCaptionPrimary className="h-8 w-auto" />
        </footer>
      </main>
    </>
  )
}
