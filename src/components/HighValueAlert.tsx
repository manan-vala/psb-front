import type { HighValuePayment } from "@/types/risk"
import { AlertTriangle, MapPin } from "lucide-react"

interface HighValueAlertProps {
  payment: HighValuePayment | null
}

export function HighValueAlert({ payment }: HighValueAlertProps) {
  if (!payment) return null;

  return (
    <div className="rounded-xl border-l-4 border-l-destructive border-t border-b border-r border-border bg-destructive/10 p-4 animate-in slide-in-from-top-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="rounded-full bg-destructive/20 p-2 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-destructive">High-Value Transfer Detected</h3>
            <span className="rounded bg-destructive/20 px-2 py-0.5 text-[10px] text-destructive font-bold uppercase tracking-wider">
              {payment.flag}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            An unusually large payment of <strong className="text-foreground">₹{payment.amount.toLocaleString()}</strong> was just initiated to <strong className="text-foreground">{payment.payee}</strong>.
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm text-muted-foreground flex flex-col items-end">
          <span>{new Date(payment.timestamp).toLocaleTimeString("en-IN", { hour12: false })}</span>
          <span className="flex items-center gap-1 mt-1 text-xs">
            <MapPin className="h-3 w-3" /> India
          </span>
        </div>
        <div className="text-xs font-semibold text-destructive mt-2 uppercase tracking-wider">
          Action Required
        </div>
      </div>
    </div>
  )
}
