import type { Metadata } from "next";
import RicePricePredictionChart from "@/components/pages/compare-page/RicePricePredictionChart";
import RicePriceHistoryTable from "@/components/pages/compare-page/RicePriceHistoryTable";

export const metadata: Metadata = {
  title: "Prediksi Harga Beras — Pare Hurip",
  description:
    "Pantau grafik perkembangan dan prediksi harga beras mingguan di Kota Tasikmalaya berbasis machine learning (LSTM Hybrid).",
};

export default function Page() {
  return (
    <div className="bg-white dark:bg-slate-950 min-h-screen">
      {/* HERO */}
      <header className="pt-28 pb-8 px-4 md:px-8 max-w-7xl mx-auto text-center md:text-left">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-800 dark:text-white leading-tight">
          Prediksi &amp; Tren <span className="text-green-600">Harga Beras</span>
        </h1>
        <p className="mt-4 text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
          Pantau grafik perkembangan dan prediksi harga beras mingguan di Kota Tasikmalaya berbasis Machine Learning.
        </p>
      </header>

      {/* RICE PRICE CHART + HISTORY TABLE */}
      <main className="px-4 md:px-8 max-w-7xl mx-auto pb-20 space-y-8">
        <RicePricePredictionChart />
        <RicePriceHistoryTable />
      </main>
    </div>
  );
}
