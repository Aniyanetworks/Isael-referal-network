import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../../services/categories.service";
import type { Category } from "../../types";

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading, isError, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema) });

  useEffect(() => {
    reset({ name: editingCategory?.name ?? "" });
  }, [editingCategory, reset]);

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created");
      closeForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (values: { id: string; name: string }) =>
      updateCategory(values.id, { name: values.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category updated");
      closeForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
      setDeletingCategory(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setDeletingCategory(null);
    },
  });

  function openCreateForm() {
    setEditingCategory(null);
    setFormOpen(true);
  }

  function openEditForm(category: Category) {
    setEditingCategory(category);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingCategory(null);
  }

  function onSubmit(values: CategoryFormValues) {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, name: values.name });
    } else {
      createMutation.mutate({ name: values.name, slug: "" });
    }
  }

  const columns: DataTableColumn<Category>[] = [
    { header: "Name", accessor: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
    {
      header: "Slug",
      accessor: (row) => (
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">{row.slug}</code>
      ),
    },
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
            onClick={() => setDeletingCategory(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Categories</h1>
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary"
        >
          Add Category
        </button>
      </div>

      <div className="mt-6">
        {isLoading && <LoadingSpinner label="Loading categories..." />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && categories && categories.length === 0 && (
          <EmptyState
            title="No categories yet"
            description="Add a category so partners can be grouped by service type."
          />
        )}
        {!isLoading && !isError && categories && categories.length > 0 && (
          <DataTable columns={columns} data={categories} rowKey={(row) => row.id} />
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingCategory ? "Edit Category" : "Add Category"}
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
              {editingCategory ? "Save changes" : "Add Category"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingCategory)}
        title="Delete category"
        description={`Delete "${deletingCategory?.name}"? Partners in this category will need to be reassigned first.`}
        confirmLabel="Delete"
        danger
        pending={deleteMutation.isPending}
        onConfirm={() => deletingCategory && deleteMutation.mutate(deletingCategory.id)}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
}
