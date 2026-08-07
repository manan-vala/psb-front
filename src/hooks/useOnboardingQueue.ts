import { useCallback } from "react"

import { fetchOnboardingQueue, type OnboardingQueue, type RequestStatus } from "@/lib/analystApi"
import { usePolling, type PollingState } from "./usePolling"

/**
 * The analyst's approval queue, refreshed on an interval.
 *
 * Used in two places at once: the `/onboarding` table, and the sidebar's
 * pending-count badge. Both call this rather than sharing state through a
 * context, which means two independent pollers — acceptable here because the
 * queue response is small and the alternative (a provider threaded through the
 * console shell) buys nothing at this size.
 */
export function useOnboardingQueue(
  status?: RequestStatus,
  intervalMs = 3000
): PollingState<OnboardingQueue> {
  const fetcher = useCallback(() => fetchOnboardingQueue(status), [status])
  return usePolling(fetcher, intervalMs)
}
