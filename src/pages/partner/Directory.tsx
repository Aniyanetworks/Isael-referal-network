import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ReferralLinkActions } from "../../features/referralLinks/ReferralLinkActions";
import { useAuth } from "../../hooks/useAuth";
import { getCategories } from "../../services/categories.service";
import { getPartners } from "../../services/partners.service";
import {
  buildReferralUrl,
  getOrCreateReferralLink,
  getReferralLinks,
  regenerateReferralLink,
} from "../../services/referralLinks.service";

export default function PartnerDirectory() {
  const { profile } = useAuth();
  const ownPartnerId = profile?.partner_id ?? "";
  const queryClient = useQueryClient();

  const partnersQuery = useQuery({
    queryKey: ["directory-partners"],
    queryFn: () => getPartners({ status: "active" }),
  });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const ownLinksQuery = useQuery({
    queryKey: ["referralLinks", "own", ownPartnerId],
    queryFn: () => getReferralLinks({ referrer_partner_id: ownPartnerId }),
    enabled: Boolean(ownPartnerId),
  });

  const generateMutation = useMutation({
    mutationFn: getOrCreateReferralLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referralLinks", "own", ownPartnerId] });
      toast.success("Link generated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateReferralLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referralLinks", "own", ownPartnerId] });
      toast.success("Link regenerated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isLoading = partnersQuery.isLoading || categoriesQuery.isLoading || ownLinksQuery.isLoading;
  const isError = partnersQuery.isError || categoriesQuery.isError || ownLinksQuery.isError;

  const categoryNameById = new Map((categoriesQuery.data ?? []).map((c) => [c.id, c.name]));
  const linkByTargetId = new Map(
    (ownLinksQuery.data ?? []).map((link) => [link.target_partner_id, link])
  );
  const allPartners = partnersQuery.data ?? [];
  const ownPartner = allPartners.find((p) => p.id === ownPartnerId);
  const others = allPartners.filter((p) => p.id !== ownPartnerId);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Referral Directory</h1>
      <p className="mt-1 text-sm text-gray-500">
        Generate a trackable link and QR code for any partner to share with your customers.
      </p>

      <div className="mt-6">
        {isLoading && <LoadingSpinner label="Loading directory..." />}
        {isError && <ErrorState onRetry={() => void partnersQuery.refetch()} />}
        {!isLoading && !isError && others.length === 0 && (
          <EmptyState title="No other partners yet" />
        )}
        {!isLoading && !isError && others.length > 0 && (
          <div className="space-y-4">
            {others.map((partner) => {
              const existingLink = linkByTargetId.get(partner.id);
              return (
                <div
                  key={partner.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{partner.company_name}</p>
                    <p className="text-xs text-gray-400">
                      {categoryNameById.get(partner.category_id) ?? "Uncategorized"}
                    </p>
                  </div>
                  {existingLink ? (
                    <ReferralLinkActions
                      url={buildReferralUrl(partner.slug, ownPartner?.slug ?? "")}
                      fileName={existingLink.slug}
                      regenerating={regenerateMutation.isPending}
                      onRegenerate={() =>
                        regenerateMutation.mutateAsync({
                          referrer_partner_id: ownPartnerId,
                          target_partner_id: partner.id,
                        })
                      }
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={generateMutation.isPending || !ownPartnerId}
                      onClick={() =>
                        generateMutation.mutate({
                          referrer_partner_id: ownPartnerId,
                          target_partner_id: partner.id,
                        })
                      }
                      className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Generate Link
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
