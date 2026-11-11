import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { AuthShell } from "../../components/layout/AuthShell";
import { useAuth } from "../../hooks/useAuth";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/**
 * Landed on via the link from a password-reset email: Supabase exchanges the
 * token in the URL for a real session before this ever renders (see
 * supabaseClient's detectSessionInUrl), so by the time `loading` is false we
 * either have a usable session or the link was invalid/expired.
 */
export default function ResetPassword() {
  const { session, profile, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordFormValues) {
    setFormError(null);
    try {
      await updatePassword(values.password);
      setDone(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not update password");
    }
  }

  function continueToDashboard() {
    navigate(profile?.role === "admin" ? "/admin/dashboard" : "/partner/dashboard", {
      replace: true,
    });
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/60 bg-white/80 p-8 shadow-xl shadow-brand-primary/10 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-slate-900">Set a new password</h1>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-500">Checking your reset link...</p>
        ) : !session ? (
          <>
            <p className="mt-2 text-sm text-zinc-500">
              This reset link is invalid or has expired. Request a new one to continue.
            </p>
            <Link
              to="/forgot-password"
              className="mt-6 block w-full rounded-md bg-brand-primary px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-brand-secondary"
            >
              Request a new link
            </Link>
          </>
        ) : done ? (
          <>
            <p className="mt-2 text-sm text-zinc-500">
              Your password has been updated.
            </p>
            <button
              type="button"
              onClick={continueToDashboard}
              className="mt-6 w-full rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary"
            >
              Continue to dashboard
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-zinc-500">Choose a new password for your account.</p>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="password">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-input mt-1 transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="confirmPassword">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="form-input mt-1 transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-50"
              >
                {isSubmitting ? "Updating..." : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
}
