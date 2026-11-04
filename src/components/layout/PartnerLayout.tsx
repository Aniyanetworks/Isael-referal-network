import { useQuery } from "@tanstack/react-query";
import { DashboardShell, type NavItem } from "./DashboardShell";
import { useAuth } from "../../hooks/useAuth";
import { getNewLeadsCountForPartner } from "../../services/referralEvents.service";

export function PartnerLayout() {
  const { profile } = useAuth();
  const partnerId = profile?.partner_id ?? "";

  const newLeadsQuery = useQuery({
    queryKey: ["new-leads-count", partnerId],
    queryFn: () => getNewLeadsCountForPartner(partnerId),
    enabled: Boolean(partnerId),
  });

  const navItems: NavItem[] = [
    { to: "/partner/dashboard", label: "Dashboard" },
    { to: "/partner/leads", label: "Leads", badge: newLeadsQuery.data },
    { to: "/partner/profile", label: "Profile" },
    { to: "/partner/network", label: "My Groups" },
  ];

  return <DashboardShell navItems={navItems} />;
}
