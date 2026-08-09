import logo from "../../assets/konexigo-logo-transparent.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "h-5",
  md: "h-6",
  lg: "h-16 w-16",
};

export function Logo({ size = "md" }: LogoProps) {
  return <img src={logo} alt="Konexigo" 
  className={`${SIZE_MAP[size]} object-contain w-full`}
   />;
}
