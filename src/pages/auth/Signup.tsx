import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../../hooks/useAuth";

const signupSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupFormValues) {
    setFormError(null);
    try {
      await signUp(values.email, values.password);
      setSubmitted(true);
    } catch (error) {
      if (isAlreadyRegisteredError(error)) {
        // They already have an account - if this password is theirs, just
        // log them in instead of making them go find the login page.
        try {
          await signIn(values.email, values.password);
          navigate("/admin/dashboard", { replace: true });
          return;
        } catch {
          setFormError("This email is already registered. Check your password, or log in below.");
          return;
        }
      }
      setFormError(error instanceof Error ? error.message : "Could not create account");
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto mt-16 max-w-sm rounded-xl border border-gray-200 p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Almost done</h1>
        <p className="mt-2 text-sm text-gray-600">
          Confirm your email if prompted, then an admin will link your account
          to your business listing before your dashboard becomes available.
        </p>
        <Link className="mt-4 inline-block font-medium text-gray-900 underline" to="/login">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-xl border border-gray-200 p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900">Partner sign up</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link className="font-medium text-gray-900 underline" to="/login">
          Log in
        </Link>
      </p>
    </div>
  );
}
