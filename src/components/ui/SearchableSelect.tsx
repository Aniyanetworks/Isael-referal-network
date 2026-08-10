import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "./icons";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  clearLabel?: string;
  className?: string;
}

/**
 * A custom, searchable dropdown - replaces native <select> everywhere so
 * every picklist in the app (filters, form fields) gets the same look and
 * the same "type to filter" behavior once the option list gets long.
 *
 * The dropdown panel is rendered into a portal (document.body) and
 * positioned with `fixed` coordinates derived from the trigger button's
 * bounding rect. This keeps it from being clipped/squashed when the
 * select lives inside a scrollable/overflow container (e.g. a table cell
 * in a horizontally-scrolling table).
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  clearLabel,
  className = "",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, query]);

  // Recalculate position whenever the dropdown opens, and keep it in sync
  // on scroll/resize while it stays open (e.g. scrolling the table).
  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const estimatedPanelHeight = Math.min(filtered.length * 36 + 48, 260);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < estimatedPanelHeight && rect.top > spaceBelow;

      setCoords({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUp,
      });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  function select(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:border-brand-primary/60 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      >
        <span className={selected ? "truncate text-slate-900" : "truncate text-zinc-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: Math.max(coords.width, 192),
              transform: coords.openUp ? "translateY(-100%)" : undefined,
            }}
            className="z-50 rounded-lg border border-zinc-200 bg-white shadow-lg"
          >
            <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
              <SearchIcon className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full text-sm text-slate-700 outline-none placeholder:text-zinc-400"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {clearLabel && (
                <li>
                  <button
                    type="button"
                    onClick={() => select("")}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-600 hover:bg-brand-primary/10 hover:text-brand-primary"
                  >
                    {clearLabel}
                    {!value && <CheckIcon className="h-4 w-4 text-brand-primary" />}
                  </button>
                </li>
              )}
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-zinc-400">No matches</li>
              )}
              {filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => select(option.value)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-brand-primary/10 hover:text-brand-primary"
                  >
                    <span className="truncate">{option.label}</span>
                    {option.value === value && <CheckIcon className="h-4 w-4 shrink-0 text-brand-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
