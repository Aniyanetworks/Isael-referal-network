import type { ReactNode } from "react";
import { Footer } from "../ui/Footer";
import { Logo } from "../ui/Logo";

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-linear-to-br from-brand-primary/10 via-white to-brand-accent/10">
      <div
        aria-hidden="true"
        className="animate-float-blob pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-primary/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="animate-float-blob pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-brand-accent/25 blur-3xl"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="animate-fade-in-up mb-8">
          <Logo size="lg" />
        </div>
        <div className="animate-fade-in-up w-full" style={{ animationDelay: "0.1s" }}>
          {children}
        </div>
      </div>

      <div className="relative">
        <Footer />
      </div>
    </div>
  );
}
