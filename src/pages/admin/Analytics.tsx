import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import {
  BuildingIcon,
  CheckBadgeIcon,
  CursorClickIcon,
  FingerprintIcon,
} from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { RankedList } from "../../components/ui/RankedList";
import { StatCard } from "../../components/ui/StatCard";
import { computeDateRange, type DateRangePreset } from "../../lib/dateRange";
import { getPartners } from "../../services/partners.service";
import {
  getAdminOverview,
  getClicksTimeseries,
  getPartnerClickCounts,
  type PartnerClickCount,
} from "../../services/partnerReferrals.service";

const SERIES_COLOR = "#079992";

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

  // Memoized so the computed range - and therefore every query key below -
  // stays stable across re-renders that aren't an actual preset/date change.
  const range = useMemo(
    () => computeDateRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );
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
  const clickCountsQuery = useQuery({
    queryKey: ["partner-click-counts", ...rangeKey],
    queryFn: () => getPartnerClickCounts(range),
  });

  const isLoading =
    partnersQuery.isLoading || overviewQuery.isLoading || timeseriesQuery.isLoading || clickCountsQuery.isLoading;
  const isError =
    partnersQuery.isError || overviewQuery.isError || timeseriesQuery.isError || clickCountsQuery.isError;

  const partners = partnersQuery.data ?? [];

  function mergeWithPartners(counts: PartnerClickCount[]) {
    const countMap = new Map(counts.map((c) => [c.partner_id, c.clicks]));
    return partners.map((p) => ({ id: p.id, label: p.company_name, value: countMap.get(p.id) ?? 0 }));
  }

  const byClicksDesc = mergeWithPartners(clickCountsQuery.data ?? []).sort((a, b) => b.value - a.value);
  const topClicked = byClicksDesc.slice(0, 5);
  const lowestClicked = [...byClicksDesc].sort((a, b) => a.value - b.value).slice(0, 5);

  const chartData = (timeseriesQuery.data ?? []).map((point) => ({
    date: point.bucket,
    clicks: point.count,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPreset(item.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                preset === item.value
                  ? "bg-brand-primary text-white"
                  : "border border-zinc-300 text-zinc-600 hover:border-brand-primary hover:text-brand-primary"
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
              <span className="text-xs text-zinc-400">to</span>
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

          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Daily clicks</h2>
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
                  <Bar dataKey="clicks" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RankedList title="Top clicked partners" rows={topClicked} />
            <RankedList title="Lowest clicked partners" rows={lowestClicked} />
          </div>
        </>
      )}
    </div>
  );
}
