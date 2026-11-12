import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

/**
 * Wraps a row of items (business badges, group badges, ...) so it scrolls
 * horizontally on mobile instead of wrapping to many lines, with arrow
 * buttons that fade in/out based on whether there's actually more to
 * scroll in that direction. From `sm:` up there's usually enough room, so
 * it reverts to a plain wrapping row and the arrows disappear.
 */
export function ScrollCarousel({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  // No dependency array - re-checks after every render (e.g. the row's
  // content changed because a search narrowed it, or it just mounted).
  // Cheap enough that re-running it every render isn't worth the
  // bookkeeping a dependency array would need from every caller.
  useEffect(() => {
    updateScrollState();
  });

  function scroll(direction: "left" | "right") {
    scrollRef.current?.scrollBy({ left: direction === "left" ? -160 : 160, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute -left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm sm:hidden"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute -right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm sm:hidden"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      )}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
