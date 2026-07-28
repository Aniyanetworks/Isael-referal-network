import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { RankedList } from "../../components/ui/RankedList";
import { StatCard } from "../../components/ui/StatCard";
import { getAdminOverview, getRecentClicks } from "../../services/analytics.service";
import { getPartners } from "../../services/partners.service";
import { getLinkCountsByReferrer } from "../../services/referralLinks.service";

export default function AdminDashboard() {
  const overviewQuery = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview() });
  const recentClicksQuery = useQuery({
    queryKey: ["recent-clicks"],
    queryFn: () => getRecentClicks(8),
  });
  const partnersQuery = useQuery({ queryKey: ["partners-all"], queryFn: () => getPartners() });
  const linkCountsQuery = useQuery({
    queryKey: ["link-counts-by-referrer"],
    queryFn: getLinkCountsByReferrer,
  });

  const isLoading =
    overviewQuery.isLoading ||
    recentClicksQuery.isLoading ||
    partnersQuery.isLoading ||
    linkCountsQuery.isLoading;
  const isError =
    overviewQuery.isError ||
    recentClicksQuery.isError ||
    partnersQuery.isError ||
    linkCountsQuery.isError;

  const partners = partnersQuery.data ?? [];
  const partnerById = new Map(partners.map((p) => [p.id, p]));
  const recentClicks = recentClicksQuery.data ?? [];

  const linkCountMap = new Map((linkCountsQuery.data ?? []).map((c) => [c.partner_id, c.count]));
  const linksGeneratedByPartner = partners
    .map((p) => ({ id: p.id, label: p.company_name, value: linkCountMap.get(p.id) ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <Link
          to="/admin/analytics"
          className="text-sm font-medium text-gray-700 underline"
        >
          View full analytics
        </Link>
      </div>

      {isLoading && <LoadingSpinner label="Loading overview..." />}
      {isError && <ErrorState onRetry={() => void overviewQuery.refetch()} />}

      {!isLoading && !isError && overviewQuery.data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total partners" value={overviewQuery.data.totalPartners} />
            <StatCard label="Active partners" value={overviewQuery.data.activePartners} />
            <StatCard label="Total clicks" value={overviewQuery.data.totalClicks} />
            <StatCard label="Unique clicks" value={overviewQuery.data.uniqueClicks} />
            <StatCard label="Referral links" value={overviewQuery.data.totalReferralLinks} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RankedList title="Links generated per partner" rows={linksGeneratedByPartner} />
            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
              {recentClicks.length === 0 ? (
                <EmptyState
                  title="No clicks yet"
                  description="Once a customer clicks a shared referral link, it'll show up here."
                />
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {recentClicks.map((click) => {
                    const referrer = click.referral_links
                      ? partnerById.get(click.referral_links.referrer_partner_id)
                      : undefined;
                    const target = click.referral_links
                      ? partnerById.get(click.referral_links.target_partner_id)
                      : undefined;
                    return (
                      <li key={click.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-gray-700">
                          <span className="font-medium">{referrer?.company_name ?? "Unknown"}</span>
                          {" → "}
                          <span className="font-medium">{target?.company_name ?? "Unknown"}</span>
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(click.created_at).toLocaleString()}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
