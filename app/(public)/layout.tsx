import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Prediksi Fase Tanam KSA & Harga Beras | BPS Kota Tasikmalaya",
  description: "Sistem prediksi fase tanam berbasis Kerangka Sampel Area (KSA) dan analisis harga beras real-time di Kota Tasikmalaya oleh BPS Kota Tasikmalaya.",
  keywords: [
    "Beras Tasikmalaya",
    "Prediksi Harga Beras",
    "Fase Tanam KSA",
    "BPS Kota Tasikmalaya",
    "Kerangka Sampel Area",
    "Pangan Tasikmalaya",
    "Pertanian Tasikmalaya",
  ],
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="overflow-x-hidden">
      <Header />
      {children}
      <Footer />
    </div>
  );
}