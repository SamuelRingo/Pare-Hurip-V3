"use client";

/**
 * Pure presentational parts of the rice price prediction page:
 * summary cards, chart legend, empty state, error banner, and the
 * number/volatility formatters shared with the main chart component.
 */

import { Activity, AlertTriangle, Loader2, Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  DailyPricePoint,
  RicePricePredictionResult,
  RiceTypeOption,
  WeeklyPoint,
} from "@/lib/rice-price/api";

export const formatRupiah = (v: number | undefined | null) =>
  v === undefined || v === null
    ? "–"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(v);

export function volatilityTier(v: number): { label: string; className: string } {
  if (v < 1.5)
    return { label: "Stabil", className: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" };
  if (v < 4)
    return { label: "Sedang", className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800" };
  return { label: "Tinggi", className: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800" };
}

export interface TypeChartInfo {
  type: RiceTypeOption;
  daily: DailyPricePoint[];
  weekly: WeeklyPoint[];
  prediction?: RicePricePredictionResult;
  predictedWeeks: WeeklyPoint[]; // up to 4 weekly points ahead
  predictedAvg?: number; // average across all predictedWeeks
  predictedRangeLabel?: string;
  historicalVolatility: number;
}

/** One summary card per rice type (Card 1 grid item). */
export function TypeSummaryCard({ info, loading }: { info: TypeChartInfo; loading: boolean }) {
  const last = info.weekly[info.weekly.length - 1]?.avgPrice;
  const pred = info.predictedAvg;
  const delta = last && pred ? ((pred - last) / last) * 100 : undefined;
  const tier = volatilityTier(info.historicalVolatility);
  const TrendIcon =
    delta === undefined ? Minus : delta > 0.05 ? TrendingUp : delta < -0.05 ? TrendingDown : Minus;
  const trendColor =
    delta === undefined
      ? "text-slate-400 dark:text-slate-500"
      : delta > 0.05
      ? "text-rose-600"
      : delta < -0.05
      ? "text-emerald-600"
      : "text-slate-400 dark:text-slate-500";

  return (
    <div
      key={info.type.id}
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: info.type.color }}
          />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
            {info.type.label}
          </span>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${tier.className}`}
        >
          {tier.label}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] md:text-[11px] text-slate-400 dark:text-slate-500">Minggu Terakhir</p>
          <p className="text-sm md:text-base font-bold text-slate-800 dark:text-white">
            {formatRupiah(last)}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[10px] md:text-[11px] text-slate-400 dark:text-slate-500">Prediksi Minggu Depan</p>
          <p className="text-sm md:text-base font-bold" style={{ color: info.type.colorPrediction }}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin inline text-slate-400 dark:text-slate-500" />
            ) : (
              formatRupiah(pred)
            )}
          </p>
        </div>
      </div>

      <div className={`flex items-center gap-1 text-[11px] md:text-xs font-medium ${trendColor}`}>
        <TrendIcon className="w-3.5 h-3.5" />
        {delta !== undefined ? `${delta > 0 ? "+" : ""}${delta.toFixed(2)}%` : "Menunggu prediksi…"}
        <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">
          • Volatilitas {info.historicalVolatility.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

/** Average volatility summary tile (last grid cell in Card 1). */
export function AverageVolatilityCard({ avg, count }: { avg: number; count: number }) {
  return (
    <div className="rounded-xl border border-dashed border-green-300 dark:border-green-800 bg-green-50/60 dark:bg-green-950/20 p-4 flex flex-col justify-center col-span-1 md:col-span-1 xl:col-span-2">
      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-semibold">
        <Activity className="w-4 h-4" />
        Volatilitas Rata-rata
      </div>
      <p className="text-xl md:text-2xl font-bold text-green-700 dark:text-green-400 mt-1">
        {avg.toFixed(1)}%
      </p>
      <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 mt-1">
        Rata-rata koefisien variasi harga mingguan dari seluruh {count} jenis beras.
      </p>
    </div>
  );
}

/** Amber warning banner with a retry button (used for DB & ML errors). */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 text-xs font-medium underline hover:no-underline"
      >
        Coba Lagi
      </button>
    </div>
  );
}

/** Empty state shown when no rice type is selected for the chart. */
export function ChartEmptyState({ onSelectAll }: { onSelectAll: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-10 text-center">
      <Activity className="w-6 h-6 text-slate-300 dark:text-slate-600" />
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        Belum ada jenis beras yang dipilih. Buka dropdown di atas lalu pilih
        minimal satu jenis untuk menampilkan grafik.
      </p>
      <button
        type="button"
        onClick={onSelectAll}
        className="text-xs font-medium text-green-700 dark:text-green-400 hover:underline cursor-pointer"
      >
        Pilih Semua Jenis
      </button>
    </div>
  );
}

/** Legend row under the chart (line colors + history/prediction markers). */
export function ChartLegend({
  infos,
  avgVolatility,
  predictionWeeks,
  modelLabel = "LSTM Hybrid",
}: {
  infos: TypeChartInfo[];
  avgVolatility: number;
  predictionWeeks: number;
  modelLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs md:text-sm">
      {infos.map((info) => (
        <div key={info.type.id} className="flex items-center gap-2">
          <span className="w-6 h-0.5 rounded" style={{ backgroundColor: info.type.color }} />
          <span className="text-slate-600 dark:text-slate-300">{info.type.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 ml-auto">
        <span className="w-6 border-t-2 border-slate-400" />
        <span>Historis (mingguan)</span>
      </div>
      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
        <span
          className="w-6 border-t-2 border-dashed border-slate-400"
          style={{ display: "inline-block" }}
        />
        <span>Prediksi ({predictionWeeks} minggu, {modelLabel})</span>
      </div>
      {infos.length > 1 && (
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
          <Activity className="w-3.5 h-3.5" />
          Volatilitas rata-rata: {avgVolatility.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
