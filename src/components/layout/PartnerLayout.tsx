import { DashboardShell, type NavItem } from "./DashboardShell";

const NAV_ITEMS: NavItem[] = [
  { to: "/partner/dashboard", label: "Dashboard" },
  { to: "/partner/profile", label: "Profile" },
  { to: "/partner/network", label: "My Groups" },
];

export function PartnerLayout() {
  return <DashboardShell navItems={NAV_ITEMS} />;
}
