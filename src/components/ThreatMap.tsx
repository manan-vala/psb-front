import { useEffect, useState } from "react"
import type { DemoPhase, RiskUpdate } from "@/types/risk"

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
      
      <div className="flex-1 relative w-full opacity-60">
        {/* Simple SVG World Map Outline */}
        <svg viewBox="0 0 1000 500" className="w-full h-full text-muted-foreground/30 fill-current">
           <path d="M253,101c0,0-19-14-34-11c-15,3-14,24-14,24s-14,13-17,32c-3,19,10,23,10,23s14-2,26,7c12,9,18,33,18,33s-14,12-14,27
            c0,15,3,32,3,32s5,25-2,41c-7,16-36,54-36,54s-9,16-24,19c-15,3-25-18-25-18s-13,6-19,3c-6-3-9-24-9-24s4-16,3-22
            c-1-6,4-10,4-10s2-16-9-27c-11-11-20-41-20-41s-10,13-12-6c-2-19-21-39-21-39s-14-16-1-45c13-29,48-43,48-43s22-12,49-9
            c27,3,35,10,35,10s47,5,56,8c9,3,9-10,9-10S256,110,253,101z"/>
          <path d="M720,128c0,0-36,13-36,25c0,12-12,18-12,18s-8,30,1,34c9,4,19,4,19,4s8,14-3,21c-11,7-16,19-16,19s14,20,16,29
            c2,9,5,19,5,19s2,16-6,21c-8,5-9,13-9,13s3,16,1,28c-2,12-12,23-12,23s4,25,8,30c4,5,11,7,11,7s7,16,7,30c0,14-5,24-5,24
            s-9,21,11,19c20-2,30-22,30-22s6,0,14,10c8,10,15,9,15,9s20,3,15-18c-5-21-4-27-4-27s4-30,13-35c9-5,10-23,10-23s22,8,27-2
            c5-10,3-18,3-18s16,2,17-9c1-11,6-18,6-18s18-7,21-20c3-13,2-24,2-24s8-2,21-12c13-10,23-23,23-23s6-26,4-41c-2-15-18-29-18-29
            s-34-11-46-8c-12,3-30,2-30,2s-19-10-38-6c-19,4-37,4-37,4S740,111,720,128z"/>
          <path d="M485,73c0,0-15-5-26,6c-11,11-13,23-13,23s-26,5-34,22c-8,17-21,26-21,26s-16,14-16,23c0,9-5,16-5,16s-15,10-15,22
            c0,12-8,22-8,22s11,9,16,23c5,14,24,26,24,26s16,16,22,13c6-3,18-9,18-9s15,2,25,0c10-2,20-13,20-13s6-27,24-34c18-7,23-19,23-19
            s7-17-7-25c-14-8-12-22-12-22S497,84,485,73z"/>
          <path d="M575,237c0,0-16-1-19,10c-3,11-6,21-6,21s-10,14-3,25c7,11,16,16,16,16s14,8,8,22c-6,14-5,24-5,24s5,25,9,38
            c4,13,8,30,8,30s7,22,17,21c10-1,19-21,19-21s4-15,14-14c10,1,16,7,16,7s15,9,15-5c0-14-3-32-3-32s8-21-4-32c-12-11-20-18-20-18
            s-16-9-19-20c-3-11-7-19-7-19S591,238,575,237z"/>
        </svg>

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
