import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AuthShell } from "../../components/layout/AuthShell";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { Field } from "../../features/partners/PartnerForm";
import { useAuth } from "../../hooks/useAuth";
import { getCategories } from "../../services/categories.service";
import { applyAsPartner } from "../../services/partnerApplications.service";

const signupSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  company_name: z.string().min(2, "Required"),
  partner_name: z.string().min(2, "Required"),
  phone: z.string().min(5, "Required"),
  website: z.string().min(1, "Required"),
  address: z.string().min(2, "Required"),
  category_id: z.string().min(1, "Select a category"),
  description: z.string(),
  logo_url: z.string(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

function isAlreadyRegisteredError(error: unknown): boolean {
  return error instanceof Error && /already registered|already exists/i.test(error.message);
}

export default function Signup() {
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const categories = categoriesQuery.data ?? [];

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupFormValues) {
    setFormError(null);
    try {
      const session = await signUp(values.email, values.password);

      if (!session) {
        // Email confirmation is required - no session to submit the
        // application under yet. They'll need to log in afterward; an admin
        // can link the account manually from the Partner Approvals screen.
        setNeedsEmailConfirm(true);
        setSubmitted(true);
        return;
      }

      await applyAsPartner({
        company_name: values.company_name,
        partner_name: values.partner_name,
        email: values.email,
        phone: values.phone,
        website: values.website,
        address: values.address,
        category_id: values.category_id,
        description: values.description,
        logo_url: values.logo_url,
      });
      setSubmitted(true);
    } catch (error) {
      if (isAlreadyRegisteredError(error)) {
        try {
          const profile = await signIn(values.email, values.password);
          navigate(profile?.role === "admin" ? "/admin/dashboard" : "/partner/dashboard", {
            replace: true,
          });
          return;
        } catch {
          setFormError("This email is already registered. Check your password, or log in below.");
          return;
        }
      }
      setFormError(error instanceof Error ? error.message : "Could not submit application");
    }
  }

  if (submitted) {
    return (
      <AuthShell>
        <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/60 bg-white/80 p-8 text-center shadow-xl shadow-brand-primary/10 backdrop-blur-sm">
          <h1 className="text-xl font-semibold text-slate-900">Application submitted</h1>
          <p className="mt-2 text-sm text-slate-600">
            {needsEmailConfirm
              ? "Confirm your email, then log in - an admin will finish setting up your application from there."
              : "An admin will review your business details shortly. Once approved, log in to see your referral link and QR code."}
          </p>
          <Link className="mt-4 inline-block font-medium text-brand-primary underline" to="/login">
            Back to log in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-white/60 bg-white/80 p-8 shadow-xl shadow-brand-primary/10 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-slate-900">Partner sign up</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tell us about your business - an admin will review and approve it before it goes live.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" error={errors.email?.message}>
              <input type="email" className="form-input" {...register("email")} />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <input type="password" className="form-input" {...register("password")} />
            </Field>
            <Field label="Company name" error={errors.company_name?.message}>
              <input className="form-input" {...register("company_name")} />
            </Field>
            <Field label="Contact name" error={errors.partner_name?.message}>
              <input className="form-input" {...register("partner_name")} />
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
                    options={categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
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

          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit application"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600">
          Already have an account?{" "}
          <Link className="font-medium text-brand-primary underline" to="/login">
            Log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
