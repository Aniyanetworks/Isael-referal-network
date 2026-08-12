import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { IconButton } from "../../components/ui/IconButton";
import { PencilIcon, TrashIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Modal } from "../../components/ui/Modal";
import {
  createNetwork,
  deleteNetwork,
  getNetworkMemberCounts,
  getNetworks,
  updateNetwork,
} from "../../services/networks.service";
import type { Network } from "../../types";

const networkSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});
type NetworkFormValues = z.infer<typeof networkSchema>;

export default function AdminNetworks() {
  const queryClient = useQueryClient();
  const networksQuery = useQuery({ queryKey: ["networks"], queryFn: getNetworks });
  const memberCountsQuery = useQuery({
    queryKey: ["network-member-counts"],
    queryFn: getNetworkMemberCounts,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);
  const [deletingNetwork, setDeletingNetwork] = useState<Network | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NetworkFormValues>({ resolver: zodResolver(networkSchema) });

  useEffect(() => {
    reset({ name: editingNetwork?.name ?? "" });
  }, [editingNetwork, reset]);

  function invalidateNetworks() {
    queryClient.invalidateQueries({ queryKey: ["networks"] });
    queryClient.invalidateQueries({ queryKey: ["network-member-counts"] });
  }

  const createMutation = useMutation({
    mutationFn: createNetwork,
    onSuccess: () => {
      invalidateNetworks();
      toast.success("Network created");
      closeForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (values: { id: string; name: string }) =>
      updateNetwork(values.id, { name: values.name }),
    onSuccess: () => {
      invalidateNetworks();
      toast.success("Network updated");
      closeForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNetwork,
    onSuccess: () => {
      invalidateNetworks();
      toast.success("Network deleted");
      setDeletingNetwork(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setDeletingNetwork(null);
    },
  });

  function openCreateForm() {
    setEditingNetwork(null);
    setFormOpen(true);
  }

  function openEditForm(network: Network) {
    setEditingNetwork(network);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingNetwork(null);
  }

  function onSubmit(values: NetworkFormValues) {
    if (editingNetwork) {
      updateMutation.mutate({ id: editingNetwork.id, name: values.name });
    } else {
      createMutation.mutate({ name: values.name });
    }
  }

  const networks = networksQuery.data ?? [];
  const memberCounts = memberCountsQuery.data ?? new Map<string, number>();
  const isLoading = networksQuery.isLoading || memberCountsQuery.isLoading;
  const isError = networksQuery.isError || memberCountsQuery.isError;

  const columns: DataTableColumn<Network>[] = [
    {
      header: "Name",
      accessor: (row) => (
        <Link
          to={`/admin/networks/${row.id}`}
          className="font-medium text-slate-900 hover:text-brand-primary hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    { header: "Members", accessor: (row) => memberCounts.get(row.id) ?? 0 },
    {
      header: "Actions",
      className: "text-right",
      accessor: (row) => (
        <div className="flex justify-end gap-1">
          <IconButton icon={<PencilIcon className="h-4 w-4" />} label="Edit" onClick={() => openEditForm(row)} />
          <IconButton
            icon={<TrashIcon className="h-4 w-4" />}
            label="Delete"
            variant="danger"
            onClick={() => setDeletingNetwork(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Networks</h1>
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary"
        >
          Add Network
        </button>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        A partner in a network only sees other partners in that same network on their referral
        page - not the whole directory. A partner can be in more than one network. Click a
        network to see its members and shareable link.
      </p>

      <div className="mt-6">
        {isLoading && <LoadingSpinner label="Loading networks..." />}
        {isError && <ErrorState onRetry={() => void networksQuery.refetch()} />}
        {!isLoading && !isError && networks.length === 0 && (
          <EmptyState
            title="No networks yet"
            description="Create a network (e.g. Doctor's Network) and add partners to it."
          />
        )}
        {!isLoading && !isError && networks.length > 0 && (
          <DataTable columns={columns} data={networks} rowKey={(row) => row.id} />
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingNetwork ? "Edit Network" : "Add Network"}
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              type="text"
              className="form-input mt-1 transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              {...register("name")}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-50"
            >
              {editingNetwork ? "Save changes" : "Add Network"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingNetwork)}
        title="Delete network"
        description={`Delete "${deletingNetwork?.name}"? Members will lose the scoped visibility and shareable link this network gave them.`}
        confirmLabel="Delete"
        danger
        pending={deleteMutation.isPending}
        onConfirm={() => deletingNetwork && deleteMutation.mutate(deletingNetwork.id)}
        onCancel={() => setDeletingNetwork(null)}
      />
    </div>
  );
}
