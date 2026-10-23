import type { Metadata } from "next";
import Settings from "@/components/pages/admin-page/Settings";
import { AdminLayout } from "@/components/layout/AdminLayout";

export const metadata: Metadata = {
  title: "Pengaturan — Pare Hurip",
  robots: { index: false, follow: false },
};

export default function AdminSettingsPage() {
  return (
    <AdminLayout title="Pengaturan" subtitle="Konfigurasi fase tanam dan ekspor data sistem">
      <Settings />
    </AdminLayout>
  );
}
