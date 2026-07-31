import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
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

  const columns: DataTableColumn<Profile>[] = [
    { header: "Email", accessor: (row) => <span className="font-medium text-gray-900">{row.email}</span> },
    {
      header: "Signed up",
      accessor: (row) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      header: "Status",
      accessor: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.partner_id ? "bg-brand-accent/20 text-green-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${row.partner_id ? "bg-green-600" : "bg-amber-500"}`} />
          {row.partner_id ? "Linked" : "Pending"}
        </span>
      ),
    },
    {
      header: "Linked business",
      className: "min-w-[14rem]",
      accessor: (row) => (
        <SearchableSelect
          value={selectionFor(row)}
          onChange={(value) => setSelections((prev) => ({ ...prev, [row.id]: value }))}
          placeholder="Unlinked"
          clearLabel="Unlinked"
          searchPlaceholder="Search partners..."
          options={partners.map((partner) => ({ value: partner.id, label: partner.company_name }))}
        />
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      accessor: (row) => {
        const currentSelection = selectionFor(row);
        const changed = currentSelection !== (row.partner_id ?? "");
        return (
          <button
            type="button"
            disabled={!changed || saveMutation.isPending}
            onClick={() => saveMutation.mutate({ profileId: row.id, partnerId: currentSelection })}
            className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-40"
          >
            Save
          </button>
        );
      },
    },
  ];

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
          <DataTable columns={columns} data={profiles} rowKey={(row) => row.id} />
        )}
      </div>
    </div>
  );
}
