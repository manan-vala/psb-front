import { useEffect, useState } from "react"
import type { DemoPhase, RiskUpdate } from "@/types/risk"
import SvgWorldMap from "./icons/WorldMap"

interface ThreatMapProps {
  phase: DemoPhase
  data: RiskUpdate | null
}

const PINGS = [
  { id: "delhi", cx: "67%", cy: "38%", delay: 0 },
  { id: "bengaluru", cx: "69%", cy: "52%", delay: 1000 },
  { id: "mumbai", cx: "66%", cy: "45%", delay: 2000 },
]

export function ThreatMap({ phase, data }: ThreatMapProps) {
  const [activePings, setActivePings] = useState<typeof PINGS>([])
  
  useEffect(() => {
    if (data?.flags.includes("IMPOSSIBLE_TRAVEL") && data.action === "BLOCK") {
      // Trigger the sequence
      const timers = PINGS.map(ping => 
        setTimeout(() => {
          setActivePings(prev => [...prev, ping])
        }, ping.delay)
      )
      return () => timers.forEach(clearTimeout)
    } else if (phase === "IDLE") {
      setActivePings([])
    }
  }, [data, phase])

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full relative overflow-hidden flex flex-col">
      <p className="text-sm text-muted-foreground z-10 mb-2">Live Threat Map</p>
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--primary),0.05)_0%,transparent_100%)] pointer-events-none" />
      <div className="absolute inset-0 z-0 opacity-60">
        <SvgWorldMap className="w-full h-full text-muted-foreground/30 fill-current" />
      </div>

      <div className="flex-1 relative w-full">
        {/* Pings */}
        {activePings.map(ping => (
          <div 
            key={ping.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: ping.cx, top: ping.cy }}
          >
            <div className="size-2 bg-destructive rounded-full relative z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 bg-destructive rounded-full animate-[pingRing_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
            {ping.id === "mumbai" && (
                <div className="absolute top-4 left-4 bg-destructive/10 border border-destructive/30 text-destructive text-[10px] px-2 py-0.5 rounded whitespace-nowrap fade-in-up">
                    VPN Detected
                </div>
            )}
          </div>
        ))}

        {/* Connecting lines */}
        {activePings.length > 1 && (
           <svg className="absolute inset-0 w-full h-full pointer-events-none fade-in-up">
             {activePings.map((ping, i) => {
               if (i === 0) return null
               const prev = activePings[i - 1]
               return (
                 <line 
                    key={`line-${i}`}
                    x1={prev.cx} 
                    y1={prev.cy} 
                    x2={ping.cx} 
                    y2={ping.cy} 
                    stroke="var(--destructive)" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 4" 
                    className="opacity-50"
                  />
               )
             })}
           </svg>
        )}
      </div>
    </div>
  )
}
