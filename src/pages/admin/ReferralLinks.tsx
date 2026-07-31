import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ReferralLinkActions } from "../../features/referralLinks/ReferralLinkActions";
import { buildPartnerReferralUrl } from "../../services/partnerReferrals.service";
import { getCategories } from "../../services/categories.service";
import { getPartners } from "../../services/partners.service";

export default function AdminPartnerLinks() {
  const partnersQuery = useQuery({ queryKey: ["partners-all"], queryFn: () => getPartners() });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const partners = partnersQuery.data ?? [];
  const categoryNameById = new Map((categoriesQuery.data ?? []).map((c) => [c.id, c.name]));

  const isLoading = partnersQuery.isLoading || categoriesQuery.isLoading;
  const isError = partnersQuery.isError || categoriesQuery.isError;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Partner Links</h1>
      <p className="mt-1 text-sm text-gray-500">
        Every partner has one permanent link - copy or download the QR and hand it to them.
      </p>

      <div className="mt-6">
        {isLoading && <LoadingSpinner label="Loading partner links..." />}
        {isError && <ErrorState onRetry={() => void partnersQuery.refetch()} />}
        {!isLoading && !isError && partners.length === 0 && (
          <EmptyState title="No partners yet" description="Add a partner first to generate their link." />
        )}
        {!isLoading && !isError && partners.length > 0 && (
          <div className="space-y-4">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={partner.logo_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full border border-gray-200 object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{partner.company_name}</p>
                    <p className="text-xs text-gray-400">
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
          </div>
        )}
      </div>
    </div>
  );
}
