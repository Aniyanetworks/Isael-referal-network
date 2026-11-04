import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { PartnerForm } from "../../features/partners/PartnerForm";
import { useAuth } from "../../hooks/useAuth";
import { getCategories } from "../../services/categories.service";
import { getPartnerById, updatePartner } from "../../services/partners.service";
import type { PartnerInput } from "../../types";

export default function PartnerProfile() {
  const { profile } = useAuth();
  const partnerId = profile?.partner_id ?? "";
  const queryClient = useQueryClient();

  const partnerQuery = useQuery({
    queryKey: ["partner", partnerId],
    queryFn: () => getPartnerById(partnerId),
    enabled: Boolean(partnerId),
  });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const updateMutation = useMutation({
    mutationFn: (input: Partial<PartnerInput>) => updatePartner(partnerId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner", partnerId] });
      toast.success("Profile updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (partnerQuery.isLoading || categoriesQuery.isLoading) {
    return <LoadingSpinner label="Loading your profile..." />;
  }
  if (partnerQuery.isError || categoriesQuery.isError) {
    return <ErrorState onRetry={() => void partnerQuery.refetch()} />;
  }
  if (!partnerQuery.data) {
    return (
      <EmptyState
        title="Profile not available"
        description="Your account isn't linked to a business yet."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Your Profile</h1>
      <p className="mt-1 text-sm text-zinc-500">
        This is what customers and other partners see about your business. Update it any time -
        changes go live right away.{" "}
        {partnerQuery.data.status !== "active" && (
          <span className="font-medium text-amber-600">
            Your account is {partnerQuery.data.status}; an admin still controls that status.
          </span>
        )}
      </p>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <PartnerForm
          partner={partnerQuery.data}
          categories={categoriesQuery.data ?? []}
          submitLabel="Save changes"
          submitting={updateMutation.isPending}
          hideStatus
          onSubmit={(input) => updateMutation.mutate(input)}
        />
      </div>
    </div>
  );
}
