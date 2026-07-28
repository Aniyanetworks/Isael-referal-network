import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayOut";
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import AdminDashboard from "../pages/admin/Dashboard";
import AdminPartners from "../pages/admin/Partners";
import AdminCategories from "../pages/admin/Categories";
import AdminPartnerAccounts from "../pages/admin/PartnerAccounts";
import AdminReferralLinks from "../pages/admin/ReferralLinks";
import AdminAnalytics from "../pages/admin/Analytics";
import PartnerDashboard from "../pages/partner/Dashboard";
import PartnerDirectory from "../pages/partner/Directory";
import ReferralLanding from "../pages/customer/ReferralLanding";
import { RequireAuth } from "../components/auth/RequireAuth";
import { AdminLayout } from "../components/layout/AdminLayout";
import { PartnerLayout } from "../components/layout/PartnerLayout";

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: "login", element: <Login /> },
      { path: "signup", element: <Signup /> },
      { path: "ref/:partnerSlug", element: <ReferralLanding /> },
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
          { path: "categories", element: <AdminCategories /> },
          { path: "accounts", element: <AdminPartnerAccounts /> },
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
          { path: "directory", element: <PartnerDirectory /> },
        ],
      },
    ],
  },
]);

export default router;
