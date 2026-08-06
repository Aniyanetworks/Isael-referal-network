import type { ReactNode } from "react";

type IconButtonVariant = "default" | "danger" | "success";

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  default: "text-zinc-500 hover:bg-brand-primary/10 hover:text-brand-primary",
  danger: "text-zinc-500 hover:bg-red-50 hover:text-red-600",
  success: "text-zinc-500 hover:bg-green-50 hover:text-green-600",
};

interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: IconButtonVariant;
  disabled?: boolean;
}

export function IconButton({ icon, label, onClick, variant = "default", disabled }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 ${VARIANT_CLASSES[variant]}`}
    >
      {icon}
    </button>
  );
}
