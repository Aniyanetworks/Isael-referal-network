import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { PartnerContactCard } from "../../components/customer/PartnerContactCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Footer } from "../../components/ui/Footer";
import { SearchIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Logo } from "../../components/ui/Logo";
import { getCategories } from "../../services/categories.service";
import { getNetworkBySlug, getNetworkMembers } from "../../services/networks.service";

/**
 * Entry point for a network's shareable link: /network/:networkSlug. Shows
 * every partner in that network - not tied to any single referrer, unlike
 * /ref/:partnerSlug. No click is recorded here (network-level analytics
 * aren't tracked yet).
 */
export default function NetworkEntry() {
  const { networkSlug } = useParams<{ networkSlug: string }>();
  const topRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const networkQuery = useQuery({
    queryKey: ["public-network", networkSlug],
    queryFn: () => getNetworkBySlug(networkSlug ?? ""),
    enabled: Boolean(networkSlug),
  });

  const membersQuery = useQuery({
    queryKey: ["public-network-members", networkQuery.data?.id],
    queryFn: () => getNetworkMembers(networkQuery.data!.id),
    enabled: Boolean(networkQuery.data),
  });

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  useEffect(() => {
    if (selectedId) return;
    const first = membersQuery.data?.[0];
    if (first) setSelectedId(first.id);
  }, [membersQuery.data, selectedId]);

  if (networkQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Loading..." />
      </div>
    );
  }

  if (networkQuery.isError || !networkQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <EmptyState
          title="We couldn't find that network"
          description="This link may be out of date. Double-check the link and try again."
        />
      </div>
    );
  }

  const network = networkQuery.data;
  const categoryNameById = new Map((categoriesQuery.data ?? []).map((c) => [c.id, c.name]));
  const members = membersQuery.data ?? [];
  const selected = members.find((p) => p.id === selectedId) ?? null;

  const searchTerm = search.trim().toLowerCase();
  const others = members
    .filter((p) => p.id !== selectedId)
    .filter((p) => {
      if (!searchTerm) return true;
      const categoryName = categoryNameById.get(p.category_id) ?? "";
      return `${p.company_name} ${categoryName}`.toLowerCase().includes(searchTerm);
    });

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-brand-primary/5 via-white to-white">
      <div ref={topRef} className="flex-1 px-4 py-10 sm:py-14">
        <div className="mx-auto mb-6 flex max-w-2xl justify-center">
          <Logo size="md" />
        </div>

        <div className="animate-fade-in-up mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-bold text-slate-900">{network.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">Trusted businesses in this network.</p>
        </div>

        {selected && (
          <div className="animate-fade-in-up mx-auto mt-6 max-w-2xl">
            <PartnerContactCard
              partner={selected}
              categoryName={categoryNameById.get(selected.category_id)}
            />
          </div>
        )}

        {members.length === 0 ? (
          <div className="mx-auto mt-8 max-w-2xl">
            <EmptyState
              title="No members yet"
              description="This network doesn't have any partners in it yet."
            />
          </div>
        ) : (
          <>
            {others.length > 0 && (
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
            )}

            <div className="animate-fade-in-up mx-auto mt-4 max-w-2xl" style={{ animationDelay: "0.1s" }}>
              {others.length === 0 && searchTerm && (
                <EmptyState title="No partners match your search" />
              )}
              {others.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {others.map((partner) => (
                    <button
                      key={partner.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(partner.id);
                        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-all hover:border-brand-primary/40 hover:shadow-md"
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
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
