import { DashboardShell, type NavItem } from "./DashboardShell";

const NAV_ITEMS: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/partners", label: "Partners" },
  { to: "/admin/partner-accounts", label: "Partner Approvals" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/referral-links", label: "Partner Links" },
  { to: "/admin/analytics", label: "Analytics" },
];

export function AdminLayout() {
  return <DashboardShell navItems={NAV_ITEMS} />;
}
