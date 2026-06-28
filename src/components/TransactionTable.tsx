import type { Transaction } from "@/types/risk"
import { cn } from "@/lib/utils"
import { ShieldCheck, ShieldX, AlertTriangle } from "lucide-react"

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString("en-IN", { hour12: false })

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-[400px]">
      <div className="p-4 border-b border-border bg-muted/20">
        <p className="text-sm text-muted-foreground font-medium">Live Transactions</p>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground bg-card sticky top-0 z-10 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium text-center">Risk</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => {
              const isBlock = tx.action === "BLOCK"
              const isStepUp = tx.action === "STEP_UP"
              
              return (
                <tr 
                  key={tx.txId} 
                  className={cn(
                    "border-b border-border/50 hover:bg-muted/30 transition-colors fade-in-up",
                    isBlock ? "pulse-red bg-destructive/5" : ""
                  )}
                  style={{ animationDelay: `${Math.min(i * 0.05, 0.5)}s` }}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{tx.txId}</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{formatTime(tx.timestamp)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    ₹{tx.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[120px]" title={tx.location}>
                    {tx.location}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center w-8 h-6 rounded font-semibold text-xs",
                      isBlock ? "bg-destructive/20 text-destructive" : 
                      isStepUp ? "bg-amber-500/20 text-amber-500" : 
                      "bg-primary/20 text-primary"
                    )}>
                      {tx.riskScore}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className={cn(
                      "flex items-center gap-1.5 text-xs font-medium",
                      isBlock ? "text-destructive" : 
                      isStepUp ? "text-amber-500" : 
                      "text-green-500"
                    )}>
                      {isBlock ? <ShieldX className="size-3.5" /> : 
                       isStepUp ? <AlertTriangle className="size-3.5" /> : 
                       <ShieldCheck className="size-3.5" />}
                      {tx.action}
                    </div>
                  </td>
                </tr>
              )
            })}
            
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                  Waiting for transactions...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
