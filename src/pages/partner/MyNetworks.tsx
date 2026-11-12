import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { IconButton } from "../../components/ui/IconButton";
import { Modal } from "../../components/ui/Modal";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { TrashIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { GroupForm, type GroupFormValues } from "../../features/networks/GroupForm";
import { ReferralLinkActions } from "../../features/referralLinks/ReferralLinkActions";
import { useAuth } from "../../hooks/useAuth";
import { getPartners } from "../../services/partners.service";
import { getReferralEventCountsForNetwork } from "../../services/referralEvents.service";
import {
  buildNetworkUrl,
  createGroup,
  getMembershipsForPartner,
  getNetworkMembershipsDetailed,
  getNetworks,
  inviteToNetwork,
  joinOpenNetwork,
  removeNetworkMemberSelfService,
  requestToJoinNetwork,
  respondToNetworkMembership,
  setNetworkMemberRole,
  updateNetwork,
  type NetworkMembershipWithNetwork,
} from "../../services/networks.service";
import type { Network, NetworkMembershipRole, Partner } from "../../types";

const JOIN_MODE_LABEL: Record<Network["join_mode"], string> = {
  invite_only: "Invite only",
  request_to_join: "Request to join",
  open: "Open",
};

export default function PartnerMyNetworks() {
  const { profile } = useAuth();
  const partnerId = profile?.partner_id ?? "";
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const membershipsQuery = useQuery({
    queryKey: ["memberships-for-partner", partnerId],
    queryFn: () => getMembershipsForPartner(partnerId),
    enabled: Boolean(partnerId),
  });
  const allNetworksQuery = useQuery({ queryKey: ["networks-all"], queryFn: getNetworks });
  // So "Ask the owner to invite you" can show who that actually is.
  const partnersQuery = useQuery({ queryKey: ["partners-all"], queryFn: () => getPartners() });
  const partnerById = new Map((partnersQuery.data ?? []).map((p) => [p.id, p]));

  function invalidateMemberships() {
    queryClient.invalidateQueries({ queryKey: ["memberships-for-partner", partnerId] });
  }

  const createMutation = useMutation({
    mutationFn: (values: GroupFormValues) => createGroup(values),
    onSuccess: () => {
      invalidateMemberships();
      queryClient.invalidateQueries({ queryKey: ["networks-all"] });
      toast.success("Group created");
      setCreateOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const respondMutation = useMutation({
    mutationFn: (vars: { networkId: string; approve: boolean }) =>
      respondToNetworkMembership(vars.networkId, partnerId, vars.approve),
    onSuccess: (_, vars) => {
      invalidateMemberships();
      toast.success(vars.approve ? "Invitation accepted" : "Invitation declined");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const joinMutation = useMutation({
    mutationFn: (networkId: string) => joinOpenNetwork(networkId),
    onSuccess: () => {
      invalidateMemberships();
      toast.success("Joined group");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const requestMutation = useMutation({
    mutationFn: (networkId: string) => requestToJoinNetwork(networkId),
    onSuccess: () => {
      invalidateMemberships();
      toast.success("Request sent - the group owner will review it");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!partnerId) {
    return (
      <EmptyState
        title="No business linked"
        description="Your account isn't linked to a business yet."
      />
    );
  }
  if (membershipsQuery.isLoading || allNetworksQuery.isLoading) {
    return <LoadingSpinner label="Loading your groups..." />;
  }
  if (membershipsQuery.isError || allNetworksQuery.isError) {
    return <ErrorState onRetry={() => void membershipsQuery.refetch()} />;
  }

  const memberships = membershipsQuery.data ?? [];
  const active = memberships.filter((m) => m.status === "active");
  const invited = memberships.filter((m) => m.status === "invited");
  const requested = memberships.filter((m) => m.status === "requested");
  const myNetworkIds = new Set(memberships.map((m) => m.network_id));
  const discoverable = (allNetworksQuery.data ?? []).filter((n) => !myNetworkIds.has(n.id));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My Groups</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create and run your own referral groups - invite members, approve requests, and share
            each group's link and QR code.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary"
        >
          Create Group
        </button>
      </div>

      {invited.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">Invitations</h2>
          <div className="mt-2 space-y-2">
            {invited.map((m) => (
              <div
                key={m.network_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
              >
                <p className="text-sm text-slate-700">
                  You've been invited to <span className="font-medium">{m.networks.name}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={respondMutation.isPending}
                    onClick={() => respondMutation.mutate({ networkId: m.network_id, approve: true })}
                    className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-secondary disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={respondMutation.isPending}
                    onClick={() => respondMutation.mutate({ networkId: m.network_id, approve: false })}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-900">Your Groups</h2>
        <div className="mt-2">
          {active.length === 0 ? (
            <EmptyState
              title="Not in a group yet"
              description="Create your own group, or join one from Discover Groups below."
            />
          ) : (
            <div className="space-y-4">
              {active.map((m) => (
                <GroupCard key={m.network_id} membership={m} ownPartnerId={partnerId} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Discover Groups</h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          Other groups on the platform. Join instantly, send a request, or wait to be invited,
          depending on how each group is set up.
        </p>
        <div className="mt-2">
          {requested.length === 0 && discoverable.length === 0 ? (
            <EmptyState title="No other groups yet" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {discoverable.map((network) => (
                <DiscoverCard
                  key={network.id}
                  network={network}
                  owner={network.owner_partner_id ? partnerById.get(network.owner_partner_id) : undefined}
                  requested={requested.some((r) => r.network_id === network.id)}
                  onJoin={() => joinMutation.mutate(network.id)}
                  onRequest={() => requestMutation.mutate(network.id)}
                  joining={joinMutation.isPending}
                  requesting={requestMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Group">
        <GroupForm
          submitLabel="Create Group"
          submitting={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </div>
  );
}

function DiscoverCard({
  network,
  owner,
  requested,
  onJoin,
  onRequest,
  joining,
  requesting,
}: {
  network: Network;
  owner: Partner | undefined;
  requested: boolean;
  onJoin: () => void;
  onRequest: () => void;
  joining: boolean;
  requesting: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{network.name}</p>
          {network.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{network.description}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
          {JOIN_MODE_LABEL[network.join_mode]}
        </span>
      </div>
      <div className="mt-3">
        {network.join_mode === "open" && (
          <button
            type="button"
            disabled={joining}
            onClick={onJoin}
            className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-secondary disabled:opacity-50"
          >
            {joining ? "Joining..." : "Join"}
          </button>
        )}
        {network.join_mode === "request_to_join" &&
          (requested ? (
            <span className="text-xs text-zinc-400">Request sent - awaiting approval</span>
          ) : (
            <button
              type="button"
              disabled={requesting}
              onClick={onRequest}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-primary hover:text-brand-primary disabled:opacity-50"
            >
              {requesting ? "Requesting..." : "Request to Join"}
            </button>
          ))}
        {network.join_mode === "invite_only" &&
          (owner ? (
            <Link
              to={`/business/${owner.slug}`}
              className="block text-xs text-zinc-500 hover:text-brand-primary"
            >
              Ask the owner to invite you -{" "}
              <span className="font-medium text-brand-primary underline">
                {owner.partner_name || owner.company_name}
              </span>
              {owner.phone && <span className="text-zinc-400"> ({owner.phone})</span>}
            </Link>
          ) : (
            <span className="text-xs text-zinc-400">Ask the owner to invite you</span>
          ))}
      </div>
    </div>
  );
}

function GroupCard({
  membership,
  ownPartnerId,
}: {
  membership: NetworkMembershipWithNetwork;
  ownPartnerId: string;
}) {
  const network = membership.networks;
  const isManager = membership.role === "owner" || membership.role === "admin";
  const queryClient = useQueryClient();
  const [managing, setManaging] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const membersQuery = useQuery({
    queryKey: ["network-members-detailed", network.id],
    queryFn: () => getNetworkMembershipsDetailed(network.id),
    enabled: managing,
  });
  const eventCountsQuery = useQuery({
    queryKey: ["network-event-counts", network.id],
    queryFn: () => getReferralEventCountsForNetwork(network.id),
    enabled: managing,
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["network-members-detailed", network.id] });
    queryClient.invalidateQueries({ queryKey: ["memberships-for-partner", ownPartnerId] });
    queryClient.invalidateQueries({ queryKey: ["network-member-counts"] });
  }

  const respondMutation = useMutation({
    mutationFn: (vars: { partnerId: string; approve: boolean }) =>
      respondToNetworkMembership(network.id, vars.partnerId, vars.approve),
    onSuccess: () => {
      invalidateAll();
      toast.success("Updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: (targetPartnerId: string) =>
      removeNetworkMemberSelfService(network.id, targetPartnerId),
    onSuccess: () => {
      invalidateAll();
      toast.success("Removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const leaveMutation = useMutation({
    mutationFn: () => removeNetworkMemberSelfService(network.id, ownPartnerId),
    onSuccess: () => {
      invalidateAll();
      toast.success("You left the group");
      setLeaveOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setLeaveOpen(false);
    },
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { targetPartnerId: string; role: Extract<NetworkMembershipRole, "admin" | "member"> }) =>
      setNetworkMemberRole(network.id, vars.targetPartnerId, vars.role),
    onSuccess: () => {
      invalidateAll();
      toast.success("Role updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (values: GroupFormValues) => updateNetwork(network.id, values),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["networks-all"] });
      toast.success("Group settings saved");
      setSettingsOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const allRows = membersQuery.data ?? [];
  const activeMembers = allRows.filter((r) => r.status === "active");
  const pendingRequests = allRows.filter((r) => r.status === "requested");

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{network.name}</h3>
            <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-medium capitalize text-brand-primary">
              {membership.role}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
              {JOIN_MODE_LABEL[network.join_mode]}
            </span>
          </div>
          {network.description && <p className="mt-1 text-xs text-zinc-500">{network.description}</p>}
        </div>
        <ReferralLinkActions url={buildNetworkUrl(network.slug)} fileName={network.slug} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {isManager && (
          <button
            type="button"
            onClick={() => setManaging((v) => !v)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-primary hover:text-brand-primary"
          >
            {managing ? "Hide management" : "Manage group"}
          </button>
        )}
        {membership.role === "owner" && (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-primary hover:text-brand-primary"
          >
            Group settings
          </button>
        )}
        {membership.role !== "owner" && (
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            Leave group
          </button>
        )}
      </div>

      {managing && (
        <div className="mt-4 space-y-4 border-t border-zinc-100 pt-4">
          {eventCountsQuery.data && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <GroupStat label="Directory visits" value={eventCountsQuery.data.directoryVisits} />
              <GroupStat label="Profile views" value={eventCountsQuery.data.profileViews} />
              <GroupStat label="Contact clicks" value={eventCountsQuery.data.contactClicks} />
              <GroupStat label="Service requests" value={eventCountsQuery.data.serviceRequests} />
            </div>
          )}

          {membersQuery.isLoading && <LoadingSpinner label="Loading members..." />}
          {membersQuery.isError && <ErrorState onRetry={() => void membersQuery.refetch()} />}

          {!membersQuery.isLoading && !membersQuery.isError && (
            <>
              {pendingRequests.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Join requests
                  </p>
                  <ul className="mt-2 space-y-1">
                    {pendingRequests.map((row) => (
                      <li
                        key={row.partner_id}
                        className="flex items-center justify-between gap-3 rounded-md bg-amber-50 px-3 py-2 text-sm"
                      >
                        <span className="truncate text-slate-700">{row.partners.company_name}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={respondMutation.isPending}
                            onClick={() =>
                              respondMutation.mutate({ partnerId: row.partner_id, approve: true })
                            }
                            className="rounded-md bg-brand-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-secondary disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={respondMutation.isPending}
                            onClick={() =>
                              respondMutation.mutate({ partnerId: row.partner_id, approve: false })
                            }
                            className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <InviteBox
                networkId={network.id}
                excludeIds={new Set(allRows.map((r) => r.partner_id))}
                onInvited={invalidateAll}
              />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Members ({activeMembers.length})
                </p>
                <ul className="mt-2 space-y-1">
                  {activeMembers.map((row) => (
                    <li
                      key={row.partner_id}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-zinc-50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <img
                          src={row.partners.logo_url}
                          alt=""
                          className="h-6 w-6 shrink-0 rounded-full border border-zinc-200 bg-white object-contain"
                        />
                        <span className="truncate text-slate-700">{row.partners.company_name}</span>
                        <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium capitalize text-zinc-500">
                          {row.role}
                        </span>
                      </div>
                      {row.role !== "owner" && (
                        <div className="flex shrink-0 items-center gap-1">
                          {membership.role === "owner" && (
                            <button
                              type="button"
                              disabled={roleMutation.isPending}
                              onClick={() =>
                                roleMutation.mutate({
                                  targetPartnerId: row.partner_id,
                                  role: row.role === "admin" ? "member" : "admin",
                                })
                              }
                              className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-brand-primary hover:text-brand-primary disabled:opacity-50"
                            >
                              {row.role === "admin" ? "Make member" : "Make admin"}
                            </button>
                          )}
                          {(membership.role === "owner" || row.role === "member") && (
                            <IconButton
                              icon={<TrashIcon className="h-4 w-4" />}
                              label="Remove from group"
                              variant="danger"
                              disabled={removeMutation.isPending}
                              onClick={() => removeMutation.mutate(row.partner_id)}
                            />
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Group settings">
        <GroupForm
          group={network}
          submitLabel="Save changes"
          submitting={updateMutation.isPending}
          onSubmit={(values) => updateMutation.mutate(values)}
          onCancel={() => setSettingsOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={leaveOpen}
        title="Leave group"
        description={`Leave "${network.name}"? You can rejoin later if it's open, or ask the owner to re-invite you.`}
        confirmLabel="Leave"
        danger
        pending={leaveMutation.isPending}
        onConfirm={() => leaveMutation.mutate()}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  );
}

function InviteBox({
  networkId,
  excludeIds,
  onInvited,
}: {
  networkId: string;
  excludeIds: Set<string>;
  onInvited: () => void;
}) {
  const [selected, setSelected] = useState("");
  const partnersQuery = useQuery({
    queryKey: ["partners-active-for-invite"],
    queryFn: () => getPartners({ status: "active" }),
  });

  const inviteMutation = useMutation({
    mutationFn: (partnerId: string) => inviteToNetwork(networkId, partnerId),
    onSuccess: () => {
      onInvited();
      setSelected("");
      toast.success("Invite sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const options = (partnersQuery.data ?? [])
    .filter((p) => !excludeIds.has(p.id))
    .map((p) => ({ value: p.id, label: p.company_name }));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Invite a business</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <SearchableSelect
          className="w-64"
          value={selected}
          onChange={setSelected}
          placeholder="Select a business"
          searchPlaceholder="Search businesses..."
          options={options}
        />
        <button
          type="button"
          disabled={!selected || inviteMutation.isPending}
          onClick={() => selected && inviteMutation.mutate(selected)}
          className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-secondary disabled:opacity-50"
        >
          {inviteMutation.isPending ? "Inviting..." : "Invite"}
        </button>
      </div>
    </div>
  );
}

function GroupStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-2.5 text-center">
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
