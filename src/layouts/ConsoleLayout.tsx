import type { ReactNode } from "react"
import { useLocation } from "react-router-dom"

import { ROUTE_TITLES, Sidebar } from "@/components/Sidebar"
import { BobIconCaptionPrimary } from "@/components/icons/bob-icon-caption-primary"
import { cn } from "@/lib/utils"

/**
 * The console shell: persistent sidebar, top bar, scrolling content area.
 *
 * This is where the app stopped being one page. The chrome that used to live
 * inside `App.tsx` — the Aegis wordmark, the connection state, the footer —
 * belongs to every route now, so it moved up here and the feed page kept only
 * the widgets.
 *
 * The socket connection itself stays above this component, in `App.tsx`, so
 * that navigating between routes doesn't tear down and re-establish it. All
 * this receives is the resulting `connected` flag for the status pill.
 */
export function ConsoleLayout({
  connected,
  pendingCount,
  children,
}: {
  connected: boolean
  pendingCount: number
  children: ReactNode
}) {
  const { pathname } = useLocation()
  const route = ROUTE_TITLES[pathname] ?? {
    title: "Aegis",
    subtitle: "Fraud intelligence & monitoring",
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar pendingCount={pendingCount} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border bg-background/85 px-6 py-3.5 backdrop-blur">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">{route.title}</h1>
            <p className="truncate text-xs text-muted-foreground">{route.subtitle}</p>
          </div>

          <ConnectionPill connected={connected} />
        </header>

        <main className="min-w-0 flex-1 px-6 py-6">{children}</main>

        <footer className="flex items-center justify-center border-t border-border px-6 py-5 opacity-40 grayscale transition-all hover:opacity-100 hover:grayscale-0">
          <BobIconCaptionPrimary className="h-7 w-auto" />
        </footer>
      </div>
    </div>
  )
}

/**
 * Live/connecting state for the `psb-back` socket feed.
 *
 * Scoped to the risk feed specifically, not the console as a whole — the
 * onboarding and device screens talk to a different backend entirely
 * (psb-app-web over HTTP), and would be perfectly usable with this showing
 * "connecting". Labelling it makes that legible instead of implying the whole
 * console is down.
 */
function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        connected
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600"
          : "border-amber-500/25 bg-amber-500/10 text-amber-600"
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {connected && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex h-1.5 w-1.5 rounded-full",
            connected ? "bg-emerald-500" : "bg-amber-500"
          )}
        />
      </span>
      {connected ? "RISK FEED LIVE" : "CONNECTING"}
    </div>
  )
}
