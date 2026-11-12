import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { StatCard } from "../../components/ui/StatCard";
import { ReferralLinkActions } from "../../features/referralLinks/ReferralLinkActions";
import { useAuth } from "../../hooks/useAuth";
import { buildPartnerReferralUrl, getClicksTimeseries, getPartnerOwnOverview } from "../../services/partnerReferrals.service";
import { getPartnerById } from "../../services/partners.service";
import { getLeadsForPartner, getReferralEventCountsAsReferrer } from "../../services/referralEvents.service";

const SERIES_COLOR = "#079992";

export default function PartnerDashboard() {
  const { profile } = useAuth();
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
  const leadsQuery = useQuery({
    queryKey: ["leads", partnerId],
    queryFn: () => getLeadsForPartner(partnerId),
    enabled: Boolean(partnerId),
  });
  // Events where this partner was the REFERRER - i.e. someone they shared
  // a link with went on to view/contact/request another business. They
  // see counts only here, never who the customer was.
  const referralCountsQuery = useQuery({
    queryKey: ["referral-event-counts-as-referrer", partnerId],
    queryFn: () => getReferralEventCountsAsReferrer(partnerId),
    enabled: Boolean(partnerId),
  });

  const isLoading = partnerQuery.isLoading || overviewQuery.isLoading || timeseriesQuery.isLoading;
  const isError = partnerQuery.isError || overviewQuery.isError || timeseriesQuery.isError;
  const leads = leadsQuery.data ?? [];
  const newLeadsCount = leads.filter((l) => l.status === "new").length;
  const chartData = (timeseriesQuery.data ?? []).map((point) => ({
    date: point.bucket,
    clicks: point.count,
  }));

  return (
    <div>
      <h1 className="truncate text-xl font-semibold text-slate-900">Welcome, {profile?.email}</h1>

      {!partnerId && (
        <EmptyState
          title="Approval pending"
          description="An admin still needs to link your account to your business listing before your dashboard is available."
        />
      )}

      {Boolean(partnerId) && isLoading && <LoadingSpinner label="Loading your stats..." />}
      {Boolean(partnerId) && isError && <ErrorState onRetry={() => void overviewQuery.refetch()} />}

      {!isLoading && !isError && overviewQuery.data && partnerQuery.data && (
        <>
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Your Referral Link</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Share this link or QR code with customers.
            </p>
            <div className="mt-3">
              <ReferralLinkActions
                url={buildPartnerReferralUrl(partnerQuery.data.slug)}
                fileName={partnerQuery.data.slug}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Clicks generated" value={overviewQuery.data.clicksGenerated} />
            <StatCard label="Clicks this month" value={overviewQuery.data.clicksThisMonth} />
            <Link to="/partner/leads" className="block">
              <StatCard
                label="New leads"
                value={newLeadsCount}
                hint={`${leads.length} total`}
                accent="secondary"
              />
            </Link>
          </div>

          {referralCountsQuery.data && (
            <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Your Referrals</h2>
              <p className="mt-1 text-xs text-zinc-500">
                What customers did after reaching another business through your link or a group
                you're in.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Profile views" value={referralCountsQuery.data.profileViews} />
                <StatCard label="Contact clicks" value={referralCountsQuery.data.contactClicks} />
                <StatCard
                  label="Service requests"
                  value={referralCountsQuery.data.serviceRequests}
                />
                <StatCard
                  label="Directory visits"
                  value={referralCountsQuery.data.directoryVisits}
                />
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Your clicks over time</h2>
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
