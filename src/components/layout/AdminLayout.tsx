import { useQuery } from "@tanstack/react-query";
import { DashboardShell, type NavItem } from "./DashboardShell";
import { getPendingPartnersCount } from "../../services/partners.service";

export function AdminLayout() {
  const pendingQuery = useQuery({
    queryKey: ["pending-partners-count"],
    queryFn: getPendingPartnersCount,
  });

  const navItems: NavItem[] = [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/partners", label: "Partners" },
    { to: "/admin/partner-accounts", label: "Partner Approvals", badge: pendingQuery.data },
    { to: "/admin/categories", label: "Categories" },
    { to: "/admin/networks", label: "Networks" },
    { to: "/admin/referral-links", label: "Partner Links" },
    { to: "/admin/leads", label: "Leads" },
    { to: "/admin/analytics", label: "Analytics" },
  ];

  return <DashboardShell navItems={navItems} />;
}
