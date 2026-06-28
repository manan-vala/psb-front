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
import { useDemoEngine } from "./hooks/useDemoEngine"
import { Shield } from "lucide-react"

export default function App() {
  const { data, phase, history, transactions, stats, riskHistory, startDemo, resetDemo } = useDemoEngine()

  useEffect(() => {
    // Force dark mode for the demo
    document.documentElement.classList.add("dark")
  }, [])

  return (
    <>
      <LiveActivityBar phase={phase} />
      <main className="min-h-screen bg-background p-4 text-foreground sm:p-6 pb-20 pt-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg text-primary">
              <Shield className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Bank Security Dashboard</h1>
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

        <StatsBanner stats={stats} />

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-4 h-[350px]">
          <div className="lg:col-span-1 h-full">
            <RiskGauge
              riskScore={data?.riskScore ?? null}
              action={data?.action ?? null}
            />
          </div>
          <div className="lg:col-span-1 h-full">
            <EngineScores
              engines={data?.engines ?? null}
              flags={data?.flags ?? []}
            />
          </div>
          <div className="lg:col-span-2 h-full">
            <ThreatMap phase={phase} data={data} />
          </div>
        </div>

        <RiskTrendChart data={riskHistory} />

        <div className="mb-6">
          <JourneyTimeline
            sessionPath={data?.sessionPath ?? []}
            dwellTimes={data?.dwellTimes ?? []}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AlertFeed history={history} />
          <TransactionTable transactions={transactions} />
        </div>
      </main>
    </>
  )
}
