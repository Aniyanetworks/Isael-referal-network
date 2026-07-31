interface LogoProps {
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: { badge: "h-8 w-8", text: "text-base", radius: "rounded-lg" },
  md: { badge: "h-10 w-10", text: "text-lg", radius: "rounded-xl" },
  lg: { badge: "h-14 w-14", text: "text-2xl", radius: "rounded-2xl" },
};

export function Logo({ size = "md" }: LogoProps) {
  const { badge, text, radius } = SIZE_MAP[size];
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex ${badge} ${radius} items-center justify-center bg-linear-to-br from-brand-primary to-brand-secondary shadow-sm`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-1/2 w-1/2 text-white"
          aria-hidden="true"
        >
          <path
            d="M9 6a3 3 0 1 0 0 6h1M15 18a3 3 0 1 0 0-6h-1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M9.5 12h5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className={`${text} font-semibold tracking-tight text-gray-900`}>
        Refferal Network
      </span>
    </div>
  );
}
