import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { StatCard } from "../../components/ui/StatCard";
import { ReferralLinkActions } from "../../features/referralLinks/ReferralLinkActions";
import { useAuth } from "../../hooks/useAuth";
import { buildPartnerReferralUrl, getClicksTimeseries, getPartnerOwnOverview } from "../../services/partnerReferrals.service";
import { getPartnerById } from "../../services/partners.service";

const SERIES_COLOR = "#079992";

export default function PartnerDashboard() {
  const { profile, signOut } = useAuth();
  const partnerId = profile?.partner_id ?? "";

  const partnerQuery = useQuery({
    queryKey: ["partner", partnerId],
    queryFn: () => getPartnerById(partnerId),
    enabled: Boolean(partnerId),
  });
  const overviewQuery = useQuery({
    queryKey: ["partner-own-overview", partnerId],
    queryFn: () => getPartnerOwnOverview(partnerId),
    enabled: Boolean(partnerId),
  });
  // RLS scopes this to the logged-in partner's own clicks automatically.
  const timeseriesQuery = useQuery({
    queryKey: ["partner-clicks-timeseries", partnerId],
    queryFn: () => getClicksTimeseries({}, "day"),
    enabled: Boolean(partnerId),
  });

  const isLoading = partnerQuery.isLoading || overviewQuery.isLoading || timeseriesQuery.isLoading;
  const isError = partnerQuery.isError || overviewQuery.isError || timeseriesQuery.isError;
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

      {!isLoading && !isError && overviewQuery.data && partnerQuery.data && (
        <>
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Your Referral Link</h2>
            <p className="mt-1 text-xs text-gray-500">
              Share this link or QR code with customers.
            </p>
            <div className="mt-3">
              <ReferralLinkActions
                url={buildPartnerReferralUrl(partnerQuery.data.slug)}
                fileName={partnerQuery.data.slug}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Clicks generated" value={overviewQuery.data.clicksGenerated} />
            <StatCard label="This month" value={overviewQuery.data.clicksThisMonth} />
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Your clicks over time</h2>
            {chartData.length === 0 ? (
              <EmptyState
                title="No clicks yet"
                description="Share your referral link above to start tracking clicks."
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
                  <Bar dataKey="clicks" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
