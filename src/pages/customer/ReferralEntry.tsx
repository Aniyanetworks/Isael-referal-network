import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { PartnerContactCard } from "../../components/customer/PartnerContactCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Footer } from "../../components/ui/Footer";
import { SearchIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Logo } from "../../components/ui/Logo";
import { detectDevice, getClientIp, getVisitorId } from "../../lib/visitor";
import { getCategories } from "../../services/categories.service";
import { getSharedNetworkPartnerIds } from "../../services/networks.service";
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

  // null = referrer isn't in any network -> show every active partner
  // (pre-networks behavior). An array scopes the list to shared-network
  // partners only.
  const sharedNetworkQuery = useQuery({
    queryKey: ["shared-network-partners", referrerQuery.data?.id],
    queryFn: () => getSharedNetworkPartnerIds(referrerQuery.data!.id),
    enabled: Boolean(referrerQuery.data),
  });

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
  const sharedNetworkIds = sharedNetworkQuery.data;
  const all = (othersQuery.data ?? [])
    .filter((p) => p.id !== referrer.id)
    .filter((p) => !sharedNetworkIds || sharedNetworkIds.includes(p.id));

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
          <p className="text-sm text-zinc-500">
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
              <span className="font-medium text-slate-900">{referrer.company_name}</span>
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
          <h2 className="text-2xl font-bold text-slate-900">Trusted Partners</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Browse the other businesses {referrer.company_name} works with.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
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
                        : "border-zinc-200 hover:border-brand-primary/40"
                    }`}
                  >
                    <img
                      src={partner.logo_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{partner.company_name}</p>
                      <p className="text-xs text-zinc-400">
                        {categoryNameById.get(partner.category_id) ?? "Uncategorized"}
                      </p>
                      {partner.description && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">
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
