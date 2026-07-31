import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { BuildingIcon, CheckBadgeIcon, CursorClickIcon, FingerprintIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { RankedList } from "../../components/ui/RankedList";
import { StatCard } from "../../components/ui/StatCard";
import { getCategories } from "../../services/categories.service";
import {
  getAdminOverview,
  getClicksTimeseries,
  getPartnerClickCounts,
  getRecentClicks,
} from "../../services/partnerReferrals.service";
import { getPartners } from "../../services/partners.service";

const SERIES_COLOR = "#079992";

function last7DaysRange() {
  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString() };
}

export default function AdminDashboard() {
  const range = last7DaysRange();

  const overviewQuery = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview() });
  const recentClicksQuery = useQuery({
    queryKey: ["recent-clicks"],
    queryFn: () => getRecentClicks(8),
  });
  const partnersQuery = useQuery({ queryKey: ["partners-all"], queryFn: () => getPartners() });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const clickCountsQuery = useQuery({
    queryKey: ["partner-click-counts"],
    queryFn: () => getPartnerClickCounts(),
  });
  const trendQuery = useQuery({
    queryKey: ["dashboard-clicks-trend"],
    queryFn: () => getClicksTimeseries(range, "day"),
  });

  const isLoading =
    overviewQuery.isLoading ||
    recentClicksQuery.isLoading ||
    partnersQuery.isLoading ||
    categoriesQuery.isLoading ||
    clickCountsQuery.isLoading ||
    trendQuery.isLoading;
  const isError =
    overviewQuery.isError ||
    recentClicksQuery.isError ||
    partnersQuery.isError ||
    categoriesQuery.isError ||
    clickCountsQuery.isError ||
    trendQuery.isError;

  const partners = partnersQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const partnerById = new Map(partners.map((p) => [p.id, p]));
  const recentClicks = recentClicksQuery.data ?? [];

  const clickCountMap = new Map((clickCountsQuery.data ?? []).map((c) => [c.partner_id, c.clicks]));
  const topClickedPartners = partners
    .map((p) => ({ id: p.id, label: p.company_name, value: clickCountMap.get(p.id) ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const partnersByCategory = categories
    .map((category) => ({
      id: category.id,
      label: category.name,
      value: partners.filter((p) => p.category_id === category.id).length,
    }))
    .sort((a, b) => b.value - a.value);

  const trendData = (trendQuery.data ?? []).map((point) => ({
    date: point.bucket,
    clicks: point.count,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Here&apos;s what&apos;s happening with your referral network.
          </p>
        </div>
        <Link
          to="/admin/analytics"
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary"
        >
          View full analytics
        </Link>
      </div>

      {isLoading && <LoadingSpinner label="Loading overview..." />}
      {isError && <ErrorState onRetry={() => void overviewQuery.refetch()} />}

      {!isLoading && !isError && overviewQuery.data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Total partners"
              value={overviewQuery.data.totalPartners}
              icon={<BuildingIcon />}
              accent="primary"
            />
            <StatCard
              label="Active partners"
              value={overviewQuery.data.activePartners}
              icon={<CheckBadgeIcon />}
              accent="secondary"
            />
            <StatCard
              label="Total clicks"
              value={overviewQuery.data.totalClicks}
              icon={<CursorClickIcon />}
              accent="accent"
            />
            <StatCard
              label="Unique clicks"
              value={overviewQuery.data.uniqueClicks}
              icon={<FingerprintIcon />}
              accent="primary"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Clicks - last 7 days</h2>
              {trendData.length === 0 ? (
                <EmptyState title="No clicks in the last 7 days" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardClicksFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e1e0d9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#898781" }}
                      axisLine={{ stroke: "#c3c2b7" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#898781" }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip cursor={{ stroke: "#c3c2b7", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stroke={SERIES_COLOR}
                      strokeWidth={2}
                      fill="url(#dashboardClicksFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <RankedList
              title="Partners by category"
              rows={partnersByCategory}
              emptyLabel="Add a category to see this breakdown."
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RankedList title="Top clicked partners" rows={topClickedPartners} />
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
              {recentClicks.length === 0 ? (
                <EmptyState
                  title="No clicks yet"
                  description="Once a customer clicks a partner's link, it'll show up here."
                />
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {recentClicks.map((click) => (
                    <li key={click.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-gray-700">
                        <span className="font-medium">
                          {partnerById.get(click.partner_id)?.company_name ?? "Unknown"}
                        </span>
                        {"'s link was clicked"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(click.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
