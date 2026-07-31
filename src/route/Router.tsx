import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayOut";
import Login from "../pages/auth/Login";
import AdminDashboard from "../pages/admin/Dashboard";
import AdminPartners from "../pages/admin/Partners";
import AdminCategories from "../pages/admin/Categories";
import AdminReferralLinks from "../pages/admin/ReferralLinks";
import AdminAnalytics from "../pages/admin/Analytics";
import ReferralEntry from "../pages/customer/ReferralEntry";
import PublicPartnerProfile from "../pages/customer/PublicPartnerProfile";
import { RequireAuth } from "../components/auth/RequireAuth";
import { AdminLayout } from "../components/layout/AdminLayout";

const router = createBrowserRouter([
  { path: "login", element: <Login /> },
  {
    element: <MainLayout />,
    children: [
      { path: "ref/:partnerSlug", element: <ReferralEntry /> },
      { path: "business/:partnerSlug", element: <PublicPartnerProfile /> },
    ],
  },
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [{ index: true, element: <AdminDashboard /> }],
      },
    ],
  },
  {
    path: "/admin",
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: "dashboard", element: <AdminDashboard /> },
          { path: "partners", element: <AdminPartners /> },
          { path: "categories", element: <AdminCategories /> },
          { path: "referral-links", element: <AdminReferralLinks /> },
          { path: "analytics", element: <AdminAnalytics /> },
        ],
      },
    ],
  },
]);

export default router;
