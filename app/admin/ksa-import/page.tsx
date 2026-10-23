import type { Metadata } from "next";
import ImportDataKSA from "@/components/pages/admin-page/ImportDataKSA";
import { AdminLayout } from "@/components/layout/AdminLayout";

export const metadata: Metadata = {
  title: "Import Data KSA — Pare Hurip",
  robots: { index: false, follow: false },
};

export default function AdminImportDataKsaPage() {
  return (
    <AdminLayout title="Import Data KSA">
      <ImportDataKSA />
    </AdminLayout>
  );
}
