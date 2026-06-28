export type RiskAction = "ALLOW" | "STEP_UP" | "BLOCK"

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
