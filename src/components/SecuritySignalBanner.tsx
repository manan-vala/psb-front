import { SecuritySignal } from "@/types/risk"
import { AlertTriangle, ShieldAlert } from "lucide-react"

interface SecuritySignalBannerProps {
  signal: SecuritySignal
}

export function SecuritySignalBanner({ signal }: SecuritySignalBannerProps) {
  const isCritical = signal.type === 'CRITICAL'
  const isVpn = signal.flags.includes('VPN_ACTIVE')
  const isDeviceMismatch = signal.flags.includes('DEVICE_FINGERPRINT_MISMATCH')

  let title = "Security Warning"
  let colorClass = "border-amber-500 bg-amber-500/10 text-amber-500"
  let icon = <AlertTriangle className="size-5 shrink-0 mt-0.5" />

  if (isCritical) {
    colorClass = "border-destructive bg-destructive/10 text-destructive"
    icon = <ShieldAlert className="size-5 shrink-0 mt-0.5" />
    if (isVpn) {
      title = "Active VPN Detected"
    } else {
      title = "Critical Security Alert"
    }
  } else if (isDeviceMismatch) {
    colorClass = "border-orange-500 bg-orange-500/10 text-orange-500"
    title = "Device Fingerprint Mismatch"
  } else if (isVpn) {
    colorClass = "border-amber-500 bg-amber-500/10 text-amber-500"
    title = "Active VPN Detected"
  }

  return (
    <div className={`mb-4 flex gap-4 rounded-xl border p-4 shadow-sm fade-in-up ${colorClass}`}>
      {icon}
      <div className="flex-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm opacity-90">{signal.explanation}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {signal.flags.map(flag => (
            <span key={flag} className="rounded-md bg-background/50 px-2 py-1 text-xs font-medium">
              {flag}
            </span>
          ))}
        </div>
      </div>
      <div className="text-right flex flex-col items-end">
        <span className="text-sm font-medium">Action: {signal.action}</span>
        <span className="text-xs opacity-75 mt-1">Score: {signal.riskScore}</span>
      </div>
    </div>
  )
}
