import { ShieldCheck, ShieldX, AlertTriangle } from "lucide-react"
import type { RiskAction } from "@/types/risk"

const config = {
  ALLOW: {
    label: "Allow",
    icon: ShieldCheck,
    className: "bg-green-500/15 text-green-600 border-green-500/30",
  },
  STEP_UP: {
    label: "Step Up",
    icon: AlertTriangle,
    className: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
  BLOCK: {
    label: "Blocked",
    icon: ShieldX,
    className: "bg-red-500/15 text-red-600 border-red-500/30",
  },
} as const

interface SessionStatusProps {
  action: RiskAction | null
}

export function SessionStatus({ action }: SessionStatusProps) {
  if (!action) {
    return (
      <div className="mt-3 rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground">
        Awaiting session
      </div>
    )
  }

  const { label, icon: Icon, className } = config[action] ?? config.ALLOW

  return (
    <div
      className={`mt-3 flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium ${className}`}
    >
      <Icon className="size-3" />
      {label}
    </div>
  )
}
