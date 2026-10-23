import type { Metadata } from "next";
import ManageDataKSA from "@/components/pages/admin-page/ManageDataKSA";
import { AdminLayout } from "@/components/layout/AdminLayout";

export const metadata: Metadata = {
  title: "Kelola Data KSA — Pare Hurip",
  robots: { index: false, follow: false },
};

export default function AdminManageDataKSAPage() {
  return (
    <AdminLayout
      title="Kelola Data KSA"
      subtitle="Kelola observasi KSA secara manual dan lihat status fase tanam."
    >
      <ManageDataKSA />
    </AdminLayout>
  );
}
