import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { Footer } from "../../components/ui/Footer";
import { GlobeIcon, MapPinIcon, PhoneIcon, SearchIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Logo } from "../../components/ui/Logo";
import { detectDevice, getClientIp, getVisitorId } from "../../lib/visitor";
import { getCategories } from "../../services/categories.service";
import { recordPartnerClick } from "../../services/partnerReferrals.service";
import { getPartnerBySlug, getPartners } from "../../services/partners.service";
import type { Partner } from "../../types";

/**
 * Entry point for a partner's permanent referral link: /ref/:partnerSlug.
 * Records a click attributed to that partner, shows the referrer's own
 * contact details, then a plain list of every other active partner - picking
 * one shows its full details inline at the top (no separate page).
 */
export default function ReferralEntry() {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();
  const recordedRef = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const referrerQuery = useQuery({
    queryKey: ["public-partner", partnerSlug],
    queryFn: () => getPartnerBySlug(partnerSlug ?? ""),
    enabled: Boolean(partnerSlug),
  });

  const othersQuery = useQuery({
    queryKey: ["public-partners-directory"],
    queryFn: () => getPartners({ status: "active" }),
  });

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  useEffect(() => {
    if (recordedRef.current) return;
    if (!referrerQuery.data) return;
    recordedRef.current = true;

    const referrer = referrerQuery.data;

    void (async () => {
      try {
        const ip = await getClientIp();
        await recordPartnerClick({
          partner_id: referrer.id,
          visitor_id: getVisitorId(),
          device: detectDevice(),
          user_agent: navigator.userAgent,
          ip_address: ip,
        });
      } catch (error) {
        console.error("Failed to record referral click", error);
      }
    })();
  }, [referrerQuery.data]);

  if (referrerQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Loading..." />
      </div>
    );
  }

  if (referrerQuery.isError || !referrerQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <EmptyState
          title="We couldn't find that link"
          description="This referral link may be out of date. Double-check the link and try again."
        />
      </div>
    );
  }

  const referrer = referrerQuery.data;
  const categoryNameById = new Map((categoriesQuery.data ?? []).map((c) => [c.id, c.name]));
  const all = (othersQuery.data ?? []).filter((p) => p.id !== referrer.id);

  const searchTerm = search.trim().toLowerCase();
  const others = all.filter((p) => {
    if (!searchTerm) return true;
    const categoryName = categoryNameById.get(p.category_id) ?? "";
    return `${p.company_name} ${categoryName}`.toLowerCase().includes(searchTerm);
  });

  const selected = all.find((p) => p.id === selectedId) ?? null;

  function selectPartner(partner: Partner) {
    setSelectedId(partner.id);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-brand-primary/5 via-white to-white">
      <div ref={topRef} className="flex-1 px-4 py-10 sm:py-14">
        <div className="mx-auto mb-6 flex max-w-2xl justify-center">
          <Logo size="md" />
        </div>

        <div className="animate-fade-in-up mx-auto max-w-2xl text-center">
          <p className="text-sm text-gray-500">
            Shared by{" "}
            {selected ? (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="font-medium text-brand-primary underline decoration-brand-primary/40 underline-offset-2"
              >
                {referrer.company_name}
              </button>
            ) : (
              <span className="font-medium text-gray-900">{referrer.company_name}</span>
            )}
          </p>
        </div>

        <div className="animate-fade-in-up mx-auto mt-6 max-w-2xl">
          <PartnerContactCard
            partner={selected ?? referrer}
            categoryName={categoryNameById.get((selected ?? referrer).category_id)}
          />
        </div>

        <div className="animate-fade-in-up mx-auto mt-10 max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-gray-900">Trusted Partners</h2>
          <p className="mt-1 text-sm text-gray-500">
            Browse the other businesses {referrer.company_name} works with.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or category"
              className="form-input pl-9"
            />
          </div>
        </div>

        <div className="animate-fade-in-up mx-auto mt-4 max-w-2xl" style={{ animationDelay: "0.1s" }}>
          {others.length === 0 ? (
            <EmptyState
              title={searchTerm ? "No partners match your search" : "No other partners to show yet"}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {others.map((partner) => {
                const isSelected = partner.id === selectedId;
                return (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => selectPartner(partner)}
                    className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md ${
                      isSelected
                        ? "border-brand-primary ring-2 ring-brand-primary/30"
                        : "border-gray-200 hover:border-brand-primary/40"
                    }`}
                  >
                    <img
                      src={partner.logo_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full border border-gray-200 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{partner.company_name}</p>
                      <p className="text-xs text-gray-400">
                        {categoryNameById.get(partner.category_id) ?? "Uncategorized"}
                      </p>
                      {partner.description && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                          {partner.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

function PartnerContactCard({
  partner,
  categoryName,
}: {
  partner: Partner;
  categoryName?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-brand-primary/5 sm:p-8">
      <div className="flex items-start gap-4">
        <img
          src={partner.logo_url}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full border border-gray-200 object-cover"
        />
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold text-gray-900">{partner.company_name}</h3>
          {categoryName && (
            <span className="mt-1 inline-block rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary">
              {categoryName}
            </span>
          )}
        </div>
      </div>

      {partner.description && <p className="mt-4 text-gray-600">{partner.description}</p>}

      <div className="mt-5 space-y-2 text-sm text-gray-600">
        {partner.phone && (
          <p className="flex items-center gap-2">
            <PhoneIcon className="h-4 w-4 shrink-0 text-brand-primary" />
            {partner.phone}
          </p>
        )}
        {partner.address && (
          <p className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 shrink-0 text-brand-primary" />
            {partner.address}
          </p>
        )}
        {partner.website && (
          <p className="flex items-center gap-2">
            <GlobeIcon className="h-4 w-4 shrink-0 text-brand-primary" />
            <span className="truncate">{partner.website}</span>
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {partner.phone && (
          <a
            href={`tel:${partner.phone}`}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary"
          >
            Call Now
          </a>
        )}
        {partner.website && (
          <a
            href={partner.website}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            Visit Website
          </a>
        )}
        {partner.address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partner.address)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            Get Directions
          </a>
        )}
      </div>
    </div>
  );
}
