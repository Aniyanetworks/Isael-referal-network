import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { AuthShell } from "../../components/layout/AuthShell";
import { useAuth } from "../../hooks/useAuth";

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { resetPasswordForEmail } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setFormError(null);
    try {
      await resetPasswordForEmail(values.email);
      setSent(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not send reset email");
    }
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/60 bg-white/80 p-8 shadow-xl shadow-brand-primary/10 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Enter the email on your account and we'll send you a link to set a new password.
        </p>

        {sent ? (
          <div className="mt-6 rounded-md bg-brand-accent/10 p-4 text-sm text-slate-700">
            If an account exists for that email, a reset link is on its way. Check your inbox (and
            spam folder), then follow the link to choose a new password.
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="form-input mt-1 transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-zinc-600">
          <Link className="font-medium text-brand-primary underline" to="/login">
            Back to log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
