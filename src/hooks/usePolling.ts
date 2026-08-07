import { useCallback, useEffect, useRef, useState } from "react"

export interface PollingState<T> {
  data: T | null
  error: string | null
  /** True only for the first load, so a refresh doesn't blank the table. */
  loading: boolean
  /** Manual refresh — used after an action that changes the data. */
  refresh: () => Promise<void>
}

/**
 * Generic interval poller.
 *
 * The analyst API is polled rather than pushed: `psb-back` owns the socket
 * connection and isn't editable, so the new Neon-backed endpoints had to work
 * over plain HTTP. See DEMO-IMPLEMENTATION-PLAN.md §0.
 *
 * Three details that matter more than the interval itself:
 *
 *   - **Pauses when the tab is hidden.** A demo laptop with the console open
 *     on a second screen would otherwise keep hitting the API all day.
 *     Polling resumes with an immediate fetch on becoming visible, so coming
 *     back to the tab never shows stale data while waiting out the interval.
 *   - **`loading` is first-load only.** Flipping it on every tick would make
 *     the queue flash a skeleton every few seconds.
 *   - **In-flight requests are dropped on unmount** via a generation counter,
 *     so a slow response can't call setState after the component is gone or
 *     overwrite a newer response that landed first.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs = 3000,
  enabled = true
): PollingState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Kept in a ref so changing the fetcher identity doesn't restart the timer.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const generation = useRef(0)

  const run = useCallback(async () => {
    const current = ++generation.current
    try {
      const result = await fetcherRef.current()
      if (generation.current !== current) return
      setData(result)
      setError(null)
    } catch (err) {
      if (generation.current !== current) return
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      if (generation.current === current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    let timer: number | undefined

    const start = () => {
      stop()
      timer = window.setInterval(run, intervalMs)
    }
    const stop = () => {
      if (timer !== undefined) {
        window.clearInterval(timer)
        timer = undefined
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        run()
        start()
      }
    }

    run()
    if (!document.hidden) start()
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
      // Invalidate anything still in flight.
      generation.current++
    }
  }, [run, intervalMs, enabled])

  return { data, error, loading, refresh: run }
}
