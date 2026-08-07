import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Check, Eye, ShieldCheck, X, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  decideOnboarding,
  fetchOnboardingDetail,
  verifyOnboarding,
  type FieldName,
  type MatchResult,
  type OnboardingDetail,
  type OnboardingSummary,
} from "@/lib/analystApi"
import { cn } from "@/lib/utils"

const FIELD_LABELS: Record<FieldName, string> = {
  accountNumber: "Account number",
  fullName: "Full name",
  mobile: "Mobile number",
  branch: "Branch",
}

const EMPTY_FORM = { accountNumber: "", fullName: "", mobile: "", branch: "" }

/**
 * Swaps the last word of a name for a visibly different one, for the demo's
 * "Wrong surname" shortcut. Plainly wrong rather than a subtle typo — a
 * mismatch nobody in the room can see isn't worth demonstrating.
 */
function withWrongSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  const decoys = ["Sharma", "Verma", "Reddy", "Bose", "Chopra"]
  const real = parts[parts.length - 1].toLowerCase()
  const decoy = decoys.find((d) => d.toLowerCase() !== real) ?? "Sharma"
  return [...parts.slice(0, -1), decoy].join(" ")
}

/**
 * The four-eyes check, and the reason Scenario A is worth demonstrating.
 *
 * The analyst reads a physical passbook and types what it says. Those values
 * are scored **server-side** against two things at once: the core-banking
 * record, and what the customer submitted. Both have to agree.
 *
 * That's also why the core record shown on the left is masked. If the screen
 * displayed readable values the analyst could copy them into the form, and the
 * check would verify nothing except their typing.
 */
export function OnboardingReviewSheet({
  request,
  onClose,
  onDecided,
}: {
  request: OnboardingSummary | null
  onClose: () => void
  onDecided: () => void
}) {
  const [detail, setDetail] = useState<OnboardingDetail | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [match, setMatch] = useState<MatchResult | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [busy, setBusy] = useState<"verify" | "approve" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const requestId = request?.id ?? null

  // Reset everything when a different request is opened, so a half-typed form
  // from the previous applicant can't leak into this one.
  useEffect(() => {
    setDetail(null)
    setForm(EMPTY_FORM)
    setMatch(null)
    setRejectReason("")
    setError(null)

    if (!requestId) return

    let cancelled = false
    fetchOnboardingDetail(requestId)
      .then((result) => {
        if (cancelled) return
        setDetail(result)
        setMatch(result.request.matchResult)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load request.")
      })

    return () => {
      cancelled = true
    }
  }, [requestId])

  const handleVerify = useCallback(async () => {
    if (!requestId) return
    setBusy("verify")
    setError(null)
    try {
      setMatch(await verifyOnboarding(requestId, form))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.")
    } finally {
      setBusy(null)
    }
  }, [requestId, form])

  const handleDecision = useCallback(
    async (decision: "APPROVE" | "REJECT") => {
      if (!requestId) return
      setBusy(decision === "APPROVE" ? "approve" : "reject")
      setError(null)
      try {
        await decideOnboarding(requestId, decision, rejectReason.trim() || undefined)
        onDecided()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not record the decision.")
      } finally {
        setBusy(null)
      }
    },
    [requestId, rejectReason, onDecided]
  )

  const decided = !!request && request.status !== "PENDING"
  const canApprove = !!match?.allMatch && !decided
  const formComplete = Object.values(form).every((v) => v.trim().length > 0)

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      {/*
        sm:max-w-4xl overrides the base sm:max-w-sm at the same breakpoint so
        tailwind-merge resolves it correctly.
        max-h-[90vh] + overflow-y-auto lets tall content scroll inside
        the dialog rather than overflow the viewport.
      */}
      <DialogContent className="w-full sm:max-w-4xl max-h-[88dvh] flex flex-col overflow-hidden p-0 top-[5%] -translate-y-0 translate-x-[-50%]">
        <DialogHeader className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle className="text-base leading-snug">
            {request?.submittedFullName ?? "Request"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Reference {request?.id.slice(0, 8).toUpperCase()} · submitted{" "}
            {request ? new Date(request.createdAt).toLocaleString("en-IN") : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
        <div className="grid gap-5 p-6 lg:grid-cols-2">
          {/* ── Left: what the customer claimed, and the masked core record ── */}
          <div className="flex flex-col gap-4">
            <Panel title="Submitted by applicant">
              <DetailRow label="Full name" value={request?.submittedFullName} />
              <DetailRow label="Mobile" value={request?.submittedMobile} mono />
              <DetailRow label="Account number" value={request?.accountNumber} mono />
              <DetailRow label="Device" value={request?.deviceLabel ?? "—"} />
            </Panel>

            <Panel
              title="Core banking record"
              hint="Masked on purpose — verify against the physical passbook"
            >
              {detail?.coreRecord ? (
                <>
                  <DetailRow label="Account number" value={detail.coreRecord.accountNumber} mono />
                  <DetailRow label="Name on record" value={detail.coreRecord.fullName} mono />
                  <DetailRow label="Mobile" value={detail.coreRecord.mobile} mono />
                  <DetailRow label="Branch" value={detail.coreRecord.branch} mono />
                  <DetailRow label="IFSC" value={detail.coreRecord.ifsc} mono />
                  {!detail.coreRecord.isActive && (
                    <Callout tone="danger">
                      This passbook is marked <strong>closed</strong> in core banking. It
                      cannot be approved.
                    </Callout>
                  )}
                </>
              ) : detail ? (
                <Callout tone="danger">
                  No core-banking record exists for account{" "}
                  <span className="font-mono">{request?.accountNumber}</span>. The applicant
                  has given an account number the bank does not hold.
                </Callout>
              ) : (
                <p className="text-xs text-muted-foreground">Loading record…</p>
              )}
            </Panel>
          </div>

          {/* ── Right: the verification form ─────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <Panel
              title="Verify against passbook"
              hint="Type what the customer's passbook shows"
            >
              {/*
                Demo autofill. Values come from the core-banking record for
                *this* request, not from constants — a hardcoded applicant
                fills the wrong details the moment you open anyone else's
                request, and the verification then fails for reasons that have
                nothing to do with the demo.

                "From passbook" types the true record. Note that this does not
                mean "this will pass": if the applicant registered under a
                wrong surname, the passbook legitimately disagrees with their
                submission and approval stays locked. That is the reject path
                working, not a bug.
              */}
              {!decided && (
                <div className="mb-1 flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2">
                  <Zap className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Demo fill
                  </span>
                  <button
                    type="button"
                    disabled={!detail?.demoPassbook}
                    onClick={() => {
                      if (!detail?.demoPassbook) return
                      setForm({ ...detail.demoPassbook })
                      setMatch(null)
                    }}
                    className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      detail?.demoPassbook
                        ? "Type the record exactly as core banking holds it"
                        : "No core-banking record exists for this account number"
                    }
                  >
                    From passbook
                  </button>
                  <button
                    type="button"
                    disabled={!detail?.demoPassbook}
                    onClick={() => {
                      if (!detail?.demoPassbook) return
                      setForm({
                        ...detail.demoPassbook,
                        fullName: withWrongSurname(detail.demoPassbook.fullName),
                      })
                      setMatch(null)
                    }}
                    className="rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Mistype the surname, so the name check fails"
                  >
                    Wrong surname
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {(Object.keys(FIELD_LABELS) as FieldName[]).map((field) => (
                  <div key={field} className="flex flex-col gap-1.5">
                    <Label htmlFor={field} className="text-xs">
                      {FIELD_LABELS[field]}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={field}
                        value={form[field]}
                        disabled={decided}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, [field]: e.target.value }))
                          // Any edit invalidates the previous result — otherwise
                          // an analyst could verify, then change a field, and
                          // still see a stale green tick next to Approve.
                          setMatch(null)
                        }}
                        placeholder={
                          field === "accountNumber"
                            ? "14 digits"
                            : field === "mobile"
                              ? "10 digits"
                              : undefined
                        }
                        className={cn(
                          "font-mono text-sm",
                          match && !match.fields[field] && "border-destructive"
                        )}
                      />
                      <FieldMark state={match ? match.fields[field] : null} />
                    </div>
                  </div>
                ))}
              </div>

              {!decided && (
                <Button
                  onClick={handleVerify}
                  disabled={!formComplete || busy !== null}
                  className="mt-4 w-full gap-2"
                  variant="secondary"
                >
                  <Eye className="h-4 w-4" />
                  {busy === "verify" ? "Checking…" : "Check against core banking"}
                </Button>
              )}

              {match && (
                <div className="mt-3">
                  {match.allMatch ? (
                    <Callout tone="success">
                      All fields match core banking and the applicant&rsquo;s submission.
                    </Callout>
                  ) : (
                    <Callout tone="danger">
                      {!match.coreRecordExists
                        ? "No core-banking record for this account number."
                        : !match.accountActive
                          ? "This account is closed in core banking."
                          : "One or more fields do not match. Check the highlighted rows."}
                    </Callout>
                  )}
                </div>
              )}
            </Panel>

            {decided ? (
              <Panel title="Decision">
                <DetailRow label="Outcome" value={request?.status} />
                <DetailRow label="Reviewed by" value={request?.reviewedBy ?? "—"} />
                {request?.rejectionReason && (
                  <DetailRow label="Reason" value={request.rejectionReason} />
                )}
              </Panel>
            ) : (
              <Panel title="Decision">
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => handleDecision("APPROVE")}
                    disabled={!canApprove || busy !== null}
                    className="w-full gap-2"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {busy === "approve" ? "Approving…" : "Approve and activate account"}
                  </Button>
                  {!canApprove && (
                    <p className="-mt-1 text-[11px] text-muted-foreground">
                      Approval unlocks only after every field checks out.
                    </p>
                  )}

                  <Separator />

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reject-reason" className="text-xs">
                      Rejection reason
                    </Label>
                    <Input
                      id="reject-reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Shown to the applicant"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => handleDecision("REJECT")}
                    disabled={!rejectReason.trim() || busy !== null}
                    className="w-full gap-2"
                  >
                    <X className="h-4 w-4" />
                    {busy === "reject" ? "Rejecting…" : "Reject application"}
                  </Button>
                </div>
              </Panel>
            )}

            {error && <Callout tone="danger">{error}</Callout>}
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── small presentational helpers ──────────────────────────────────────── */

function Panel({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </h3>
      {hint && <p className="mt-0.5 mb-3 text-[11px] text-muted-foreground/80">{hint}</p>}
      <div className={cn("flex flex-col gap-2", !hint && "mt-3")}>{children}</div>
    </section>
  )
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 min-w-0">
      <span className="flex-shrink-0 text-xs text-muted-foreground pt-px">{label}</span>
      <span
        className={cn(
          "text-right text-sm font-medium leading-snug break-all",
          mono && "font-mono text-xs tracking-tight"
        )}
      >
        {value ?? "—"}
      </span>
    </div>
  )
}

function FieldMark({ state }: { state: boolean | null }) {
  if (state === null) {
    return <span className="h-5 w-5 flex-shrink-0" aria-hidden />
  }
  return (
    <span
      className={cn(
        "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full",
        state ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"
      )}
      title={state ? "Matches" : "Does not match"}
    >
      {state ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
    </span>
  )
}

function Callout({
  tone,
  children,
}: {
  tone: "success" | "danger"
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-2.5 text-xs",
        tone === "success"
          ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700"
          : "border-destructive/25 bg-destructive/5 text-destructive"
      )}
    >
      {tone === "success" ? (
        <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      )}
      <span className="min-w-0">{children}</span>
    </div>
  )
}
