import "./App.css"

import { AlertFeed } from "./components/AlertFeed"
import { ConnectionStatus } from "./components/ConnectionStatus"
import { EngineScores } from "./components/EngineScores"
import { JourneyTimeline } from "./components/JourneyTimeline"
import { RiskGauge } from "./components/RiskGauge"
import { useWebSocket } from "./hooks/useWebSocket"

export default function App() {
  const { data, connected, history } = useWebSocket()

  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Aegis</h1>
          <p className="text-sm text-muted-foreground">
            Fraud Operations Dashboard
          </p>
        </div>
        <ConnectionStatus connected={connected} />
      </header>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <RiskGauge
            riskScore={data?.riskScore ?? null}
            action={data?.action ?? null}
          />
        </div>
        <div className="lg:col-span-2">
          <EngineScores
            engines={data?.engines ?? null}
            flags={data?.flags ?? []}
          />
        </div>
      </div>

      <div className="mb-4">
        <JourneyTimeline
          sessionPath={data?.sessionPath ?? []}
          dwellTimes={data?.dwellTimes ?? []}
        />
      </div>

      <AlertFeed history={history} />
    </main>
  )
}
