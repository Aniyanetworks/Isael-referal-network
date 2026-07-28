import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ReferralLinkActions } from "../../features/referralLinks/ReferralLinkActions";
import { getPartners } from "../../services/partners.service";
import {
  buildReferralUrl,
  getOrCreateReferralLink,
  getReferralLinks,
  regenerateReferralLink,
} from "../../services/referralLinks.service";

export default function AdminReferralLinks() {
  const queryClient = useQueryClient();
  const [referrerId, setReferrerId] = useState("");
  const [targetId, setTargetId] = useState("");

  const partnersQuery = useQuery({ queryKey: ["partners-all"], queryFn: () => getPartners() });
  const linksQuery = useQuery({ queryKey: ["referralLinks"], queryFn: () => getReferralLinks() });

  const generateMutation = useMutation({
    mutationFn: getOrCreateReferralLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referralLinks"] });
      toast.success("Referral link ready");
      setReferrerId("");
      setTargetId("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateReferralLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referralLinks"] });
      toast.success("Referral link regenerated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleGenerate() {
    if (!referrerId || !targetId) {
      toast.error("Pick a referrer and a target partner");
      return;
    }
    if (referrerId === targetId) {
      toast.error("Referrer and target must be different partners");
      return;
    }
    generateMutation.mutate({ referrer_partner_id: referrerId, target_partner_id: targetId });
  }

  const partners = partnersQuery.data ?? [];
  const partnerById = new Map(partners.map((p) => [p.id, p]));
  const links = linksQuery.data ?? [];

  const isLoading = partnersQuery.isLoading || linksQuery.isLoading;
  const isError = partnersQuery.isError || linksQuery.isError;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Referral Links</h1>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500">Referrer</label>
          <select
            className="form-input mt-1 w-56"
            value={referrerId}
            onChange={(e) => setReferrerId(e.target.value)}
          >
            <option value="">Select partner</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.company_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Recommends</label>
          <select
            className="form-input mt-1 w-56"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">Select partner</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.company_name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Generate Link
        </button>
      </div>

      <div className="mt-6">
        {isLoading && <LoadingSpinner label="Loading referral links..." />}
        {isError && <ErrorState onRetry={() => void linksQuery.refetch()} />}
        {!isLoading && !isError && links.length === 0 && (
          <EmptyState
            title="No referral links yet"
            description="Generate one above to create a trackable link + QR code."
          />
        )}
        {!isLoading && !isError && links.length > 0 && (
          <div className="space-y-4">
            {links.map((link) => {
              const referrer = partnerById.get(link.referrer_partner_id);
              const target = partnerById.get(link.target_partner_id);
              const url = buildReferralUrl(target?.slug ?? "", referrer?.slug ?? "");
              return (
                <div
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {referrer?.company_name ?? "Unknown"} → {target?.company_name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-gray-400">
                      Created {new Date(link.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <ReferralLinkActions
                    url={url}
                    fileName={link.slug}
                    regenerating={regenerateMutation.isPending}
                    onRegenerate={() =>
                      regenerateMutation.mutateAsync({
                        referrer_partner_id: link.referrer_partner_id,
                        target_partner_id: link.target_partner_id,
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
