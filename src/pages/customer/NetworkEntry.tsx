import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PartnerContactCard } from "../../components/customer/PartnerContactCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Footer } from "../../components/ui/Footer";
import { BuildingIcon, SearchIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Logo } from "../../components/ui/Logo";
import { ScrollCarousel } from "../../components/ui/ScrollCarousel";
import { useAuth } from "../../hooks/useAuth";
import { detectDevice, getClientIp, getVisitorId } from "../../lib/visitor";
import { getCategories } from "../../services/categories.service";
import {
  getMembershipsForPartner,
  getNetworkBySlug,
  getNetworkMemberCounts,
  getNetworkMembers,
  getNetworks,
  joinOpenNetwork,
  requestToJoinNetwork,
} from "../../services/networks.service";
import { getPartnerBySlug } from "../../services/partners.service";
import { recordReferralEvent } from "../../services/referralEvents.service";
import type { Network } from "../../types";

/**
 * Entry point for a network's shareable link: /network/:networkSlug. Shows
 * every partner in that network. An optional ?ref=<partner-slug> (e.g. a
 * business sharing this group's link themselves, instead of the group's
 * plain QR) attributes every event on this visit to that business -
 * entirely optional, so every existing printed/shared group link with no
 * such param keeps working exactly as before.
 */
export default function NetworkEntry() {
  const { networkSlug } = useParams<{ networkSlug: string }>();
  const [searchParams] = useSearchParams();
  const refSlug = searchParams.get("ref");
  const detailsRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visitRecordedRef = useRef(false);
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const networkQuery = useQuery({
    queryKey: ["public-network", networkSlug],
    queryFn: () => getNetworkBySlug(networkSlug ?? ""),
    enabled: Boolean(networkSlug),
  });

  // Only a logged-in partner can actually join from here - this just tells
  // us whether (and how) to show the button; an anonymous visitor or
  // logged-out partner gets a sign-in prompt instead of the mutation itself.
  const partnerId = profile?.role === "partner" ? profile.partner_id : null;
  const membershipsQuery = useQuery({
    queryKey: ["memberships-for-partner", partnerId],
    queryFn: () => getMembershipsForPartner(partnerId ?? ""),
    enabled: Boolean(partnerId),
  });

  function invalidateMemberships() {
    queryClient.invalidateQueries({ queryKey: ["memberships-for-partner", partnerId] });
  }

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

  const membersQuery = useQuery({
    queryKey: ["public-network-members", networkQuery.data?.id],
    queryFn: () => getNetworkMembers(networkQuery.data!.id),
    enabled: Boolean(networkQuery.data),
  });

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  // Other groups on the platform, so a visitor can discover more than just
  // the one this link happened to point at.
  const allNetworksQuery = useQuery({ queryKey: ["networks-all"], queryFn: getNetworks });
  const memberCountsQuery = useQuery({
    queryKey: ["network-member-counts"],
    queryFn: getNetworkMemberCounts,
  });

  // Resolve ?ref= to a partner id. Not restricted to this network's own
  // members - a business can share a group's link with its own customers
  // even for a group it doesn't belong to.
  const referrerQuery = useQuery({
    queryKey: ["public-partner", refSlug],
    queryFn: () => getPartnerBySlug(refSlug ?? ""),
    enabled: Boolean(refSlug),
  });
  const referrerPartnerId = refSlug ? referrerQuery.data?.id ?? null : null;

  useEffect(() => {
    if (visitRecordedRef.current) return;
    if (!networkQuery.data) return;
    if (refSlug && referrerQuery.isLoading) return; // wait for ?ref= to resolve first
    visitRecordedRef.current = true;

    const networkId = networkQuery.data.id;
    void (async () => {
      const ip = await getClientIp();
      void recordReferralEvent({
        eventType: "directory_visit",
        networkId,
        referrerPartnerId,
        visitorId: getVisitorId(),
        device: detectDevice(),
        userAgent: navigator.userAgent,
        ipAddress: ip,
      });
    })();
  }, [networkQuery.data, refSlug, referrerQuery.isLoading, referrerPartnerId]);

  useEffect(() => {
    if (!selectedId) return;
    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedId]);

  if (networkQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Loading..." />
      </div>
    );
  }

  if (networkQuery.isError || !networkQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <EmptyState
          title="We couldn't find that network"
          description="This link may be out of date. Double-check the link and try again."
        />
      </div>
    );
  }

  const network = networkQuery.data;
  const categoryNameById = new Map((categoriesQuery.data ?? []).map((c) => [c.id, c.name]));
  const members = membersQuery.data ?? [];
  const selected = members.find((p) => p.id === selectedId) ?? null;

  const searchTerm = search.trim().toLowerCase();
  const visibleMembers = members.filter((p) => {
    if (!searchTerm) return true;
    const categoryName = categoryNameById.get(p.category_id) ?? "";
    return `${p.company_name} ${categoryName}`.toLowerCase().includes(searchTerm);
  });

  const otherNetworks = (allNetworksQuery.data ?? []).filter((n) => n.id !== network.id);

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-brand-primary/5 via-white to-white">
      <div className="flex-1 px-4 py-10 sm:py-14">
        <div className="mx-auto mb-6 flex max-w-2xl justify-center">
          <Logo size="md" />
        </div>

        <div className="animate-fade-in-up mx-auto max-w-2xl">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-lg shadow-brand-primary/5 sm:p-8">
            <h1 className="text-2xl font-bold text-slate-900">{network.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {network.description || "Trusted businesses in this network."}
            </p>
            {members.length > 0 && (
              <p className="mt-1 text-xs text-zinc-400">
                {members.length} {members.length === 1 ? "business" : "businesses"} in this group
              </p>
            )}
            <JoinNetworkCta
              network={network}
              loggedIn={Boolean(profile)}
              partnerId={partnerId}
              membership={membershipsQuery.data?.find((m) => m.network_id === network.id)}
              membershipsLoading={membershipsQuery.isLoading}
              onJoin={() => joinMutation.mutate(network.id)}
              onRequest={() => requestMutation.mutate(network.id)}
              joining={joinMutation.isPending}
              requesting={requestMutation.isPending}
            />
          </div>
        </div>

        {members.length === 0 ? (
          <div className="mx-auto mt-8 max-w-2xl">
            <EmptyState
              title="No members yet"
              description="This network doesn't have any partners in it yet."
            />
          </div>
        ) : (
          <>
            <div className="mx-auto mt-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Businesses in {network.name}
              </p>
              <div className="relative mt-2">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or category"
                  className="form-input pl-9"
                />
              </div>
            </div>

            <div className="animate-fade-in-up mx-auto mt-3 max-w-2xl" style={{ animationDelay: "0.1s" }}>
              {visibleMembers.length === 0 ? (
                <EmptyState title="No partners match your search" />
              ) : (
                <ScrollCarousel>
                  {visibleMembers.map((partner) => {
                    const isSelected = partner.id === selectedId;
                    return (
                      <button
                        key={partner.id}
                        type="button"
                        onClick={() => setSelectedId(isSelected ? null : partner.id)}
                        className={`flex shrink-0 items-center gap-2 rounded-full border bg-white py-1.5 pl-1.5 pr-3 text-left text-sm shadow-sm transition-all ${
                          isSelected
                            ? "border-brand-primary ring-2 ring-brand-primary/30"
                            : "border-zinc-200 hover:border-brand-primary/40"
                        }`}
                      >
                        <img
                          src={partner.logo_url}
                          alt=""
                          className="h-7 w-7 shrink-0 rounded-full border border-zinc-200 bg-white object-contain"
                        />
                        <span className="whitespace-nowrap font-medium text-slate-900">
                          {partner.company_name}
                        </span>
                        <span className="whitespace-nowrap text-xs text-zinc-400">
                          {categoryNameById.get(partner.category_id) ?? "Uncategorized"}
                        </span>
                      </button>
                    );
                  })}
                </ScrollCarousel>
              )}
            </div>

            {selected && (
              <div ref={detailsRef} className="animate-fade-in-up mx-auto mt-6 max-w-2xl">
                <PartnerContactCard
                  partner={selected}
                  categoryName={categoryNameById.get(selected.category_id)}
                  networkId={network.id}
                  referrerPartnerId={referrerPartnerId}
                />
              </div>
            )}
          </>
        )}

        {otherNetworks.length > 0 && (
          <div className="animate-fade-in-up mx-auto mt-10 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Other groups on Konexigo
            </p>
            <div className="mt-2">
              <ScrollCarousel>
                {otherNetworks.map((n) => (
                  <Link
                    key={n.id}
                    to={`/network/${n.slug}`}
                    className="flex shrink-0 items-center gap-2 rounded-full border border-zinc-200 bg-white py-1.5 pl-1.5 pr-3 text-sm shadow-sm transition-all hover:border-brand-primary/40"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
                      <BuildingIcon className="h-4 w-4 text-zinc-400" />
                    </span>
                    <span className="whitespace-nowrap font-medium text-slate-900">{n.name}</span>
                    <span className="whitespace-nowrap text-xs text-zinc-400">
                      {memberCountsQuery.data?.get(n.id) ?? 0}{" "}
                      {memberCountsQuery.data?.get(n.id) === 1 ? "business" : "businesses"}
                    </span>
                  </Link>
                ))}
              </ScrollCarousel>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

/**
 * Lets a logged-in partner join/request this network right from its public
 * link, instead of hunting for it under My Groups. Deliberately scoped to
 * existing partner accounts only - an anonymous visitor (or a logged-out
 * partner) just gets sent to log in first; a brand-new business still signs
 * up normally and joins afterward from their dashboard.
 */
function JoinNetworkCta({
  network,
  loggedIn,
  partnerId,
  membership,
  membershipsLoading,
  onJoin,
  onRequest,
  joining,
  requesting,
}: {
  network: Network;
  loggedIn: boolean;
  partnerId: string | null;
  membership: { status: string } | undefined;
  membershipsLoading: boolean;
  onJoin: () => void;
  onRequest: () => void;
  joining: boolean;
  requesting: boolean;
}) {
  if (!loggedIn) {
    return (
      <p className="mt-3 text-xs text-zinc-400">
        Own a business like these?{" "}
        <Link to="/login" className="font-medium text-brand-primary underline">
          Log in
        </Link>{" "}
        to join this group.
      </p>
    );
  }

  if (!partnerId || membershipsLoading) return null;

  if (membership?.status === "active") {
    return <p className="mt-3 text-xs text-zinc-400">You're already a member of this group.</p>;
  }
  if (membership?.status === "invited") {
    return (
      <p className="mt-3 text-xs text-zinc-400">
        You've been invited to this group -{" "}
        <Link to="/partner/network" className="font-medium text-brand-primary underline">
          respond in My Groups
        </Link>
        .
      </p>
    );
  }
  if (membership?.status === "requested") {
    return <p className="mt-3 text-xs text-zinc-400">Request sent - awaiting approval.</p>;
  }

  if (network.join_mode === "invite_only") {
    return <p className="mt-3 text-xs text-zinc-400">Ask the group owner to invite you.</p>;
  }

  return (
    <div className="mt-3">
      {network.join_mode === "open" ? (
        <button
          type="button"
          disabled={joining}
          onClick={onJoin}
          className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-secondary disabled:opacity-50"
        >
          {joining ? "Joining..." : "Join this group"}
        </button>
      ) : (
        <button
          type="button"
          disabled={requesting}
          onClick={onRequest}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-primary hover:text-brand-primary disabled:opacity-50"
        >
          {requesting ? "Requesting..." : "Request to Join"}
        </button>
      )}
    </div>
  );
}
