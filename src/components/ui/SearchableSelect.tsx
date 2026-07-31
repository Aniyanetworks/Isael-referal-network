import { useEffect, useMemo, useRef, useState } from "react";
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
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
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
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:border-brand-primary/60 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      >
        <span className={selected ? "truncate text-gray-900" : "truncate text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 left-0 z-30 mt-1 min-w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <SearchIcon className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {clearLabel && (
              <li>
                <button
                  type="button"
                  onClick={() => select("")}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-600 hover:bg-brand-primary/10 hover:text-brand-primary"
                >
                  {clearLabel}
                  {!value && <CheckIcon className="h-4 w-4 text-brand-primary" />}
                </button>
              </li>
            )}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">No matches</li>
            )}
            {filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => select(option.value)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-primary/10 hover:text-brand-primary"
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <CheckIcon className="h-4 w-4 shrink-0 text-brand-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
