import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "../partners/PartnerForm";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import type { Network } from "../../types";

const groupSchema = z.object({
  name: z.string().min(2, "Required"),
  description: z.string(),
  join_mode: z.enum(["invite_only", "request_to_join", "open"]),
});
export type GroupFormValues = z.infer<typeof groupSchema>;

const JOIN_MODE_OPTIONS = [
  { value: "invite_only", label: "Invite only - you add members yourself" },
  { value: "request_to_join", label: "Request to join - you approve each request" },
  { value: "open", label: "Open - any business can join instantly" },
];

interface GroupFormProps {
  group?: Network | null;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: GroupFormValues) => void;
  onCancel?: () => void;
}

export function GroupForm({ group = null, submitLabel, submitting, onSubmit, onCancel }: GroupFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: group?.name ?? "",
      description: group?.description ?? "",
      join_mode: group?.join_mode ?? "invite_only",
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field label="Group name" error={errors.name?.message}>
        <input className="form-input" {...register("name")} />
      </Field>
      <Field label="Description">
        <textarea rows={2} className="form-input" {...register("description")} />
      </Field>
      <Field label="Who can join">
        <Controller
          control={control}
          name="join_mode"
          render={({ field }) => (
            <SearchableSelect
              value={field.value}
              onChange={(value) => field.onChange(value as GroupFormValues["join_mode"])}
              options={JOIN_MODE_OPTIONS}
            />
          )}
        />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
        )}
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
