import { useState, useRef, useCallback, useEffect } from "react"
import type { RiskUpdate, Transaction, DemoPhase } from "@/types/risk"
import { DEMO_EVENTS, INITIAL_HISTORY, generateRandomTransaction } from "@/data/demoScript"

export interface Stats {
  total: number
  flagged: number
  blocked: number
  avgRisk: number
}

export function useDemoEngine() {
  const [phase, setPhase] = useState<DemoPhase>("IDLE")
  const [data, setData] = useState<RiskUpdate | null>(null)
  const [history, setHistory] = useState<RiskUpdate[]>(INITIAL_HISTORY)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<Stats>({ total: 1450, flagged: 24, blocked: 3, avgRisk: 12 })
  const [riskHistory, setRiskHistory] = useState<{ time: number, score: number }[]>([])

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const bgIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
    if (bgIntervalRef.current) {
      clearInterval(bgIntervalRef.current)
      bgIntervalRef.current = null
    }
  }

  // Initial population of transactions based on history
  useEffect(() => {
    if (transactions.length === 0) {
      const initialTx = INITIAL_HISTORY.map(h => ({
        txId: `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        amount: Math.floor(Math.random() * 50000) + 1000,
        currency: "INR",
        merchant: "Login/Session",
        location: "Various",
        riskScore: h.riskScore,
        action: h.action,
        timestamp: h.timestamp
      }))
      setTransactions(initialTx)
      
      const initialRisk = INITIAL_HISTORY.map(h => ({
        time: h.timestamp,
        score: h.riskScore
      }))
      setRiskHistory(initialRisk)
    }
  }, [])

  const resetDemo = useCallback(() => {
    clearTimeouts()
    setPhase("IDLE")
    setData(null)
    setHistory(INITIAL_HISTORY)
    setStats({ total: 1450, flagged: 24, blocked: 3, avgRisk: 12 })
    
    const initialTx = INITIAL_HISTORY.map(h => ({
      txId: `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      amount: Math.floor(Math.random() * 50000) + 1000,
      currency: "INR",
      merchant: "Login/Session",
      location: "Various",
      riskScore: h.riskScore,
      action: h.action,
      timestamp: h.timestamp
    }))
    setTransactions(initialTx)
    
    const initialRisk = INITIAL_HISTORY.map(h => ({
      time: h.timestamp,
      score: h.riskScore
    }))
    setRiskHistory(initialRisk)
  }, [])

  const updateStats = (event: RiskUpdate, isBlockTx: boolean = false) => {
    setStats(s => {
      const newTotal = s.total + 1
      const newFlagged = event.action === "STEP_UP" ? s.flagged + 1 : s.flagged
      const newBlocked = event.action === "BLOCK" || isBlockTx ? s.blocked + 1 : s.blocked
      
      // Moving average for risk
      const newAvgRisk = Math.round((s.avgRisk * s.total + event.riskScore) / newTotal)
      
      return { total: newTotal, flagged: newFlagged, blocked: newBlocked, avgRisk: newAvgRisk }
    })
  }

  const startDemo = useCallback(() => {
    resetDemo()
    setPhase("CONNECTING")

    // Simulate connection delay
    const t0 = setTimeout(() => {
      setPhase("LIVE")
      
      // Schedule all demo events
      DEMO_EVENTS.forEach(({ delay, event }) => {
        const t = setTimeout(() => {
          const timestamp = Date.now()
          const eventWithTime = { ...event, timestamp }
          
          setData(eventWithTime)
          setHistory(prev => [eventWithTime, ...prev].slice(0, 50))
          
          setRiskHistory(prev => [...prev, { time: timestamp, score: event.riskScore }].slice(-20))
          
          // Generate a corresponding transaction if it's a significant event (like block or step up)
          if (event.action !== "ALLOW" || Math.random() > 0.5) {
             const isBlock = event.action === "BLOCK"
             const newTx = generateRandomTransaction(isBlock)
             // override risk score to match event if it's the main narrative
             newTx.riskScore = event.riskScore
             newTx.action = event.action
             newTx.timestamp = timestamp
             setTransactions(prev => [newTx, ...prev].slice(0, 50))
          }
          
          updateStats(eventWithTime, event.action === "BLOCK")

        }, delay)
        timeoutsRef.current.push(t)
      })

      // Background transactions
      bgIntervalRef.current = setInterval(() => {
        // Only run background txns if we aren't at the climax of the demo
        if (Math.random() > 0.3) {
          const newTx = generateRandomTransaction(false)
          setTransactions(prev => [newTx, ...prev].slice(0, 50))
          
          // Slight update to stats for background tx
          setStats(s => ({
            ...s,
            total: s.total + 1,
            avgRisk: Math.round((s.avgRisk * s.total + newTx.riskScore) / (s.total + 1))
          }))
        }
      }, 3500)
      
    }, 1500)
    
    timeoutsRef.current.push(t0)
  }, [resetDemo])

  // Cleanup on unmount
  useEffect(() => {
    return clearTimeouts
  }, [])

  return { 
    data, 
    connected: phase === "LIVE", 
    phase, 
    history, 
    transactions, 
    stats, 
    riskHistory, 
    startDemo,
    resetDemo
  }
}
