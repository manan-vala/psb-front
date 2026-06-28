export type RiskAction = "ALLOW" | "STEP_UP" | "BLOCK"
export type DemoPhase = "IDLE" | "CONNECTING" | "LIVE"

export interface RiskEngines {
  network: number
  device: number
  behavior: number
  journey: number
}

export interface RiskUpdate {
  riskScore: number
  action: RiskAction
  engines: RiskEngines
  flags: string[]
  sessionPath: string[]
  dwellTimes: number[]
  explanation: string
  timestamp: number
}

export interface Transaction {
  txId: string
  amount: number
  currency: string
  merchant: string
  location: string
  riskScore: number
  action: RiskAction
  timestamp: number
}
