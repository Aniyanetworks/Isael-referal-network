import logo from "../../assets/isael-logo.webp";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "h-5",
  md: "h-6",
  lg: "h-8",
};

export function Logo({ size = "md" }: LogoProps) {
  return <img src={logo} alt="Isael logo" className={SIZE_MAP[size]} />;
}
