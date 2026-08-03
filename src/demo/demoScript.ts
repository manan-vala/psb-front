import type { RiskUpdate, Transaction, RiskAction } from "@/types/risk"

const now = Date.now()

export const INITIAL_HISTORY: RiskUpdate[] = [
  {
    riskScore: 12,
    action: "ALLOW",
    engines: { network: 10, device: 5, behavior: 15, journey: 5 },
    flags: [],
    sessionPath: ["Home", "Login", "Dashboard"],
    dwellTimes: [2500, 4200, 5000],
    explanation: "Normal login pattern detected.",
    timestamp: now - 1000 * 60 * 5,
  },
  {
    riskScore: 8,
    action: "ALLOW",
    engines: { network: 5, device: 5, behavior: 5, journey: 10 },
    flags: [],
    sessionPath: ["Login", "Dashboard", "Transfer"],
    dwellTimes: [1500, 3200, 4000],
    explanation: "Returning trusted device.",
    timestamp: now - 1000 * 60 * 4,
  },
  {
    riskScore: 24,
    action: "ALLOW",
    engines: { network: 15, device: 20, behavior: 10, journey: 5 },
    flags: ["NEW_DEVICE_FINGERPRINT"],
    sessionPath: ["Home", "Login"],
    dwellTimes: [3000, 5000],
    explanation: "New device, but IP matches known history.",
    timestamp: now - 1000 * 60 * 3,
  },
  {
    riskScore: 15,
    action: "ALLOW",
    engines: { network: 10, device: 10, behavior: 15, journey: 10 },
    flags: [],
    sessionPath: ["Dashboard", "Settings", "Profile"],
    dwellTimes: [5000, 2000, 4500],
    explanation: "Typical browsing behavior.",
    timestamp: now - 1000 * 60 * 2,
  },
  {
    riskScore: 9,
    action: "ALLOW",
    engines: { network: 5, device: 5, behavior: 10, journey: 5 },
    flags: [],
    sessionPath: ["Home", "Login", "Dashboard"],
    dwellTimes: [2000, 3500, 6000],
    explanation: "Low risk transaction.",
    timestamp: now - 1000 * 60 * 1,
  },
  {
    riskScore: 18,
    action: "ALLOW",
    engines: { network: 12, device: 15, behavior: 18, journey: 12 },
    flags: [],
    sessionPath: ["Login", "Dashboard", "Transfer"],
    dwellTimes: [1800, 4100, 3200],
    explanation: "Consistent behavioral biometrics.",
    timestamp: now - 1000 * 30,
  }
]

export const DEMO_EVENTS = [
  {
    delay: 2000, // +2s: Normal session
    event: {
      riskScore: 18,
      action: "ALLOW" as RiskAction,
      engines: { network: 15, device: 12, behavior: 20, journey: 18 },
      flags: [],
      sessionPath: ["Home"],
      dwellTimes: [2000],
      explanation: "User lands on homepage. Known IP range.",
    }
  },
  {
    delay: 5000, // +5s: login
    event: {
      riskScore: 22,
      action: "ALLOW" as RiskAction,
      engines: { network: 15, device: 12, behavior: 25, journey: 20 },
      flags: [],
      sessionPath: ["Home", "Login"],
      dwellTimes: [2000, 3000],
      explanation: "Standard login sequence initiated.",
    }
  },
  {
    delay: 8000, // +8s: Suspicious signals
    event: {
      riskScore: 47,
      action: "STEP_UP" as RiskAction,
      engines: { network: 55, device: 45, behavior: 30, journey: 25 },
      flags: ["VPN_DETECTED", "NEW_DEVICE_FINGERPRINT"],
      sessionPath: ["Home", "Login"],
      dwellTimes: [2000, 3000],
      explanation: "IP mismatch (VPN) and unfamiliar device signature detected during login.",
    }
  },
  {
    delay: 16000, // +16s: Escalation
    event: {
      riskScore: 74,
      action: "STEP_UP" as RiskAction,
      engines: { network: 55, device: 45, behavior: 85, journey: 40 },
      flags: ["VPN_DETECTED", "NEW_DEVICE_FINGERPRINT", "PASTE_DETECTED", "SUPERHUMAN_TYPING_SPEED", "ML_ANOMALY_DETECTED"],
      sessionPath: ["Home", "Login", "Dashboard"],
      dwellTimes: [2000, 3000, 1200],
      explanation: "Clipboard paste for password and superhuman typing speed flagged. Behavioral ML model anomaly.",
    }
  },
  {
    delay: 24000, // +24s: BLOCK
    event: {
      riskScore: 91,
      action: "BLOCK" as RiskAction,
      engines: { network: 95, device: 60, behavior: 88, journey: 92 },
      flags: ["VPN_DETECTED", "IMPOSSIBLE_TRAVEL", "PASTE_DETECTED", "SUPERHUMAN_TYPING_SPEED", "ML_ANOMALY_DETECTED", "HEADLESS_NAVIGATION", "GOLDEN_PATH_DEVIATION", "SPEEDRUN"],
      sessionPath: ["Home", "Login", "Dashboard", "Transfer"],
      dwellTimes: [2000, 3000, 1200, 500], // very fast transfer
      explanation: "Impossible travel (Delhi to Mumbai in 5 mins). Headless browser signatures detected. Immediate transfer attempt bypassed normal golden path.",
    }
  }
]

// Dummy data generators for background transactions
const FIRST_NAMES = ["James", "Maria", "David", "Sarah", "Michael", "Linda", "Robert", "Emma", "John", "Olivia"]
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat"]

export function generateRandomTransaction(isBlock = false): Transaction {
  const amount = Math.floor(Math.random() * 50000) + 1000
  const city = CITIES[Math.floor(Math.random() * CITIES.length)]
  const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`
  
  if (isBlock) {
    return {
      txId: `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      amount: amount * 5, // High amount
      currency: "INR",
      merchant: `Transfer to ${name}`,
      location: "Mumbai (VPN)",
      riskScore: Math.floor(Math.random() * 15) + 85, // 85-99
      action: "BLOCK",
      timestamp: Date.now()
    }
  }

  const riskScore = Math.floor(Math.random() * 30) + 5
  return {
    txId: `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    amount,
    currency: "INR",
    merchant: `Transfer to ${name}`,
    location: city,
    riskScore,
    action: riskScore > 25 ? "STEP_UP" : "ALLOW",
    timestamp: Date.now()
  }
}
