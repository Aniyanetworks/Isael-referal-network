import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { SearchIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Pagination } from "../../components/ui/Pagination";
import { ReferralLinkActions } from "../../features/referralLinks/ReferralLinkActions";
import { buildPartnerReferralUrl } from "../../services/partnerReferrals.service";
import { getCategories } from "../../services/categories.service";
import { getPartners } from "../../services/partners.service";

const PAGE_SIZE = 10;

export default function AdminPartnerLinks() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const partnersQuery = useQuery({ queryKey: ["partners-all"], queryFn: () => getPartners() });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const allPartners = partnersQuery.data ?? [];
  const categoryNameById = new Map((categoriesQuery.data ?? []).map((c) => [c.id, c.name]));

  const searchTerm = search.trim().toLowerCase();
  const partners = allPartners.filter((p) => {
    if (!searchTerm) return true;
    const categoryName = categoryNameById.get(p.category_id) ?? "";
    return `${p.company_name} ${categoryName}`.toLowerCase().includes(searchTerm);
  });

  // Clamp in case the partner count shrinks (e.g. a delete) below the current page.
  const pageCount = Math.max(1, Math.ceil(partners.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagePartners = partners.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function changePage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  const isLoading = partnersQuery.isLoading || categoriesQuery.isLoading;
  const isError = partnersQuery.isError || categoriesQuery.isError;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Partner Links</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Every partner has one permanent link - copy or download the QR and hand it to them.
      </p>

      <div className="relative mt-4 w-full">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by company or category"
          className="form-input w-full pl-9"
        />
      </div>

      <div className="mt-6">
        {isLoading && <LoadingSpinner label="Loading partner links..." />}
        {isError && <ErrorState onRetry={() => void partnersQuery.refetch()} />}
        {!isLoading && !isError && partners.length === 0 && (
          <EmptyState
            title={allPartners.length === 0 ? "No partners yet" : "No partners match your search"}
            description={
              allPartners.length === 0 ? "Add a partner first to generate their link." : undefined
            }
          />
        )}
        {!isLoading && !isError && partners.length > 0 && (
          <div className="space-y-4">
            {pagePartners.map((partner) => (
              <div
                key={partner.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={partner.logo_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 bg-white object-contain"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{partner.company_name}</p>
                    <p className="text-xs text-zinc-400">
                      {categoryNameById.get(partner.category_id) ?? "Uncategorized"}
                    </p>
                  </div>
                </div>
                <ReferralLinkActions
                  url={buildPartnerReferralUrl(partner.slug)}
                  fileName={partner.slug}
                />
              </div>
            ))}
            <div className="pt-2">
              <Pagination
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={partners.length}
                onPageChange={changePage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
