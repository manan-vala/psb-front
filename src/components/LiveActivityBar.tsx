import type { DemoPhase } from "@/types/risk"

export function LiveActivityBar({ phase }: { phase: DemoPhase }) {
  if (phase !== "LIVE") return null

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-50 overflow-hidden bg-background">
      <div className="h-full bg-primary/20 absolute w-full"></div>
      <div className="h-full bg-primary absolute w-1/3 blur-sm rounded-full animate-[slideInRight_2s_ease-in-out_infinite_alternate]"></div>
    </div>
  )
}
