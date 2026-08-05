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

export interface Stats {
  total: number
  flagged: number
  blocked: number
  avgRisk: number
}

export interface Transaction {
  txId: string
  amount: number
  currency: string
  merchant: string
  payee?: string
  location: string
  riskScore: number
  action: RiskAction
  timestamp: number
}

export interface HighValuePayment {
  amount: number
  payee: string
  timestamp: number
  flag: string
}

export interface TransactionCompleted {
  txId: string
  amount: number
  payee: string
  currency: string
  riskScore: number
  action: RiskAction
  timestamp: number
  location: string
}

export interface SecuritySignal {
  type: 'WARNING' | 'CRITICAL'
  flags: string[]
  explanation: string
  engines: Partial<RiskEngines>
  riskScore: number
  action: RiskAction
  timestamp: number
  sessionPath: string[]
  dwellTimes: number[]
}
