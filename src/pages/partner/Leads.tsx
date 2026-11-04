import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { useAuth } from "../../hooks/useAuth";
import { getNetworks } from "../../services/networks.service";
import { getPartners } from "../../services/partners.service";
import { getLeadsForPartner, updateServiceRequest } from "../../services/referralEvents.service";
import type { ServiceRequest, ServiceRequestStatus } from "../../types";

const STATUS_OPTIONS: { value: ServiceRequestStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "spam", label: "Spam" },
];

export default function PartnerLeads() {
  const { profile } = useAuth();
  const partnerId = profile?.partner_id ?? "";
  const queryClient = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: ["leads", partnerId],
    queryFn: () => getLeadsForPartner(partnerId),
    enabled: Boolean(partnerId),
  });
  // For showing "via <group> / referred by <business>" on each lead - a
  // plain name lookup, not the partner directory itself.
  const networksQuery = useQuery({ queryKey: ["networks-all"], queryFn: getNetworks });
  const partnersQuery = useQuery({ queryKey: ["partners-all"], queryFn: () => getPartners() });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; input: { status?: ServiceRequestStatus; note?: string } }) =>
      updateServiceRequest(vars.id, vars.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", partnerId] });
      queryClient.invalidateQueries({ queryKey: ["new-leads-count", partnerId] });
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
  if (leadsQuery.isLoading) return <LoadingSpinner label="Loading your leads..." />;
  if (leadsQuery.isError) return <ErrorState onRetry={() => void leadsQuery.refetch()} />;

  const leads = leadsQuery.data ?? [];
  const networkNameById = new Map((networksQuery.data ?? []).map((n) => [n.id, n.name]));
  const partnerNameById = new Map((partnersQuery.data ?? []).map((p) => [p.id, p.company_name]));

  function sourceLabel(lead: ServiceRequest): string {
    const network = lead.network_id ? networkNameById.get(lead.network_id) : undefined;
    const referrer = lead.referrer_partner_id ? partnerNameById.get(lead.referrer_partner_id) : undefined;
    if (network && referrer) return `${network}, referred by ${referrer}`;
    if (network) return network;
    if (referrer) return `referred by ${referrer}`;
    return "Direct";
  }

  const columns: DataTableColumn<ServiceRequest>[] = [
    {
      header: "Date",
      className: "whitespace-nowrap",
      accessor: (row) => new Date(row.created_at).toLocaleString(),
    },
    { header: "Customer", accessor: (row) => row.customer_name },
    {
      header: "Phone",
      accessor: (row) => (
        <a href={`tel:${row.customer_phone}`} className="hover:text-brand-primary hover:underline">
          {row.customer_phone}
        </a>
      ),
    },
    {
      header: "Email",
      accessor: (row) =>
        row.customer_email ? (
          <a href={`mailto:${row.customer_email}`} className="hover:text-brand-primary hover:underline">
            {row.customer_email}
          </a>
        ) : (
          <span className="text-zinc-300">-</span>
        ),
    },
    {
      header: "Message",
      className: "max-w-xs",
      accessor: (row) =>
        row.message ? (
          <span className="line-clamp-2" title={row.message}>
            {row.message}
          </span>
        ) : (
          <span className="text-zinc-300">-</span>
        ),
    },
    { header: "Source", className: "text-xs text-zinc-500", accessor: (row) => sourceLabel(row) },
    {
      header: "Status",
      accessor: (row) => (
        <SearchableSelect
          className="w-32"
          value={row.status}
          onChange={(value) =>
            updateMutation.mutate({ id: row.id, input: { status: value as ServiceRequestStatus } })
          }
          options={STATUS_OPTIONS}
        />
      ),
    },
    {
      header: "Note",
      accessor: (row) => (
        <NoteCell
          lead={row}
          onSave={(note) => updateMutation.mutate({ id: row.id, input: { note } })}
          saving={updateMutation.isPending}
        />
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Leads</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Service requests customers have sent you from your referral link, group pages, or profile.
      </p>

      <div className="mt-6">
        {leads.length === 0 ? (
          <EmptyState
            title="No leads yet"
            description="When a customer submits a Request Service form on your profile, it'll show up here."
          />
        ) : (
          <DataTable columns={columns} data={leads} rowKey={(row) => row.id} />
        )}
      </div>
    </div>
  );
}

function NoteCell({
  lead,
  onSave,
  saving,
}: {
  lead: ServiceRequest;
  onSave: (note: string) => void;
  saving: boolean;
}) {
  const [note, setNote] = useState(lead.note);
  const dirty = note !== lead.note;

  return (
    <div className="flex min-w-[12rem] items-center gap-1.5">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. 'asked to come Friday'"
        className="form-input text-xs"
      />
      {dirty && (
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(note)}
          className="shrink-0 rounded-md bg-brand-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-secondary disabled:opacity-50"
        >
          Save
        </button>
      )}
    </div>
  );
}
