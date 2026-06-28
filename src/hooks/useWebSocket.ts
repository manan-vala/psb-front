import { useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"

import type { RiskUpdate } from "@/types/risk"

const MAX_HISTORY = 50

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [data, setData] = useState<RiskUpdate | null>(null)
  const [connected, setConnected] = useState(false)
  const [history, setHistory] = useState<RiskUpdate[]>([])

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
      setHistory((previous) =>
        [payload, ...previous].slice(0, MAX_HISTORY),
      )
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  return { data, connected, history }
}
