import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Rendered into a portal at document.body rather than in place: a
  // `fixed` element only covers the full viewport when none of its
  // ancestors sets a `transform` (or `filter`/`perspective`/`will-change:
  // transform`) - any of those makes that ancestor the positioning context
  // instead of the viewport, which is exactly what this app's
  // `animate-fade-in-up`/`animate-fade-in` entrance animations do. A modal
  // opened from content wrapped in one of those classes would otherwise
  // render as a small box confined to that wrapper instead of a proper
  // full-screen overlay. The portal sidesteps the issue entirely, the same
  // way SearchableSelect's dropdown already does.
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-50 flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            ✕
          </button>
        </div>
        <div className="mt-4 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
