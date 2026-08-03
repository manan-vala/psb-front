import { useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"

import type { RiskUpdate, HighValuePayment, Transaction, RiskAction, Stats } from "@/types/risk"

const MAX_HISTORY = 50

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [data, setData] = useState<RiskUpdate | null>(null)
  const [connected, setConnected] = useState(false)
  const [history, setHistory] = useState<RiskUpdate[]>([])
  const [highValuePayments, setHighValuePayments] = useState<HighValuePayment[]>([])
  const [riskHistory, setRiskHistory] = useState<{ time: number, score: number }[]>([])
  
  const [liveStats, setLiveStats] = useState<Stats>({ total: 0, flagged: 0, blocked: 0, avgRisk: 0 })
  const [liveTransactions, setLiveTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const socket = io(import.meta.env.VITE_WS_URL, {
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on("connect", () => setConnected(true))
    socket.on("disconnect", () => setConnected(false))
    
    socket.on("risk_update", (payload: RiskUpdate) => {
      setData(payload)
      setHistory((previous) => [payload, ...previous].slice(0, MAX_HISTORY))
      
      setRiskHistory(prev => [...prev, { time: payload.timestamp, score: payload.riskScore }].slice(-20))

      const newTx: Transaction = {
        txId: `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        amount: Math.floor(Math.random() * 50000) + 1000,
        currency: "INR",
        merchant: "Session",
        location: "India",
        riskScore: payload.riskScore,
        action: payload.action,
        timestamp: payload.timestamp
      }
      
      setLiveTransactions((prev) => [newTx, ...prev].slice(0, 50))
      
      setLiveStats((s) => {
        const newTotal = s.total + 1
        const newFlagged = payload.action === "STEP_UP" ? s.flagged + 1 : s.flagged
        const newBlocked = payload.action === "BLOCK" ? s.blocked + 1 : s.blocked
        const newAvgRisk = Math.round((s.avgRisk * s.total + payload.riskScore) / newTotal)
        return { total: newTotal, flagged: newFlagged, blocked: newBlocked, avgRisk: newAvgRisk }
      })
    })
    
    socket.on("high_value_payment", (payload: HighValuePayment) => {
      setHighValuePayments((prev) => [payload, ...prev])
      
      const riskScore = 85
      let action: RiskAction = "STEP_UP"
      
      const newTx: Transaction = {
        txId: `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        amount: payload.amount,
        currency: "INR",
        merchant: payload.payee,
        location: "India",
        riskScore,
        action,
        timestamp: payload.timestamp
      }
      
      setLiveTransactions((prev) => [newTx, ...prev].slice(0, 50))
      
      setLiveStats((s) => {
        const newTotal = s.total + 1
        const newFlagged = (action as string) === "STEP_UP" ? s.flagged + 1 : s.flagged
        const newBlocked = (action as string) === "BLOCK" ? s.blocked + 1 : s.blocked
        const newAvgRisk = Math.round((s.avgRisk * s.total + riskScore) / newTotal)
        return { total: newTotal, flagged: newFlagged, blocked: newBlocked, avgRisk: newAvgRisk }
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  return { data, connected, history, highValuePayments, liveStats, liveTransactions, riskHistory }
}
