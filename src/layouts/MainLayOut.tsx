import { Outlet } from "react-router-dom";

// Wraps the three public customer routes (/ref, /business, /network).
// No width/padding constraint here - each of those pages already centers
// its own content (its own max-w-2xl wrapper) while needing its own
// full-bleed `min-h-screen` background behind it. Constraining the outer
// container (as this used to do with max-w-6xl) capped that background to
// the container's width instead of the full page.
export default function MainLayout() {
  return <Outlet />;
}
