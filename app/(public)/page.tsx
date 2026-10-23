import type { Metadata } from "next";
import AboutKSA from "@/components/pages/landing-page/AboutKSA";
import Algorithm from "@/components/pages/landing-page/Algorithm";
import Benefits from "@/components/pages/landing-page/Benefits";
import Hero from "@/components/pages/landing-page/Hero";
import KSAMethod from "@/components/pages/landing-page/KSAMethod";
import RiceGrowthCycle from "@/components/pages/landing-page/RiceGrowthCycle";

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

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Pare Hurip — Prediksi Fase Tanam KSA & Harga Beras",
  url: "https://parehurip.app",
  description: metadata.description,
  provider: {
    "@type": "GovernmentOrganization",
    name: "BPS Kota Tasikmalaya",
  },
};

/** Serialize with `<` escaped (\u003c) so a future dynamic value can never break out of the inline <script> tag */
const jsonLdHtml = JSON.stringify(JSON_LD).replace(/</g, "\\u003c");

export default function Home() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
      />
      <Hero
        heading="Menyediakan data hasil KSA untuk perhitungan prediksi hasil panen padi secara akurat."
        message='"Menyediakan data pertanian yang lebih baik untuk kesejahteraan petani"'
      />
      <AboutKSA />
      <Benefits />
      <KSAMethod/>
      <Algorithm/>
      <RiceGrowthCycle/>
    </main>
  );
}
