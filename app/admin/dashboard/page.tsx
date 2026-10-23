import type { Metadata } from "next";
import Dashboard from "@/components/pages/admin-page/Dashboard";
import { AdminLayout } from "@/components/layout/AdminLayout";

export const metadata: Metadata = {
  title: "Dashboard — Pare Hurip",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <AdminLayout title="Dashboard">
      <Dashboard />
    </AdminLayout>
  );
}
