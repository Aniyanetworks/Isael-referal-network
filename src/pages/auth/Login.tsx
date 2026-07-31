import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { AuthShell } from "../../components/layout/AuthShell";
import { useAuth } from "../../hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not sign in");
    }
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/60 bg-white/80 p-8 shadow-xl shadow-brand-primary/10 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Log in to your dashboard</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="email">
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
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="password">
              Password
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
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Log in"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
