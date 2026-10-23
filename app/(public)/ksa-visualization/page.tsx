import type { Metadata } from "next";
import PlantingPhaseChart from "@/components/pages/prediction-page/PlantingPhaseChart";
import PlantingPhaseMap from "@/components/pages/prediction-page/PlantingPhaseMap";
import React from "react";

export const metadata: Metadata = {
  title: "Visualisasi KSA — Pare Hurip",
  description:
    "Grafik dan peta fase tanam padi per kecamatan di Kota Tasikmalaya berdasarkan data Kerangka Sampel Area (KSA).",
};

const Page = () => {
  return (
    <div className="pt-20 max-w-7xl mx-auto px-4 space-y-12">
      <PlantingPhaseChart />
      <PlantingPhaseMap />
    </div>
  );
};

export default Page;
