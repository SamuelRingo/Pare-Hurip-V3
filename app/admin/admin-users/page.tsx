import type { Metadata } from "next";
import AdminUsers from "@/components/pages/admin-page/AdminUsers";
import { AdminLayout } from "@/components/layout/AdminLayout";

export const metadata: Metadata = {
  title: "Pengguna Admin — Pare Hurip",
  robots: { index: false, follow: false },
};

export default function AdminUsersPage() {
  return (
    <AdminLayout title="Pengguna Admin" subtitle="Kelola akun admin dan superadmin.">
      <AdminUsers />
    </AdminLayout>
  );
}