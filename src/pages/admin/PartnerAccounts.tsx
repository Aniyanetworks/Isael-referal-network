import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { getCategories } from "../../services/categories.service";
import { deletePartner, getPartners, updatePartner } from "../../services/partners.service";
import {
  deleteProfile,
  getAllPartnerProfiles,
} from "../../services/profiles.service";
import type { Partner, Profile } from "../../types";

function invalidatePartnerQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["pending-partners"] });
  queryClient.invalidateQueries({ queryKey: ["partners"] });
  queryClient.invalidateQueries({ queryKey: ["partners-all"] });
}

export default function AdminPartnerAccounts() {
  const queryClient = useQueryClient();

  const pendingQuery = useQuery({
    queryKey: ["pending-partners"],
    queryFn: () => getPartners({ status: "pending" }),
  });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const profilesQuery = useQuery({
    queryKey: ["all-partner-profiles"],
    queryFn: getAllPartnerProfiles,
  });
  // const partnersQuery = useQuery({ queryKey: ["partners-all"], queryFn: () => getPartners() });

  // const [selections, setSelections] = useState<Record<string, string>>({});
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [rejectingPartner, setRejectingPartner] = useState<Partner | null>(null);

  const profiles = profilesQuery.data ?? [];
  // const partners = partnersQuery.data ?? [];
  const pendingPartners = pendingQuery.data ?? [];
  const categoryNameById = new Map((categoriesQuery.data ?? []).map((c) => [c.id, c.name]));

  const approveMutation = useMutation({
    mutationFn: (id: string) => updatePartner(id, { status: "active" }),
    onSuccess: () => {
      invalidatePartnerQueries(queryClient);
      toast.success("Partner approved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (partner: Partner) => {
      const matchedProfile = profiles.find((p) => p.partner_id === partner.id);
      await Promise.all([
        deletePartner(partner.id),
        matchedProfile ? deleteProfile(matchedProfile.id) : Promise.resolve(),
      ]);
    },
    onSuccess: () => {
      invalidatePartnerQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["all-partner-profiles"] });
      toast.success("Application rejected");
      setRejectingPartner(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setRejectingPartner(null);
    },
  });

  // const saveMutation = useMutation({
  //   mutationFn: (values: { profileId: string; partnerId: string }) =>
  //     values.partnerId
  //       ? linkProfileToPartner(values.profileId, values.partnerId)
  //       : unlinkProfile(values.profileId),
  //   onSuccess: (_data, values) => {
  //     queryClient.invalidateQueries({ queryKey: ["all-partner-profiles"] });
  //     setSelections((prev) => {
  //       const next = { ...prev };
  //       delete next[values.profileId];
  //       return next;
  //     });
  //     toast.success("Account updated");
  //   },
  //   onError: (error: Error) => toast.error(error.message),
  // });

  const deleteMutation = useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-partner-profiles"] });
      toast.success("Signup removed");
      setDeletingProfile(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setDeletingProfile(null);
    },
  });

  const isPendingLoading = pendingQuery.isLoading || categoriesQuery.isLoading;
  const isPendingError = pendingQuery.isError || categoriesQuery.isError;
  // const isLoading = profilesQuery.isLoading || partnersQuery.isLoading;
  // const isError = profilesQuery.isError || partnersQuery.isError;

  // function selectionFor(profile: Profile): string {
  //   return selections[profile.id] ?? profile.partner_id ?? "";
  // }

  // const columns: DataTableColumn<Profile>[] = [
  //   { header: "Email", accessor: (row) => <span className="font-medium text-slate-900">{row.email}</span> },
  //   {
  //     header: "Signed up",
  //     accessor: (row) => new Date(row.created_at).toLocaleDateString(),
  //   },
  //   {
  //     header: "Account status",
  //     accessor: (row) => (
  //       <span
  //         className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
  //           row.partner_id ? "bg-brand-accent/20 text-green-700" : "bg-amber-100 text-amber-700"
  //         }`}
  //       >
  //         <span className={`h-1.5 w-1.5 rounded-full ${row.partner_id ? "bg-green-600" : "bg-amber-500"}`} />
  //         {row.partner_id ? "Linked" : "Unlinked"}
  //       </span>
  //     ),
  //   },
  //   {
  //     header: "Assign to business",
  //     className: "min-w-[14rem]",
  //     accessor: (row) => (
  //       <SearchableSelect
  //         value={selectionFor(row)}
  //         onChange={(value) => setSelections((prev) => ({ ...prev, [row.id]: value }))}
  //         placeholder="Unlinked"
  //         clearLabel="Unlinked"
  //         searchPlaceholder="Search partners..."
  //         options={partners.map((partner) => ({ value: partner.id, label: partner.company_name }))}
  //       />
  //     ),
  //   },
  //   {
  //     header: "Actions",
  //     className: "text-right",
  //     accessor: (row) => {
  //       const currentSelection = selectionFor(row);
  //       const changed = currentSelection !== (row.partner_id ?? "");
  //       return (
  //         <div className="flex justify-end gap-1">
  //           <button
  //             type="button"
  //             disabled={!changed || saveMutation.isPending}
  //             onClick={() => saveMutation.mutate({ profileId: row.id, partnerId: currentSelection })}
  //             className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-40"
  //           >
  //             Save
  //           </button>
  //           <IconButton
  //             icon={<TrashIcon className="h-4 w-4" />}
  //             label="Delete"
  //             variant="danger"
  //             onClick={() => setDeletingProfile(row)}
  //           />
  //         </div>
  //       );
  //     },
  //   },
  // ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Partner Approvals</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Review the business details someone submitted when they signed up, then approve or reject
        the application.
      </p>

      <div className="mt-6">
        {isPendingLoading && <LoadingSpinner label="Loading applications..." />}
        {isPendingError && <ErrorState onRetry={() => void pendingQuery.refetch()} />}
        {!isPendingLoading && !isPendingError && pendingPartners.length === 0 && (
          <EmptyState
            title="No pending applications"
            description="Once someone signs up at /signup, their business details show up here for review."
          />
        )}
        {!isPendingLoading && !isPendingError && pendingPartners.length > 0 && (
          <div className="space-y-4">
            {pendingPartners.map((partner) => (
              <div
                key={partner.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {partner.logo_url && (
                      <img
                        src={partner.logo_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full border border-zinc-200 object-cover"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{partner.company_name}</p>
                      <p className="text-xs text-zinc-400">
                        {categoryNameById.get(partner.category_id) ?? "Uncategorized"}
                      </p>
                      {partner.description && (
                        <p className="mt-1 max-w-lg text-sm text-zinc-600">{partner.description}</p>
                      )}
                      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-zinc-600 sm:grid-cols-2">
                        <div>
                          <dt className="inline text-zinc-400">Contact: </dt>
                          <dd className="inline">{partner.partner_name}</dd>
                        </div>
                        <div>
                          <dt className="inline text-zinc-400">Email: </dt>
                          <dd className="inline">{partner.email}</dd>
                        </div>
                        <div>
                          <dt className="inline text-zinc-400">Phone: </dt>
                          <dd className="inline">{partner.phone}</dd>
                        </div>
                        <div>
                          <dt className="inline text-zinc-400">Website: </dt>
                          <dd className="inline">{partner.website}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="inline text-zinc-400">Address: </dt>
                          <dd className="inline">{partner.address}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(partner.id)}
                      className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={rejectMutation.isPending}
                      onClick={() => setRejectingPartner(partner)}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* <div className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">All Signups</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Every partner-role login, and which business it's linked to - useful for reassigning or
          removing an account by hand.
        </p>

        <div className="mt-4">
          {isLoading && <LoadingSpinner label="Loading accounts..." />}
          {isError && <ErrorState onRetry={() => void profilesQuery.refetch()} />}
          {!isLoading && !isError && profiles.length === 0 && (
            <EmptyState
              title="No partner signups yet"
              description="Once someone signs up at /signup, they'll show up here."
            />
          )}
          {!isLoading && !isError && profiles.length > 0 && (
            <DataTable columns={columns} data={profiles} rowKey={(row) => row.id} />
          )}
        </div>
      </div> */}

      <ConfirmDialog
        open={Boolean(rejectingPartner)}
        title="Reject application"
        description={`Reject "${rejectingPartner?.company_name}"? This removes the application and the associated login.`}
        confirmLabel="Reject"
        danger
        pending={rejectMutation.isPending}
        onConfirm={() => rejectingPartner && rejectMutation.mutate(rejectingPartner)}
        onCancel={() => setRejectingPartner(null)}
      />

      <ConfirmDialog
        open={Boolean(deletingProfile)}
        title="Remove signup"
        description={`Remove the signup for "${deletingProfile?.email}"? They'll need to sign up again to be considered for approval.`}
        confirmLabel="Remove"
        danger
        pending={deleteMutation.isPending}
        onConfirm={() => deletingProfile && deleteMutation.mutate(deletingProfile.id)}
        onCancel={() => setDeletingProfile(null)}
      />
    </div>
  );
}
