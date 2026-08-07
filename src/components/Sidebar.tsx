import { useState } from "react"
import { NavLink } from "react-router-dom"
import {
  Activity,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  PieChart,
  Radio,
  Smartphone,
  Sparkles,
  UserCheck,
  Users,
  Waypoints,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { BobIconPrimary } from "./icons/bob-icon-primary"

/**
 * Left navigation for the Aegis analyst console.
 *
 * Two kinds of entry, deliberately distinguished:
 *
 *   - **Routed items** navigate. These are the four screens the demo actually
 *     has, and they use NavLink so the active state comes from the URL rather
 *     than local state.
 *   - **`soon` items** are the wider analyst-platform surface from the gap
 *     analysis. They render disabled with a badge instead of being deleted, so
 *     the console reads as a full platform without a single nav entry that
 *     leads somewhere broken — which is the failure mode that actually costs
 *     you in front of judges.
 */

type NavItem = {
  label: string
  icon: typeof LayoutDashboard
  to?: string
  soon?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Monitoring",
    items: [
      { label: "Live Feed", icon: Radio, to: "/" },
      { label: "Sessions", icon: Activity, to: "/sessions" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Onboarding", icon: UserCheck, to: "/onboarding" },
      { label: "Device Trust", icon: Smartphone, to: "/devices" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Executive Summary", icon: LayoutDashboard, soon: true },
      { label: "Customer 360", icon: Users, soon: true },
      { label: "Behaviour Intelligence", icon: Waypoints, soon: true },
      { label: "Product Intelligence", icon: PieChart, soon: true },
      { label: "AI Copilot", icon: Sparkles, soon: true },
    ],
  },
]

// `relative` so the collapsed-state notification dot can anchor to the item.
const ITEM_BASE =
  "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors"

export function Sidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-primary">
          <BobIconPrimary className="h-5 w-auto" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight">Aegis</p>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              Security Portal
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const ItemIcon = item.icon

                if (item.soon) {
                  return (
                    <div
                      key={item.label}
                      title={collapsed ? `${item.label} (coming soon)` : undefined}
                      aria-disabled="true"
                      className={cn(
                        ITEM_BASE,
                        "cursor-not-allowed text-sidebar-foreground/35",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      <ItemIcon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          <span className="flex-shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                            Soon
                          </span>
                        </>
                      )}
                    </div>
                  )
                }

                // Only the onboarding queue carries a count, and only when
                // there's something waiting — a badge showing "0" is noise.
                const badge =
                  item.to === "/onboarding" && pendingCount > 0 ? pendingCount : null

                return (
                  <NavLink
                    key={item.label}
                    to={item.to!}
                    end={item.to === "/"}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        ITEM_BASE,
                        collapsed && "justify-center px-0",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )
                    }
                  >
                    <ItemIcon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {badge !== null &&
                      (collapsed ? (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                      ) : (
                        <span className="flex-shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                          {badge}
                        </span>
                      ))}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        {/*
          Analyst identity is fixed for now — there's no analyst login yet
          (deferred, see the plan's §9). It's shown rather than hidden because
          decisions are attributed to this name in onboarding_requests.reviewed_by,
          so the console shouldn't imply the audit trail is anonymous.
        */}
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2",
            collapsed && "justify-center px-0"
          )}
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            AK
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">A. Kumar</p>
              <p className="truncate text-[10.5px] text-muted-foreground">Fraud Ops</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            ITEM_BASE,
            "mt-0.5 w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4 flex-shrink-0" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

/** Exported for the top bar, which titles the page from the current route. */
export const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Live Feed", subtitle: "Real-time risk assessment stream" },
  "/sessions": { title: "Sessions", subtitle: "Per-session risk timelines" },
  "/onboarding": { title: "Onboarding Approvals", subtitle: "Verify applicants against core banking" },
  "/devices": { title: "Device Trust", subtitle: "Bound devices and verification challenges" },
}
