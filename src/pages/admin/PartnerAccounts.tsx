import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { getPartners } from "../../services/partners.service";
import {
  getAllPartnerProfiles,
  linkProfileToPartner,
  unlinkProfile,
} from "../../services/profiles.service";
import type { Profile } from "../../types";

export default function AdminPartnerAccounts() {
  const queryClient = useQueryClient();
  const profilesQuery = useQuery({
    queryKey: ["all-partner-profiles"],
    queryFn: getAllPartnerProfiles,
  });
  const partnersQuery = useQuery({ queryKey: ["partners-all"], queryFn: () => getPartners() });

  const [selections, setSelections] = useState<Record<string, string>>({});

  const saveMutation = useMutation({
    mutationFn: (values: { profileId: string; partnerId: string }) =>
      values.partnerId
        ? linkProfileToPartner(values.profileId, values.partnerId)
        : unlinkProfile(values.profileId),
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ["all-partner-profiles"] });
      setSelections((prev) => {
        const next = { ...prev };
        delete next[values.profileId];
        return next;
      });
      toast.success("Account updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isLoading = profilesQuery.isLoading || partnersQuery.isLoading;
  const isError = profilesQuery.isError || partnersQuery.isError;
  const partners = partnersQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];

  function selectionFor(profile: Profile): string {
    return selections[profile.id] ?? profile.partner_id ?? "";
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Partner Accounts</h1>
      <p className="mt-1 text-sm text-gray-500">
        Everyone who has signed up as a partner, and which business listing they're linked to.
        Reassign a login to a different business any time.
      </p>

      <div className="mt-6">
        {isLoading && <LoadingSpinner label="Loading accounts..." />}
        {isError && <ErrorState onRetry={() => void profilesQuery.refetch()} />}
        {!isLoading && !isError && profiles.length === 0 && (
          <EmptyState
            title="No partner signups yet"
            description="Once someone signs up at /signup, they'll show up here to be linked to a business."
          />
        )}
        {!isLoading && !isError && profiles.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Signed up</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Linked business</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {profiles.map((profile) => {
                  const currentSelection = selectionFor(profile);
                  const changed = currentSelection !== (profile.partner_id ?? "");
                  const isLinked = Boolean(profile.partner_id);
                  return (
                    <tr key={profile.id}>
                      <td className="px-4 py-3 text-gray-700">{profile.email}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            isLinked
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isLinked ? "Linked" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="form-input"
                          value={currentSelection}
                          onChange={(e) =>
                            setSelections((prev) => ({ ...prev, [profile.id]: e.target.value }))
                          }
                        >
                          <option value="">Unlinked</option>
                          {partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.company_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={!changed || saveMutation.isPending}
                          onClick={() =>
                            saveMutation.mutate({
                              profileId: profile.id,
                              partnerId: currentSelection,
                            })
                          }
                          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
