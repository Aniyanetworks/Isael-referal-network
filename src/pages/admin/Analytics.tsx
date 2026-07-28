import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { RankedList } from "../../components/ui/RankedList";
import { StatCard } from "../../components/ui/StatCard";
import { computeDateRange, type DateRangePreset } from "../../lib/dateRange";
import { getPartners } from "../../services/partners.service";
import { getLinkCountsByReferrer } from "../../services/referralLinks.service";
import {
  getAdminOverview,
  getClicksTimeseries,
  getReferralMatrix,
  getReferrerPartnerClickCounts,
  getTargetPartnerClickCounts,
  type PartnerClickCount,
} from "../../services/analytics.service";

const SERIES_BLUE = "#2a78d6";

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

export default function AdminAnalytics() {
  const [preset, setPreset] = useState<DateRangePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = computeDateRange(preset, customFrom, customTo);
  const rangeKey = [preset, range.from, range.to];

  const partnersQuery = useQuery({ queryKey: ["partners-all"], queryFn: () => getPartners() });
  const overviewQuery = useQuery({
    queryKey: ["admin-overview", ...rangeKey],
    queryFn: () => getAdminOverview(range),
  });
  const timeseriesQuery = useQuery({
    queryKey: ["clicks-timeseries", ...rangeKey],
    queryFn: () => getClicksTimeseries(range, "day"),
  });
  const targetCountsQuery = useQuery({
    queryKey: ["target-click-counts", ...rangeKey],
    queryFn: () => getTargetPartnerClickCounts(range),
  });
  const referrerCountsQuery = useQuery({
    queryKey: ["referrer-click-counts", ...rangeKey],
    queryFn: () => getReferrerPartnerClickCounts(range),
  });
  const matrixQuery = useQuery({
    queryKey: ["referral-matrix", ...rangeKey],
    queryFn: () => getReferralMatrix(range),
  });
  const linkCountsQuery = useQuery({
    queryKey: ["link-counts-by-referrer"],
    queryFn: getLinkCountsByReferrer,
  });

  const isLoading =
    partnersQuery.isLoading ||
    overviewQuery.isLoading ||
    timeseriesQuery.isLoading ||
    targetCountsQuery.isLoading ||
    referrerCountsQuery.isLoading ||
    matrixQuery.isLoading ||
    linkCountsQuery.isLoading;
  const isError =
    partnersQuery.isError ||
    overviewQuery.isError ||
    timeseriesQuery.isError ||
    targetCountsQuery.isError ||
    referrerCountsQuery.isError ||
    matrixQuery.isError ||
    linkCountsQuery.isError;

  const partners = partnersQuery.data ?? [];
  const partnerById = new Map(partners.map((p) => [p.id, p]));

  function mergeWithPartners(counts: PartnerClickCount[]) {
    const countMap = new Map(counts.map((c) => [c.partner_id, c.clicks]));
    return partners.map((p) => ({ id: p.id, label: p.company_name, value: countMap.get(p.id) ?? 0 }));
  }

  const byClicksDesc = mergeWithPartners(targetCountsQuery.data ?? []).sort(
    (a, b) => b.value - a.value
  );
  const topClicked = byClicksDesc.slice(0, 5);
  const lowestClicked = [...byClicksDesc].sort((a, b) => a.value - b.value).slice(0, 5);
  const topReferrers = mergeWithPartners(referrerCountsQuery.data ?? [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const linkCountMap = new Map((linkCountsQuery.data ?? []).map((c) => [c.partner_id, c.count]));
  const linksGeneratedByPartner = partners
    .map((p) => ({ id: p.id, label: p.company_name, value: linkCountMap.get(p.id) ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const matrixRows = (matrixQuery.data ?? []).slice(0, 20);
  const chartData = (timeseriesQuery.data ?? []).map((point) => ({
    date: point.bucket,
    clicks: point.count,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPreset(item.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                preset === item.value
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 text-gray-600"
              }`}
            >
              {item.label}
            </button>
          ))}
          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="form-input"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="form-input"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading && <LoadingSpinner label="Loading analytics..." />}
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

          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900">Daily clicks</h2>
            {chartData.length === 0 ? (
              <EmptyState title="No clicks in this range" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                  <Tooltip cursor={{ fill: "#f0efec" }} />
                  <Bar dataKey="clicks" fill={SERIES_BLUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RankedList title="Top clicked partners" rows={topClicked} />
            <RankedList title="Lowest clicked partners" rows={lowestClicked} />
            <RankedList title="Most active referrers" rows={topReferrers} />
            <RankedList title="Links generated per partner" rows={linksGeneratedByPartner} />
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900">Referral matrix</h2>
            <p className="text-xs text-gray-400">Referrer &rarr; recommended partner &rarr; clicks</p>
            {matrixRows.length === 0 ? (
              <EmptyState title="No referral activity in this range" />
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4 font-medium">Referrer</th>
                      <th className="py-2 pr-4 font-medium">Recommended partner</th>
                      <th className="py-2 pr-4 font-medium">Clicks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {matrixRows.map((row) => (
                      <tr key={`${row.referrer_partner_id}-${row.target_partner_id}`}>
                        <td className="py-2 pr-4 text-gray-700">
                          {partnerById.get(row.referrer_partner_id)?.company_name ?? "Unknown"}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {partnerById.get(row.target_partner_id)?.company_name ?? "Unknown"}
                        </td>
                        <td className="py-2 pr-4 font-medium text-gray-900">{row.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
