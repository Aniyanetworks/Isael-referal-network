import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { IconButton } from "../../components/ui/IconButton";
import { PencilIcon, PowerIcon, SearchIcon, TrashIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Modal } from "../../components/ui/Modal";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { PartnerForm } from "../../features/partners/PartnerForm";
import { getCategories } from "../../services/categories.service";
import {
  createPartner,
  deletePartner,
  getPartners,
  togglePartnerStatus,
  updatePartner,
} from "../../services/partners.service";
import type { Partner, PartnerFilters, PartnerInput } from "../../types";

export default function AdminPartners() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PartnerFilters>({});

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const partnersQuery = useQuery({
    queryKey: ["partners", filters],
    queryFn: () => getPartners(filters),
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deletingPartner, setDeletingPartner] = useState<Partner | null>(null);

  function invalidatePartners() {
    queryClient.invalidateQueries({ queryKey: ["partners"] });
  }

  const createMutation = useMutation({
    mutationFn: createPartner,
    onSuccess: () => {
      invalidatePartners();
      toast.success("Partner added");
      closeForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (values: { id: string; input: Partial<PartnerInput> }) =>
      updatePartner(values.id, values.input),
    onSuccess: () => {
      invalidatePartners();
      toast.success("Partner updated");
      closeForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: togglePartnerStatus,
    onSuccess: () => {
      invalidatePartners();
      toast.success("Status updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePartner,
    onSuccess: () => {
      invalidatePartners();
      toast.success("Partner deleted");
      setDeletingPartner(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setDeletingPartner(null);
    },
  });

  function openCreateForm() {
    setEditingPartner(null);
    setFormOpen(true);
  }

  function openEditForm(partner: Partner) {
    setEditingPartner(partner);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingPartner(null);
  }

  function handleSubmit(input: PartnerInput) {
    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, input });
    } else {
      createMutation.mutate(input);
    }
  }

  const categories = categoriesQuery.data ?? [];
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const columns: DataTableColumn<Partner>[] = [
    {
      header: "Company",
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.logo_url}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full border border-zinc-200 object-cover"
          />
          <span className="font-medium text-slate-900">{row.company_name}</span>
        </div>
      ),
    },
    { header: "Category", accessor: (row) => categoryNameById.get(row.category_id) ?? "-" },
    { header: "Contact", accessor: (row) => row.partner_name },
    { header: "Email", accessor: (row) => row.email },
    {
      header: "Status",
      accessor: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.status === "active"
              ? "bg-brand-accent/20 text-green-700"
              : "bg-zinc-100 text-zinc-500"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              row.status === "active" ? "bg-green-600" : "bg-zinc-400"
            }`}
          />
          {row.status}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      accessor: (row) => (
        <div className="flex justify-end gap-1">
          <IconButton icon={<PencilIcon className="h-4 w-4" />} label="Edit" onClick={() => openEditForm(row)} />
          <IconButton
            icon={<PowerIcon className="h-4 w-4" />}
            label={row.status === "active" ? "Deactivate" : "Activate"}
            variant={row.status === "active" ? "default" : "success"}
            onClick={() => toggleStatusMutation.mutate(row.id)}
          />
          <IconButton
            icon={<TrashIcon className="h-4 w-4" />}
            label="Delete"
            variant="danger"
            onClick={() => setDeletingPartner(row)}
          />
        </div>
      ),
    },
  ];

  const partners = partnersQuery.data ?? [];
  const isLoading = partnersQuery.isLoading || categoriesQuery.isLoading;
  const isError = partnersQuery.isError || categoriesQuery.isError;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Partners</h1>
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary"
        >
          Add Partner
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative max-w-xs flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by company, contact, or email"
            className="form-input max-w-xs pl-9"
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <SearchableSelect
          className="w-52"
          value={filters.category_id ?? ""}
          onChange={(value) => setFilters((f) => ({ ...f, category_id: value || undefined }))}
          placeholder="All categories"
          clearLabel="All categories"
          searchPlaceholder="Search categories..."
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <SearchableSelect
          className="w-44"
          value={filters.status ?? ""}
          onChange={(value) =>
            setFilters((f) => ({ ...f, status: (value || undefined) as PartnerFilters["status"] }))
          }
          placeholder="All statuses"
          clearLabel="All statuses"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </div>

      <div className="mt-6">
        {isLoading && <LoadingSpinner label="Loading partners..." />}
        {isError && <ErrorState onRetry={() => void partnersQuery.refetch()} />}
        {!isLoading && !isError && partners.length === 0 && (
          <EmptyState
            title="No partners found"
            description="Add your first partner or adjust your search/filters."
          />
        )}
        {!isLoading && !isError && partners.length > 0 && (
          <DataTable columns={columns} data={partners} rowKey={(row) => row.id} />
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingPartner ? "Edit Partner" : "Add Partner"}
      >
        <PartnerForm
          partner={editingPartner}
          categories={categories}
          submitLabel={editingPartner ? "Save changes" : "Add Partner"}
          submitting={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingPartner)}
        title="Delete partner"
        description={`Delete "${deletingPartner?.company_name}"? This also removes their referral links.`}
        confirmLabel="Delete"
        danger
        pending={deleteMutation.isPending}
        onConfirm={() => deletingPartner && deleteMutation.mutate(deletingPartner.id)}
        onCancel={() => setDeletingPartner(null)}
      />
    </div>
  );
}
