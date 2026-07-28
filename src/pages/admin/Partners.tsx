import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Modal } from "../../components/ui/Modal";
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
    { header: "Company", accessor: (row) => row.company_name },
    { header: "Category", accessor: (row) => categoryNameById.get(row.category_id) ?? "-" },
    { header: "Contact", accessor: (row) => row.partner_name },
    { header: "Email", accessor: (row) => row.email },
    {
      header: "Status",
      accessor: (row) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            row.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: (row) => (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="text-sm font-medium text-gray-700 underline"
            onClick={() => openEditForm(row)}
          >
            Edit
          </button>
          <button
            type="button"
            className="text-sm font-medium text-gray-700 underline"
            onClick={() => toggleStatusMutation.mutate(row.id)}
          >
            {row.status === "active" ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            className="text-sm font-medium text-red-600 underline"
            onClick={() => setDeletingPartner(row)}
          >
            Delete
          </button>
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
        <h1 className="text-xl font-semibold text-gray-900">Partners</h1>
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add Partner
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by company, contact, or email"
          className="form-input max-w-xs"
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <select
          className="form-input max-w-xs"
          onChange={(e) =>
            setFilters((f) => ({ ...f, category_id: e.target.value || undefined }))
          }
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          className="form-input max-w-xs"
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: (e.target.value || undefined) as PartnerFilters["status"],
            }))
          }
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
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
