import { useEffect } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"

import "./App.css"

import { ConsoleLayout } from "@/layouts/ConsoleLayout"
import { DevicesPage } from "@/pages/DevicesPage"
import { LiveFeedPage } from "@/pages/LiveFeedPage"
import { OnboardingPage } from "@/pages/OnboardingPage"
import { SessionsPage } from "@/pages/SessionsPage"
import { useOnboardingQueue } from "@/hooks/useOnboardingQueue"
import { useWebSocket } from "@/hooks/useWebSocket"

/**
 * Aegis — the bank analyst security console.
 *
 * The app grew from a single page into a routed console; see
 * DEMO-IMPLEMENTATION-PLAN.md §6. Two things are deliberately held at this
 * level rather than inside the pages:
 *
 *   - **The socket connection.** `useWebSocket` accumulates stats, history and
 *     the risk trend in local state as events arrive. Mounting it inside the
 *     feed page would reset all of that every time the analyst navigated to
 *     the onboarding queue and back, and would drop the connection while they
 *     were away.
 *   - **The onboarding queue poll**, because the sidebar badge needs the
 *     pending count on every route, not just `/onboarding`.
 */
export default function App() {
  const feed = useWebSocket()

  // Slower than the queue page's own poll: this one only feeds a badge, so
  // there's no reason for it to be as responsive as the table someone is
  // actually looking at.
  const { data: queue } = useOnboardingQueue("PENDING", 8000)

  useEffect(() => {
    // Remove dark mode for the demo
    document.documentElement.classList.remove("dark")
  }, [])

  return (
    <BrowserRouter>
      <ConsoleLayout connected={feed.connected} pendingCount={queue?.pendingCount ?? 0}>
        <Routes>
          <Route path="/" element={<LiveFeedPage {...feed} />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          {/* Unknown URL falls back to the feed rather than a blank screen. */}
          <Route path="*" element={<LiveFeedPage {...feed} />} />
        </Routes>
      </ConsoleLayout>
    </BrowserRouter>
  )
}
