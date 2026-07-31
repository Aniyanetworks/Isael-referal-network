import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { Footer } from "../../components/ui/Footer";
import { GlobeIcon, MapPinIcon, PhoneIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Logo } from "../../components/ui/Logo";
import { detectDevice, getClientIp, getVisitorId } from "../../lib/visitor";
import { recordClick } from "../../services/analytics.service";
import { getCategoryById } from "../../services/categories.service";
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

  const categoryQuery = useQuery({
    queryKey: ["category", targetQuery.data?.category_id],
    queryFn: () => getCategoryById(targetQuery.data!.category_id),
    enabled: Boolean(targetQuery.data?.category_id),
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Loading..." />
      </div>
    );
  }

  if (targetQuery.isError || !targetQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <EmptyState
          title="We couldn't find that business"
          description="This referral link may be out of date. Double-check the link and try again."
        />
      </div>
    );
  }

  const target = targetQuery.data;
  const others = (othersQuery.data ?? []).filter((p) => p.id !== target.id);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target.address)}`;

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-brand-primary/5 via-white to-white">
      <div className="flex-1 px-4 py-10 sm:py-14">
        <div className="mx-auto mb-8 flex max-w-2xl justify-center">
          <Logo size="md" />
        </div>

        <div className="animate-fade-in-up mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-brand-primary/5 sm:p-8">
          <div className="flex items-start gap-4">
            <img
              src={target.logo_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full border border-gray-200 object-cover"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
                Recommended for you
              </p>
              <h1 className="mt-1 truncate text-2xl font-bold text-gray-900">{target.company_name}</h1>
              {categoryQuery.data && (
                <span className="mt-1 inline-block rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary">
                  {categoryQuery.data.name}
                </span>
              )}
            </div>
          </div>

          {target.description && <p className="mt-4 text-gray-600">{target.description}</p>}

          <div className="mt-5 space-y-2 text-sm text-gray-600">
            {target.phone && (
              <p className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 shrink-0 text-brand-primary" />
                {target.phone}
              </p>
            )}
            {target.address && (
              <p className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 shrink-0 text-brand-primary" />
                {target.address}
              </p>
            )}
            {target.website && (
              <p className="flex items-center gap-2">
                <GlobeIcon className="h-4 w-4 shrink-0 text-brand-primary" />
                <span className="truncate">{target.website}</span>
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {target.phone && (
              <a
                href={`tel:${target.phone}`}
                className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary"
              >
                Call Now
              </a>
            )}
            {target.website && (
              <a
                href={target.website}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                Visit Website
              </a>
            )}
            {target.address && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                Get Directions
              </a>
            )}
          </div>
        </div>

        {others.length > 0 && (
          <div className="animate-fade-in-up mx-auto mt-10 max-w-2xl" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-lg font-semibold text-gray-900">Other Trusted Services</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {others.map((partner) => (
                <Link
                  key={partner.id}
                  to={`/ref/${partner.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-primary/40 hover:shadow-md"
                >
                  <img
                    src={partner.logo_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full border border-gray-200 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{partner.company_name}</p>
                    {partner.description && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{partner.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
