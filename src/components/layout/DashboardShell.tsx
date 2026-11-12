import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import {
  getOwnerNotifications,
  respondToNetworkMembership,
  type OwnerNotification,
} from "../../services/networks.service";
import { InstallButton } from "../ui/InstallButton";
import { Logo } from "../ui/Logo";
import { BellIcon, MenuIcon, XIcon } from "../ui/icons";

export interface NavItem {
  to: string;
  label: string;
  /** A small count pill next to the label (e.g. new leads, pending
   * approvals) - omitted or 0 hides it. */
  badge?: number;
}

interface DashboardShellProps {
  navItems: NavItem[];
}

/**
 * Shared shell for the Admin and Partner areas: a static sidebar on desktop,
 * an off-canvas drawer (behind a hamburger button) on mobile - the layouts
 * only differ by which nav items they pass in.
 */
export function DashboardShell({ navItems }: DashboardShellProps) {
  const { profile, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const partnerId = profile?.partner_id ?? null;

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-zinc-200 bg-white transition-transform duration-200 ease-in-out md:static md:z-auto md:w-56 md:shrink-0 md:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <Logo size="lg" />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 md:hidden"
            aria-label="Close menu"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-primary text-white"
                    : "text-zinc-600 hover:bg-brand-primary/10 hover:text-brand-primary"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span>{item.label}</span>
                  {Boolean(item.badge) && (
                    <span
                      className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none ${
                        isActive ? "bg-white/25 text-white" : "bg-red-500 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 md:hidden"
              aria-label="Open menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <p className="hidden text-sm text-zinc-500 sm:block">Referral Partner Directory</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <InstallButton />
            {partnerId && <NotificationBell partnerId={partnerId} />}
            <span className="hidden max-w-[10rem] truncate text-sm text-zinc-600 sm:inline md:max-w-none">
              {profile?.email}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
            >
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * Bell icon for a partner who owns/admins at least one group - shows pending
 * join requests (actionable, approve/reject right here) and recent joins on
 * their open groups (informational only). Only mounted when the signed-in
 * profile has a partner_id, so it never shows for Admin.
 */
function NotificationBell({ partnerId }: { partnerId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["owner-notifications", partnerId],
    queryFn: () => getOwnerNotifications(partnerId),
    enabled: Boolean(partnerId),
    refetchInterval: 60_000,
  });

  const notifications = notificationsQuery.data ?? [];
  const pendingCount = notifications.filter((n) => n.type === "requested").length;

  const respondMutation = useMutation({
    mutationFn: (vars: { networkId: string; targetPartnerId: string; approve: boolean }) =>
      respondToNetworkMembership(vars.networkId, vars.targetPartnerId, vars.approve),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["owner-notifications", partnerId] });
      queryClient.invalidateQueries({ queryKey: ["pending-request-count", partnerId] });
      queryClient.invalidateQueries({ queryKey: ["network-members-detailed", vars.networkId] });
      toast.success(vars.approve ? "Request approved" : "Request rejected");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"
        aria-label="Notifications"
      >
        <BellIcon className="h-5 w-5" />
        {pendingCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="fixed inset-x-3 top-16 z-50 max-h-[80vh] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:max-h-none">
            <div className="border-b border-zinc-100 px-3 py-2">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
            </div>
            <div className="max-h-[calc(80vh-2.5rem)] overflow-y-auto sm:max-h-96">
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-zinc-400">Nothing new</p>
              ) : (
                notifications.map((n) => (
                  <NotificationRow
                    key={`${n.type}-${n.network_id}-${n.partner_id}-${n.at}`}
                    notification={n}
                    pending={
                      respondMutation.isPending &&
                      respondMutation.variables?.networkId === n.network_id &&
                      respondMutation.variables?.targetPartnerId === n.partner_id
                    }
                    onApprove={() =>
                      respondMutation.mutate({
                        networkId: n.network_id,
                        targetPartnerId: n.partner_id,
                        approve: true,
                      })
                    }
                    onReject={() =>
                      respondMutation.mutate({
                        networkId: n.network_id,
                        targetPartnerId: n.partner_id,
                        approve: false,
                      })
                    }
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  pending,
  onApprove,
  onReject,
}: {
  notification: OwnerNotification;
  pending: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="border-b border-zinc-50 px-3 py-2.5 last:border-b-0">
      <p className="text-sm text-slate-700">
        <span className="font-medium">{notification.partner_name}</span>{" "}
        {notification.type === "requested" ? "requested to join" : "joined"}{" "}
        <span className="font-medium">{notification.network_name}</span>
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-400">{formatTimeAgo(notification.at)}</p>
      {notification.type === "requested" && (
        <div className="mt-1.5 flex gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={onApprove}
            className="rounded-md bg-brand-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-secondary disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onReject}
            className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
