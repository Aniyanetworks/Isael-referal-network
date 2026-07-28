import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { StatCard } from "../../components/ui/StatCard";
import { useAuth } from "../../hooks/useAuth";
import { getClicksTimeseries, getPartnerOverview } from "../../services/analytics.service";

const SERIES_BLUE = "#2a78d6";

export default function PartnerDashboard() {
  const { profile, signOut } = useAuth();
  const partnerId = profile?.partner_id ?? "";

  const overviewQuery = useQuery({
    queryKey: ["partner-overview", partnerId],
    queryFn: () => getPartnerOverview(partnerId),
    enabled: Boolean(partnerId),
  });
  // RLS scopes this to the logged-in partner's own clicks automatically.
  const timeseriesQuery = useQuery({
    queryKey: ["partner-clicks-timeseries", partnerId],
    queryFn: () => getClicksTimeseries({}, "day"),
    enabled: Boolean(partnerId),
  });

  const isLoading = overviewQuery.isLoading || timeseriesQuery.isLoading;
  const isError = overviewQuery.isError || timeseriesQuery.isError;
  const chartData = (timeseriesQuery.data ?? []).map((point) => ({
    date: point.bucket,
    clicks: point.count,
  }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Welcome, {profile?.email}</h1>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
        >
          Log out
        </button>
      </div>

      {isLoading && <LoadingSpinner label="Loading your stats..." />}
      {isError && <ErrorState onRetry={() => void overviewQuery.refetch()} />}

      {!isLoading && !isError && overviewQuery.data && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Links shared" value={overviewQuery.data.linksShared} />
            <StatCard label="Clicks generated" value={overviewQuery.data.clicksGenerated} />
            <StatCard label="This month" value={overviewQuery.data.clicksThisMonth} />
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900">Your clicks over time</h2>
            {chartData.length === 0 ? (
              <EmptyState
                title="No clicks yet"
                description="Share a referral link from the Directory to start tracking clicks."
              />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
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
        </>
      )}
    </div>
  );
}
