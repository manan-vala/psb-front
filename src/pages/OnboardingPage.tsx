import { useCallback, useState } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OnboardingReviewSheet } from "@/components/onboarding/OnboardingReviewSheet"
import { useOnboardingQueue } from "@/hooks/useOnboardingQueue"
import { resetDemo, type OnboardingSummary, type RequestStatus } from "@/lib/analystApi"
import { cn } from "@/lib/utils"

const FILTERS: { label: string; value: RequestStatus | undefined }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: undefined },
]

/** "25 minutes ago" — the queue's most useful column is how stale a request is. */
function relativeAge(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const styles: Record<RequestStatus, string> = {
    PENDING: "border-amber-500/25 bg-amber-500/10 text-amber-600",
    APPROVED: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600",
    REJECTED: "border-destructive/25 bg-destructive/10 text-destructive",
  }
  return (
    <Badge variant="outline" className={cn("font-semibold", styles[status])}>
      {status}
    </Badge>
  )
}

/**
 * Scenario A — the analyst's approval queue.
 *
 * Polls `/api/analyst/onboarding` every few seconds so a registration
 * happening on the phone appears here without a refresh, which is the moment
 * the demo hinges on. Selecting a row opens the review sheet, where the
 * passbook verification actually happens.
 */
export function OnboardingPage() {
  const [filter, setFilter] = useState<RequestStatus | undefined>("PENDING")
  const [selected, setSelected] = useState<OnboardingSummary | null>(null)
  const [resetting, setResetting] = useState(false)

  const { data, error, loading, refresh } = useOnboardingQueue(filter)

  const handleReset = useCallback(async () => {
    setResetting(true)
    try {
      await resetDemo()
      await refresh()
    } catch {
      /* surfaced by the poller's own error state on the next tick */
    } finally {
      setResetting(false)
    }
  }, [refresh])

  const requests = data?.requests ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f.label}
              {f.value === "PENDING" && (data?.pendingCount ?? 0) > 0 && (
                <span className="ml-1.5 tabular-nums opacity-80">{data?.pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/*
          Reset is here rather than buried in a settings screen because it gets
          used constantly while rehearsing: every run of Scenario A leaves a
          pending user and a queue row behind.
        */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={resetting}
          className="gap-1.5"
        >
          <RotateCcw className={cn("h-3.5 w-3.5", resetting && "animate-spin")} />
          Reset demo data
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-destructive">
              Can&rsquo;t load the approval queue
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[110px]">Reference</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Account number</TableHead>
              <TableHead>Device</TableHead>
              <TableHead className="w-[110px]">Submitted</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && requests.length === 0 && (
              <>
                {[0, 1, 2].map((i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}

            {!loading && requests.length === 0 && !error && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-12 text-center">
                  <p className="text-sm font-medium">Nothing in this queue</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {filter === "PENDING"
                      ? "New registrations from the app will appear here within a few seconds."
                      : "No requests with this status yet."}
                  </p>
                </TableCell>
              </TableRow>
            )}

            {requests.map((request) => (
              <TableRow
                key={request.id}
                onClick={() => setSelected(request)}
                className="cursor-pointer"
              >
                <TableCell className="font-mono text-xs">
                  {request.id.slice(0, 8).toUpperCase()}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{request.submittedFullName}</p>
                  <p className="text-xs text-muted-foreground">{request.submittedMobile}</p>
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">
                  {request.accountNumber}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {request.deviceLabel ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {relativeAge(request.createdAt)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={request.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <OnboardingReviewSheet
        request={selected}
        onClose={() => setSelected(null)}
        onDecided={() => {
          setSelected(null)
          refresh()
        }}
      />
    </div>
  )
}
