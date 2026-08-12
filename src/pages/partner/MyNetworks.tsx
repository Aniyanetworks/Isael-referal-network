import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ReferralLinkActions } from "../../features/referralLinks/ReferralLinkActions";
import { useAuth } from "../../hooks/useAuth";
import {
  buildNetworkUrl,
  getNetworkMembers,
  getNetworksForPartner,
} from "../../services/networks.service";
import type { Network } from "../../types";

export default function PartnerMyNetworks() {
  const { profile } = useAuth();
  const partnerId = profile?.partner_id ?? "";

  const networksQuery = useQuery({
    queryKey: ["my-networks", partnerId],
    queryFn: () => getNetworksForPartner(partnerId),
    enabled: Boolean(partnerId),
  });

  const networks = networksQuery.data ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">My Network</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Networks you belong to, who else is in them, and a shareable link for each one.
      </p>

      <div className="mt-6">
        {Boolean(partnerId) && networksQuery.isLoading && (
          <LoadingSpinner label="Loading your networks..." />
        )}
        {Boolean(partnerId) && networksQuery.isError && (
          <ErrorState onRetry={() => void networksQuery.refetch()} />
        )}
        {!networksQuery.isLoading && !networksQuery.isError && networks.length === 0 && (
          <EmptyState
            title="Not in a network yet"
            description="An admin adds partners to networks - once you're in one, it'll show up here."
          />
        )}
        {!networksQuery.isLoading && !networksQuery.isError && networks.length > 0 && (
          <div className="space-y-4">
            {networks.map((network) => (
              <NetworkCard key={network.id} network={network} ownPartnerId={partnerId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NetworkCard({ network, ownPartnerId }: { network: Network; ownPartnerId: string }) {
  const membersQuery = useQuery({
    queryKey: ["network-members", network.id],
    queryFn: () => getNetworkMembers(network.id),
  });

  const members = (membersQuery.data ?? []).filter((p) => p.id !== ownPartnerId);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{network.name}</h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            {membersQuery.isLoading
              ? "Loading members..."
              : `${members.length} other member${members.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <ReferralLinkActions url={buildNetworkUrl(network.slug)} fileName={network.slug} />
      </div>

      {!membersQuery.isLoading && members.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 gap-2 border-t border-zinc-100 pt-4 sm:grid-cols-2">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-2 text-sm text-slate-700">
              <img
                src={member.logo_url}
                alt=""
                className="h-6 w-6 shrink-0 rounded-full border border-zinc-200 object-cover"
              />
              <span className="truncate">{member.company_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
