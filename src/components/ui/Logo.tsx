import logo from "../../assets/konexigo-logo-cropped.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

// The source PNG is tightly cropped to the visible mark (no padding), so
// these are true rendered heights - width follows automatically to keep
// the logo's real aspect ratio instead of being stretched or squeezed.
const SIZE_MAP = {
  sm: "h-6",
  md: "h-10",
  lg: "h-12",
};

export function Logo({ size = "md" }: LogoProps) {
  return <img src={logo} alt="Konexigo" className={`${SIZE_MAP[size]} w-auto object-contain`} />;
}
