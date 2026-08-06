import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayOut";
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import AdminDashboard from "../pages/admin/Dashboard";
import AdminPartners from "../pages/admin/Partners";
import AdminCategories from "../pages/admin/Categories";
import AdminReferralLinks from "../pages/admin/ReferralLinks";
import AdminAnalytics from "../pages/admin/Analytics";
import AdminPartnerAccounts from "../pages/admin/PartnerAccounts";
import PartnerDashboard from "../pages/partner/Dashboard";
import PartnerProfile from "../pages/partner/Profile";
import ReferralEntry from "../pages/customer/ReferralEntry";
import PublicPartnerProfile from "../pages/customer/PublicPartnerProfile";
import { RequireAuth } from "../components/auth/RequireAuth";
import { AdminLayout } from "../components/layout/AdminLayout";
import { PartnerLayout } from "../components/layout/PartnerLayout";

const router = createBrowserRouter([
  { path: "login", element: <Login /> },
  { path: "signup", element: <Signup /> },
  {
    element: <MainLayout />,
    children: [
      { path: "ref/:partnerSlug", element: <ReferralEntry /> },
      { path: "business/:partnerSlug", element: <PublicPartnerProfile /> },
    ],
  },
  {
    path: "/",
    element: <RequireAuth role="admin" />,
    children: [
      {
        element: <AdminLayout />,
        children: [{ index: true, element: <AdminDashboard /> }],
      },
    ],
  },
  {
    path: "/admin",
    element: <RequireAuth role="admin" />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: "dashboard", element: <AdminDashboard /> },
          { path: "partners", element: <AdminPartners /> },
          { path: "partner-accounts", element: <AdminPartnerAccounts /> },
          { path: "categories", element: <AdminCategories /> },
          { path: "referral-links", element: <AdminReferralLinks /> },
          { path: "analytics", element: <AdminAnalytics /> },
        ],
      },
    ],
  },
  {
    path: "/partner",
    element: <RequireAuth role="partner" />,
    children: [
      {
        element: <PartnerLayout />,
        children: [
          { path: "dashboard", element: <PartnerDashboard /> },
          { path: "profile", element: <PartnerProfile /> },
        ],
      },
    ],
  },
]);

export default router;
