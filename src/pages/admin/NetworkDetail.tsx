import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { IconButton } from "../../components/ui/IconButton";
import { SearchIcon, TrashIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Modal } from "../../components/ui/Modal";
import { ReferralLinkActions } from "../../features/referralLinks/ReferralLinkActions";
import { getPartners } from "../../services/partners.service";
import {
  addPartnerToNetwork,
  buildNetworkUrl,
  getNetworkById,
  getNetworkMembers,
  removePartnerFromNetwork,
} from "../../services/networks.service";

export default function AdminNetworkDetail() {
  const { networkId } = useParams<{ networkId: string }>();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const networkQuery = useQuery({
    queryKey: ["network", networkId],
    queryFn: () => getNetworkById(networkId ?? ""),
    enabled: Boolean(networkId),
  });
  const membersQuery = useQuery({
    queryKey: ["network-members", networkId],
    queryFn: () => getNetworkMembers(networkId ?? ""),
    enabled: Boolean(networkId),
  });

  function invalidateMembers() {
    queryClient.invalidateQueries({ queryKey: ["network-members", networkId] });
    queryClient.invalidateQueries({ queryKey: ["network-member-counts"] });
  }

  const removeMutation = useMutation({
    mutationFn: (partnerId: string) => removePartnerFromNetwork(networkId ?? "", partnerId),
    onSuccess: () => {
      invalidateMembers();
      setRemovingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setRemovingId(null);
    },
  });

  if (networkQuery.isLoading) {
    return <LoadingSpinner label="Loading network..." />;
  }

  if (networkQuery.isError || !networkQuery.data) {
    return <ErrorState onRetry={() => void networkQuery.refetch()} />;
  }

  const network = networkQuery.data;
  const members = membersQuery.data ?? [];
  const memberIds = new Set(members.map((m) => m.id));

  return (
    <div>
      <Link to="/admin/networks" className="text-sm text-zinc-500 hover:text-brand-primary">
        &larr; Back to Networks
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{network.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {members.length} member{members.length === 1 ? "" : "s"}
          </p>
        </div>
        <ReferralLinkActions url={buildNetworkUrl(network.slug)} fileName={network.slug} />
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Members</h2>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-secondary"
          >
            Add Member
          </button>
        </div>

        <div className="mt-3">
          {membersQuery.isLoading && <LoadingSpinner label="Loading members..." />}
          {membersQuery.isError && <ErrorState onRetry={() => void membersQuery.refetch()} />}
          {!membersQuery.isLoading && !membersQuery.isError && members.length === 0 && (
            <EmptyState
              title="No members yet"
              description="Add partners to this network with the button above."
            />
          )}
          {!membersQuery.isLoading && !membersQuery.isError && members.length > 0 && (
            <ul className="max-w-lg space-y-1 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
              {members.map((partner) => (
                <li
                  key={partner.id}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-zinc-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={partner.logo_url}
                      alt=""
                      className="h-6 w-6 shrink-0 rounded-full border border-zinc-200 object-cover"
                    />
                    <span className="truncate text-slate-700">{partner.company_name}</span>
                  </div>
                  <IconButton
                    icon={<TrashIcon className="h-4 w-4" />}
                    label="Remove from network"
                    variant="danger"
                    disabled={removeMutation.isPending && removingId === partner.id}
                    onClick={() => {
                      setRemovingId(partner.id);
                      removeMutation.mutate(partner.id);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {addOpen && (
        <AddMemberModal
          networkId={networkId ?? ""}
          existingMemberIds={memberIds}
          onClose={() => {
            setAddOpen(false);
            invalidateMembers();
          }}
        />
      )}
    </div>
  );
}

function AddMemberModal({
  networkId,
  existingMemberIds,
  onClose,
}: {
  networkId: string;
  existingMemberIds: Set<string>;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const partnersQuery = useQuery({ queryKey: ["partners-all"], queryFn: () => getPartners() });

  const addMutation = useMutation({
    mutationFn: (partnerId: string) => addPartnerToNetwork(networkId, partnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-members", networkId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const searchTerm = search.trim().toLowerCase();
  const available = (partnersQuery.data ?? [])
    .filter((p) => !existingMemberIds.has(p.id))
    .filter((p) => !searchTerm || p.company_name.toLowerCase().includes(searchTerm));

  return (
    <Modal open onClose={onClose} title="Add Member">
      <div className="relative mb-3">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search partners..."
          className="form-input pl-9"
          autoFocus
        />
      </div>

      {partnersQuery.isLoading && <LoadingSpinner label="Loading partners..." />}
      {partnersQuery.isError && <ErrorState onRetry={() => void partnersQuery.refetch()} />}
      {!partnersQuery.isLoading && !partnersQuery.isError && available.length === 0 && (
        <EmptyState
          title={searchTerm ? "No partners match your search" : "Every partner is already in this network"}
        />
      )}
      {!partnersQuery.isLoading && !partnersQuery.isError && available.length > 0 && (
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {available.map((partner) => (
            <li key={partner.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-zinc-50">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={partner.logo_url}
                  alt=""
                  className="h-6 w-6 shrink-0 rounded-full border border-zinc-200 object-cover"
                />
                <span className="truncate text-slate-700">{partner.company_name}</span>
              </div>
              <button
                type="button"
                disabled={addMutation.isPending}
                onClick={() => addMutation.mutate(partner.id)}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-40"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
