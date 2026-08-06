import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Logo } from "../ui/Logo";
import { MenuIcon, XIcon } from "../ui/icons";

export interface NavItem {
  to: string;
  label: string;
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
          <Logo size="sm" />
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
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-primary text-white"
                    : "text-zinc-600 hover:bg-brand-primary/10 hover:text-brand-primary"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
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
