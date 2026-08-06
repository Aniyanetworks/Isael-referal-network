import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { ReactNode } from "react";
import { z } from "zod";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import type { Category, Partner, PartnerInput } from "../../types";

const partnerSchema = z.object({
  company_name: z.string().min(2, "Required"),
  partner_name: z.string().min(2, "Required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(5, "Required"),
  website: z.string().min(1, "Required"),
  address: z.string().min(2, "Required"),
  category_id: z.string().min(1, "Select a category"),
  description: z.string(),
  logo_url: z.string(),
  status: z.enum(["active", "inactive"]),
  facebook: z.string(),
  instagram: z.string(),
  linkedin: z.string(),
});
type PartnerFormValues = z.infer<typeof partnerSchema>;

function toFormValues(partner: Partner | null): PartnerFormValues {
  return {
    company_name: partner?.company_name ?? "",
    partner_name: partner?.partner_name ?? "",
    email: partner?.email ?? "",
    phone: partner?.phone ?? "",
    website: partner?.website ?? "",
    address: partner?.address ?? "",
    category_id: partner?.category_id ?? "",
    description: partner?.description ?? "",
    logo_url: partner?.logo_url ?? "",
    status: partner?.status ?? "active",
    facebook: partner?.social_links?.facebook ?? "",
    instagram: partner?.social_links?.instagram ?? "",
    linkedin: partner?.social_links?.linkedin ?? "",
  };
}

interface PartnerFormProps {
  partner?: Partner | null;
  categories: Category[];
  submitLabel: string;
  submitting: boolean;
  onSubmit: (input: PartnerInput) => void;
  onCancel: () => void;
}

export function PartnerForm({
  partner = null,
  categories,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: PartnerFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: toFormValues(partner),
  });

  function submit(values: PartnerFormValues) {
    const social_links: PartnerInput["social_links"] = {};
    if (values.facebook) social_links.facebook = values.facebook;
    if (values.instagram) social_links.instagram = values.instagram;
    if (values.linkedin) social_links.linkedin = values.linkedin;

    onSubmit({
      company_name: values.company_name,
      partner_name: values.partner_name,
      email: values.email,
      phone: values.phone,
      website: values.website,
      address: values.address,
      category_id: values.category_id,
      description: values.description,
      logo_url: values.logo_url,
      status: values.status,
      social_links,
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company name" error={errors.company_name?.message}>
          <input className="form-input" {...register("company_name")} />
        </Field>
        <Field label="Contact name" error={errors.partner_name?.message}>
          <input className="form-input" {...register("partner_name")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" className="form-input" {...register("email")} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input className="form-input" {...register("phone")} />
        </Field>
        <Field label="Website" error={errors.website?.message}>
          <input className="form-input" {...register("website")} />
        </Field>
        <Field label="Address" error={errors.address?.message}>
          <input className="form-input" {...register("address")} />
        </Field>
        <Field label="Category" error={errors.category_id?.message}>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onChange={field.onChange}
                placeholder="Select a category"
                searchPlaceholder="Search categories..."
                options={categories.map((category) => ({ value: category.id, label: category.name }))}
              />
            )}
          />
        </Field>
        <Field label="Status">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onChange={(value) => field.onChange(value as PartnerFormValues["status"])}
                placeholder="Select status"
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            )}
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea rows={3} className="form-input" {...register("description")} />
      </Field>
      <Field label="Logo URL">
        <input className="form-input" {...register("logo_url")} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Facebook">
          <input className="form-input" {...register("facebook")} />
        </Field>
        <Field label="Instagram">
          <input className="form-input" {...register("instagram")} />
        </Field>
        <Field label="LinkedIn">
          <input className="form-input" {...register("linkedin")} />
        </Field>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-50"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <div className="mt-1 font-normal">{children}</div>
      {error && <p className="mt-1 text-xs font-normal text-red-600">{error}</p>}
    </label>
  );
}
