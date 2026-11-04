import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { getNetworks } from "../../services/networks.service";
import { getPartners } from "../../services/partners.service";
import { getAllLeads, updateServiceRequest } from "../../services/referralEvents.service";
import type { ServiceRequest, ServiceRequestStatus } from "../../types";

const STATUS_OPTIONS: { value: ServiceRequestStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "spam", label: "Spam" },
];

const STATUS_STYLE: Record<ServiceRequestStatus, string> = {
  new: "bg-amber-100 text-amber-700",
  contacted: "bg-blue-100 text-blue-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-zinc-100 text-zinc-500",
  spam: "bg-red-100 text-red-700",
};

export default function AdminLeads() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");

  const leadsQuery = useQuery({ queryKey: ["all-leads"], queryFn: getAllLeads });
  const partnersQuery = useQuery({ queryKey: ["partners-all"], queryFn: () => getPartners() });
  const networksQuery = useQuery({ queryKey: ["networks-all"], queryFn: getNetworks });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; status: ServiceRequestStatus }) =>
      updateServiceRequest(vars.id, { status: vars.status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-leads"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const isLoading = leadsQuery.isLoading || partnersQuery.isLoading || networksQuery.isLoading;
  const isError = leadsQuery.isError || partnersQuery.isError || networksQuery.isError;

  if (isLoading) return <LoadingSpinner label="Loading leads..." />;
  if (isError) return <ErrorState onRetry={() => void leadsQuery.refetch()} />;

  const partnerNameById = new Map((partnersQuery.data ?? []).map((p) => [p.id, p.company_name]));
  const networkNameById = new Map((networksQuery.data ?? []).map((n) => [n.id, n.name]));

  const leads = (leadsQuery.data ?? []).filter(
    (l) => !statusFilter || l.status === statusFilter
  );

  const columns: DataTableColumn<ServiceRequest>[] = [
    {
      header: "Date",
      className: "whitespace-nowrap",
      accessor: (row) => new Date(row.created_at).toLocaleString(),
    },
    {
      header: "To business",
      accessor: (row) => partnerNameById.get(row.partner_id) ?? "-",
    },
    { header: "Customer", accessor: (row) => row.customer_name },
    {
      header: "Contact",
      accessor: (row) => (
        <div className="text-xs">
          <div>{row.customer_phone}</div>
          {row.customer_email && <div className="text-zinc-400">{row.customer_email}</div>}
        </div>
      ),
    },
    {
      header: "Source",
      accessor: (row) => (
        <div className="text-xs text-zinc-500">
          {row.network_id && <div>{networkNameById.get(row.network_id) ?? "-"}</div>}
          {row.referrer_partner_id && (
            <div>ref: {partnerNameById.get(row.referrer_partner_id) ?? "-"}</div>
          )}
          {!row.network_id && !row.referrer_partner_id && <span>Direct</span>}
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (row) => (
        <SearchableSelect
          className="w-32"
          value={row.status}
          onChange={(value) =>
            updateMutation.mutate({ id: row.id, status: value as ServiceRequestStatus })
          }
          options={STATUS_OPTIONS}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Leads</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Every service request submitted across the platform.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <SearchableSelect
          className="w-48"
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All statuses"
          clearLabel="All statuses"
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="mt-6">
        {leads.length === 0 ? (
          <EmptyState title="No leads yet" />
        ) : (
          <DataTable columns={columns} data={leads} rowKey={(row) => row.id} />
        )}
      </div>

      {leads.some((l) => l.status === "new") && (
        <p className="mt-3 text-xs text-zinc-400">
          <span className={`mr-1 inline-block rounded-full px-1.5 py-0.5 ${STATUS_STYLE.new}`}>New</span>
          leads haven't been contacted yet.
        </p>
      )}
    </div>
  );
}
