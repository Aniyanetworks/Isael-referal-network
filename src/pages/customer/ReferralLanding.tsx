import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { detectDevice, getClientIp, getVisitorId } from "../../lib/visitor";
import { recordClick } from "../../services/analytics.service";
import { getPartnerBySlug, getPartners } from "../../services/partners.service";
import { getOrCreateReferralLink } from "../../services/referralLinks.service";

export default function ReferralLanding() {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();
  const [searchParams] = useSearchParams();
  const referrerSlug = searchParams.get("ref");
  const recordedRef = useRef(false);

  const targetQuery = useQuery({
    queryKey: ["public-partner", partnerSlug],
    queryFn: () => getPartnerBySlug(partnerSlug ?? ""),
    enabled: Boolean(partnerSlug),
  });

  const referrerQuery = useQuery({
    queryKey: ["public-partner", referrerSlug],
    queryFn: () => getPartnerBySlug(referrerSlug ?? ""),
    enabled: Boolean(referrerSlug),
  });

  const othersQuery = useQuery({
    queryKey: ["public-partners-directory"],
    queryFn: () => getPartners({ status: "active" }),
  });

  useEffect(() => {
    if (recordedRef.current) return;
    if (!targetQuery.data || !referrerQuery.data) return;
    recordedRef.current = true;

    const target = targetQuery.data;
    const referrer = referrerQuery.data;

    void (async () => {
      try {
        const link = await getOrCreateReferralLink({
          referrer_partner_id: referrer.id,
          target_partner_id: target.id,
        });
        const ip = await getClientIp();
        await recordClick({
          referral_link_id: link.id,
          visitor_id: getVisitorId(),
          device: detectDevice(),
          user_agent: navigator.userAgent,
          ip_address: ip,
        });
      } catch (error) {
        console.error("Failed to record referral click", error);
      }
    })();
  }, [targetQuery.data, referrerQuery.data]);

  if (targetQuery.isLoading) {
    return <LoadingSpinner label="Loading..." />;
  }

  if (targetQuery.isError || !targetQuery.data) {
    return (
      <EmptyState
        title="We couldn't find that business"
        description="This referral link may be out of date. Double-check the link and try again."
      />
    );
  }

  const target = targetQuery.data;
  const others = (othersQuery.data ?? []).filter((p) => p.id !== target.id);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target.address)}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Recommended for you
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{target.company_name}</h1>
        {target.description && <p className="mt-2 text-gray-600">{target.description}</p>}
        <div className="mt-4 space-y-1 text-sm text-gray-600">
          {target.phone && <p>{target.phone}</p>}
          {target.address && <p>{target.address}</p>}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {target.phone && (
            <a
              href={`tel:${target.phone}`}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              Call Now
            </a>
          )}
          {target.website && (
            <a
              href={target.website}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Visit Website
            </a>
          )}
          {target.address && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Get Directions
            </a>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900">Other Trusted Services</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {others.map((partner) => (
              <Link
                key={partner.id}
                to={`/ref/${partner.slug}`}
                className="rounded-lg border border-gray-200 p-4 transition hover:border-gray-400"
              >
                <p className="font-medium text-gray-900">{partner.company_name}</p>
                {partner.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{partner.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
