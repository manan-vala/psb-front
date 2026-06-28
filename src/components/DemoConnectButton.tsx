import { cn } from "@/lib/utils"
import type { DemoPhase } from "@/types/risk"
import { Play, RotateCcw, Loader2 } from "lucide-react"

interface DemoConnectButtonProps {
  phase: DemoPhase
  onStart: () => void
  onReset: () => void
}

export function DemoConnectButton({ phase, onStart, onReset }: DemoConnectButtonProps) {
  if (phase === "IDLE") {
    return (
      <button
        onClick={onStart}
        className="group relative flex h-10 items-center justify-center gap-2 overflow-hidden rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        <Play className="size-4" />
        Connect System
      </button>
    )
  }

  if (phase === "CONNECTING") {
    return (
      <button
        disabled
        className="flex h-10 items-center justify-center gap-2 rounded-md bg-muted px-6 text-sm font-medium text-muted-foreground transition-colors"
      >
        <Loader2 className="size-4 animate-spin" />
        Connecting...
      </button>
    )
  }

  // LIVE phase
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm font-medium text-green-500">
        <span className="relative flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex size-3 rounded-full bg-green-500"></span>
        </span>
        System Live
      </div>
      
      <button
        onClick={onReset}
        className="flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        title="Reset Demo"
      >
        <RotateCcw className="size-3.5" />
        Reset Demo
      </button>
    </div>
  )
}
