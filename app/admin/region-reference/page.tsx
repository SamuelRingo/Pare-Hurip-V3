import type { Metadata } from "next";
import RegionReference from "@/components/pages/admin-page/RegionReference";
import { AdminLayout } from "@/components/layout/AdminLayout";

export const metadata: Metadata = {
  title: "Referensi Wilayah — Pare Hurip",
  robots: { index: false, follow: false },
};

export default function AdminRegionReferencePage() {
  return (
    <AdminLayout
      title="Referensi Wilayah"
      subtitle="Kelola daftar kecamatan wilayah sampel."
    >
      <RegionReference />
    </AdminLayout>
  );
}
