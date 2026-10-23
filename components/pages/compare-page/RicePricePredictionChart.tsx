/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Activity,
  ChevronDown,
  Wheat,
} from "lucide-react";
import {
  RICE_TYPES,
  DailyPricePoint,
  WeeklyPoint,
  RicePricePredictionResult,
  fetchRicePriceHistory,
  aggregateWeekly,
  computeVolatility,
  predictRicePrices,
  PRICE_PREDICTION_MODELS,
  clearPricePredictionCache,
  type PricePredictionModel,
} from "@/lib/rice-price/api";
import { cn } from "@/lib/utils";
import {
  formatRupiah,
  TypeChartInfo,
  TypeSummaryCard,
  AverageVolatilityCard,
  ErrorBanner,
  ChartEmptyState,
  ChartLegend,
} from "@/components/pages/compare-page/RicePriceChartParts";
import { useIsMobile } from "@/lib/use-media-query";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HISTORY_WEEKS = 8;
const DAILY_DAYS = 63;
const FEED_DAYS = 61;
const PREDICTION_WEEKS = 4;
const PREDICTION_HORIZON_DAYS = PREDICTION_WEEKS * 7; // 28 days (4 weeks) out of the 30 days returned by the API
const AUTO_RETRY_DELAY_MS = 4000;
const FUTURE_KEY_PREFIX = "future";

const formatDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

/** Aggregate the first 28 days of the API's daily predictions into 4 weekly points */
function buildFutureWeeklyPoints(prediction: RicePricePredictionResult | undefined): WeeklyPoint[] {
  if (!prediction || prediction.predictions.length === 0) return [];
  const daily: DailyPricePoint[] = prediction.predictions
    .slice(0, PREDICTION_HORIZON_DAYS)
    .map((p) => ({ date: p.target_date, price: p.predicted_price }));
  return aggregateWeekly(daily, FUTURE_KEY_PREFIX).slice(0, PREDICTION_WEEKS);
}

interface ChartRow {
  weekKey: string;
  label: string;
  rangeLabel: string;
  isFuture: boolean;
  [dataKey: string]: any;
}

const ALL_TYPE_IDS = RICE_TYPES.map((rt) => rt.id);

export default function RicePricePredictionChart() {
  const isMobile = useIsMobile();
  const [dailyByType, setDailyByType] = useState<Record<string, DailyPricePoint[]>>({});
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyRetryTick, setHistoryRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setHistoryError(null);
    async function load() {
      try {
        const promises = RICE_TYPES.map(async (rt, idx) => {
          const daily = await fetchRicePriceHistory(idx + 1, DAILY_DAYS);
          return { id: rt.id, daily };
        });
        const results = await Promise.all(promises);
        if (cancelled) return;
        const map: Record<string, DailyPricePoint[]> = {};
        results.forEach((r) => (map[r.id] = r.daily));
        setDailyByType(map);
      } catch (err) {
        if (cancelled) return;
        // Log technical detail for debugging; show generic message to user
        console.warn("[rice-price] history load failed", err);
        setDailyByType({});
        setHistoryError("Gagal memuat data. Silakan coba lagi.");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [historyRetryTick]);

  const weeklyByType = useMemo(() => {
    const map: Record<string, WeeklyPoint[]> = {};
    RICE_TYPES.forEach((rt) => {
      map[rt.id] = aggregateWeekly(dailyByType[rt.id] ?? []);
    });
    return map;
  }, [dailyByType]);

  // --- Global price model affecting both summary and chart ---
  const [priceModel, setPriceModel] = useState<PricePredictionModel>("lstm");

  // --- Predictions fetched for ALL rice types at once (used by Card 1) ---
  const [predictions, setPredictions] = useState<Record<string, RicePricePredictionResult>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  /** Switch price model and trigger refetch for all rice types */
  const handlePriceModelChange = (model: PricePredictionModel) => {
    if (model === priceModel) return;
    clearPricePredictionCache();
    setPriceModel(model);
  };

  // Label for the active price model (used in UI texts and error messages)
  const activeModelLabel =
    PRICE_PREDICTION_MODELS.find((m) => m.value === priceModel)?.label ?? "LSTM";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);

    const store = dailyByType; // read once in the closure
    if (Object.keys(store).length === 0) {
      setLoading(false);
      return;
    }

    const items = RICE_TYPES.map((type) => {
      const daily = store[type.id];
      if (!daily || daily.length < FEED_DAYS) return null;
      const feed = daily.slice(-FEED_DAYS);
      return {
        rice_type: type.label,
        last_prices: feed.map((d) => d.price),
        last_price_date: feed[feed.length - 1].date,
      };
    }).filter(Boolean) as { rice_type: string; last_prices: number[]; last_price_date: string }[];

    if (items.length === 0) { setLoading(false); return; }

    (async () => {
      try {
        const results = await predictRicePrices(items, priceModel);
        if (cancelled) return;
        const map: Record<string, RicePricePredictionResult> = {};
        results.forEach((r) => {
          const type = RICE_TYPES.find((rt) => rt.label === r.rice_type);
          if (type) map[type.id] = r;
        });
        setPredictions(map);
      } catch (err) {
        if (cancelled) return;
        // Log technical detail for debugging; show generic message to user
        console.warn("[rice-price] prediction failed", { priceModel, error: err });
        setPredictions({});
        setErrorMsg("Prediksi tidak tersedia saat ini. Menampilkan data historis saja.");

        if (retryTick === 0) {
          setTimeout(() => {
            if (!cancelled) setRetryTick((t) => t + 1);
          }, AUTO_RETRY_DELAY_MS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dailyByType, retryTick, priceModel]);

  // --- Full info for ALL rice types (used by Card 1: summary) ---
  const allInfos: TypeChartInfo[] = useMemo(() => {
    return RICE_TYPES.map((type) => {
      const daily = dailyByType[type.id];
      const weekly = weeklyByType[type.id];
      const prediction = predictions[type.id];
      const predictedWeeks = buildFutureWeeklyPoints(prediction);
      let predictedAvg: number | undefined;
      let predictedRangeLabel: string | undefined;
      if (predictedWeeks.length > 0) {
        predictedAvg =
          predictedWeeks.reduce((s, w) => s + w.avgPrice, 0) / predictedWeeks.length;
        predictedRangeLabel = `${formatDateShort(predictedWeeks[0].startDate)} – ${formatDateShort(
          predictedWeeks[predictedWeeks.length - 1].endDate
        )}`;
      }
      return {
        type,
        daily,
        weekly,
        prediction,
        predictedWeeks,
        predictedAvg,
        predictedRangeLabel,
        historicalVolatility: computeVolatility(weekly.map((w) => w.avgPrice)),
      };
    });
  }, [dailyByType, weeklyByType, predictions]);

  const avgVolatilityAll =
    allInfos.length > 0
      ? allInfos.reduce((s, i) => s + i.historicalVolatility, 0) / allInfos.length
      : 0;

  // --- Selector SPECIFIC to the chart in Card 2 ---
  const [chartSelectedIds, setChartSelectedIds] = useState<string[]>([
    RICE_TYPES[0].id,
    RICE_TYPES[2].id,
    RICE_TYPES[4].id,
  ]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleChartType = (id: string) => {
    setChartSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const chartInfos: TypeChartInfo[] = useMemo(
    () => allInfos.filter((info) => chartSelectedIds.includes(info.type.id)),
    [allInfos, chartSelectedIds]
  );

  // ---------------------------------------------------------------------------
  // Build combined chart data: history + 4 weekly prediction points ahead
  // ---------------------------------------------------------------------------
  const { rows, boundaryKey, rangeLookup } = useMemo(() => {
    const referenceWeekly = chartInfos[0]?.weekly ?? weeklyByType[RICE_TYPES[0].id];
    const referenceFutureWeekly = chartInfos[0]?.predictedWeeks ?? [];
    const rangeMap: Record<string, string> = {};

    const historicalRows: ChartRow[] = referenceWeekly.map((w, idx) => {
      const row: ChartRow = {
        weekKey: w.weekKey,
        label: w.label,
        rangeLabel: w.rangeLabel,
        isFuture: false,
      };
      rangeMap[w.weekKey] = w.rangeLabel;
      const isBoundary = idx === referenceWeekly.length - 1;
      chartInfos.forEach((info) => {
        const point = info.weekly[idx];
        if (!point) return;
        row[`hist_${info.type.id}`] = point.avgPrice;
        if (isBoundary) {
          row[`pred_${info.type.id}`] = point.avgPrice; // connects the line to the first prediction point
        }
      });
      return row;
    });

    const futureRows: ChartRow[] = [];
    if (referenceFutureWeekly.length > 0) {
      referenceFutureWeekly.forEach((fw, idx) => {
        const row: ChartRow = {
          weekKey: fw.weekKey,
          label: fw.label,
          rangeLabel: fw.rangeLabel,
          isFuture: true,
        };
        rangeMap[fw.weekKey] = fw.rangeLabel;
        chartInfos.forEach((info) => {
          const point = info.predictedWeeks[idx];
          if (point) row[`pred_${info.type.id}`] = point.avgPrice;
        });
        futureRows.push(row);
      });
    } else if (referenceWeekly.length > 0) {
      // Placeholder 4 prediction weeks while ML results are pending, so the
      // X axis is stable from the start (history doesn't stretch fully and
      // then "jump" when predictions arrive).
      const base = new Date(referenceWeekly[referenceWeekly.length - 1].endDate);
      for (let i = 0; i < PREDICTION_WEEKS; i++) {
        const start = new Date(base);
        start.setDate(start.getDate() + 1 + i * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const startLabel = start.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        });
        const endLabel = end.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const weekKey = `${FUTURE_KEY_PREFIX}-${i}`;
        futureRows.push({
          weekKey,
          label: startLabel,
          rangeLabel: `${startLabel} – ${endLabel}`,
          isFuture: true,
        });
        rangeMap[weekKey] = `${startLabel} – ${endLabel}`;
      }
    }

    const boundary = referenceWeekly[referenceWeekly.length - 1]?.weekKey ?? "";

    return {
      rows: [...historicalRows, ...futureRows],
      boundaryKey: boundary,
      rangeLookup: rangeMap,
    };
  }, [chartInfos, weeklyByType]);

  const avgVolatilityChart =
    chartInfos.length > 0
      ? chartInfos.reduce((s, i) => s + i.historicalVolatility, 0) / chartInfos.length
      : 0;

  const yDomain = useMemo((): [number, number] | undefined => {
    let min = Infinity;
    let max = -Infinity;
    rows.forEach((row) => {
      chartInfos.forEach((info) => {
        const h = row[`hist_${info.type.id}`];
        const p = row[`pred_${info.type.id}`];
        if (typeof h === "number") {
          min = Math.min(min, h);
          max = Math.max(max, h);
        }
        if (typeof p === "number") {
          min = Math.min(min, p);
          max = Math.max(max, p);
        }
      });
    });
    if (!isFinite(min) || !isFinite(max)) return undefined;
    const pad = Math.max(200, (max - min) * 0.15);
    return [Math.floor((min - pad) / 100) * 100, Math.ceil((max + pad) / 100) * 100];
  }, [rows, chartInfos]);

  if (Object.keys(dailyByType).length === 0) {
    if (historyError) {
      return (
        <Card className="border-amber-300 dark:border-amber-800 shadow-sm">
          <CardContent className="p-4">
            <ErrorBanner message={historyError} onRetry={() => setHistoryRetryTick((t) => t + 1)} />
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Memuat data harga beras">
        <Card className="border-green-100 dark:border-green-900/40 shadow-sm">
          <CardHeader>
            <div className="h-6 w-56 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-4 w-96 max-w-full rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3"
                >
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="h-8 w-1/2 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ))}
              <div className="rounded-xl border border-dashed border-green-300 dark:border-green-800 p-4 col-span-1 md:col-span-1 xl:col-span-2">
                <div className="h-4 w-2/3 rounded bg-green-200/50 dark:bg-green-900/40 animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-100 dark:border-green-900/40 shadow-sm">
          <CardContent className="p-4">
            <div className="h-[420px] md:h-[480px] rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Global price model selector — affects both summary and chart */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-green-100 dark:border-green-900/40 bg-white dark:bg-slate-900/50 px-4 py-3 shadow-sm">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 shrink-0">
          Model Prediksi
        </span>
        <div className="grid grid-cols-2 gap-1 rounded-lg border p-1 w-full sm:w-auto sm:ml-auto">
          {PRICE_PREDICTION_MODELS.map((model) => (
            <button
              key={model.value}
              type="button"
              onClick={() => handlePriceModelChange(model.value)}
              className={cn(
                "rounded-md px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                priceModel === model.value
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-green-50 dark:hover:bg-green-950/40"
              )}
            >
              {model.label}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================== */}
      {/* CARD 1 — Summary of ALL rice types, no dropdown      */}
      {/* =========================================================== */}
      <Card className="overflow-hidden border-green-100 dark:border-green-900/40 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1 text-slate-800 dark:text-white">
            <Wheat className="w-5 h-5 text-green-600" />
            Ringkasan Harga Beras
          </CardTitle>
          <CardDescription className="max-w-xl text-xs md:text-sm leading-relaxed">
            Harga minggu terakhir vs proyeksi minggu depan untuk semua jenis beras yang dipantau.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-1 space-y-1">
          {errorMsg && (
            <ErrorBanner message={errorMsg} onRetry={() => setRetryTick((t) => t + 1)} />
          )}

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            {allInfos.map((info) => (
              <TypeSummaryCard key={info.type.id} info={info} loading={loading} />
            ))}

            <AverageVolatilityCard avg={avgVolatilityAll} count={allInfos.length} />
          </div>
        </CardContent>
      </Card>

      {/* =========================================================== */}
      {/* CARD 2 — Chart with the line picker dropdown                */}
      {/* =========================================================== */}
      <Card className="border-green-100 dark:border-green-900/40 shadow-sm">
        <CardHeader className="pb-3 relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white text-base md:text-lg">
                <Activity className="w-4.5 h-4.5 text-green-600" />
                Tren &amp; Prediksi Harga
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {HISTORY_WEEKS} minggu historis tersambung dengan proyeksi{" "}
                <strong>{PREDICTION_WEEKS} minggu ke depan</strong> model {activeModelLabel}. Garis solid =
                historis, garis putus-putus = prediksi.
              </CardDescription>
            </div>

            {/* --- Chart line picker dropdown --- */}
            <div className="relative w-full sm:w-auto shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
                className="flex w-full sm:w-auto items-center justify-between sm:justify-normal gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:border-slate-400 dark:hover:border-slate-500 transition-colors cursor-pointer"
              >
                <span className="flex -space-x-1">
                  {chartSelectedIds.slice(0, 3).map((id) => {
                    const rt = RICE_TYPES.find((r) => r.id === id)!;
                    return (
                      <span
                        key={id}
                        className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800"
                        style={{ backgroundColor: rt.color }}
                      />
                    );
                  })}
                </span>
                {chartSelectedIds.length === 0
                  ? "Pilih Jenis Beras"
                  : `${chartSelectedIds.length} Line Ditampilkan`}
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 left-0 sm:left-auto z-30 mt-2 w-full sm:w-72 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-xl ring-1 ring-slate-200/70 dark:ring-slate-700/70 p-2">
                  <div className="flex items-center justify-between px-1.5 py-1 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Bandingkan hingga 6 jenis</span>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="text-green-700 dark:text-green-400 hover:underline cursor-pointer"
                        onClick={() => setChartSelectedIds(ALL_TYPE_IDS)}
                      >
                        Pilih Semua
                      </button>
                      <button
                        type="button"
                        className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                        onClick={() => setChartSelectedIds([])}
                      >
                        Bersihkan
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 max-h-64 overflow-y-auto">
                    {RICE_TYPES.map((rt) => (
                      <label
                        key={rt.id}
                        className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm transition-colors"
                      >
                        <Checkbox
                          checked={chartSelectedIds.includes(rt.id)}
                          onCheckedChange={() => toggleChartType(rt.id)}
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: rt.color }}
                        />
                        <span className="text-slate-700 dark:text-slate-200">{rt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2 space-y-4">
          {chartSelectedIds.length === 0 ? (
            <ChartEmptyState onSelectAll={() => setChartSelectedIds(ALL_TYPE_IDS)} />
          ) : (
            <>
              <div className="h-[420px] md:h-[480px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={rows} margin={{ top: 10, right: isMobile ? 8 : 24, left: isMobile ? 4 : 8, bottom: 8 }}>
                    <defs>
                      {chartInfos.map((info) => (
                        <linearGradient
                          key={`grad-${info.type.id}`}
                          id={`grad-${info.type.id}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={info.type.color} stopOpacity={0.32} />
                          <stop offset="100%" stopColor={info.type.color} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="weekKey"
                      tickFormatter={(key: string) => {
                        const row = rows.find((r) => r.weekKey === key);
                        return row?.label ?? key;
                      }}
                      stroke="var(--muted-foreground)"
                      fontSize={isMobile ? 10 : 12}
                      minTickGap={isMobile ? 20 : 8}
                    />
                    <YAxis
                      tickFormatter={(v) => formatRupiah(v)}
                      domain={yDomain as [number, number]}
                      width={isMobile ? 64 : 95}
                      stroke="var(--muted-foreground)"
                      fontSize={isMobile ? 10 : 12}
                    />
                    <Tooltip content={<RiceTooltip infos={chartInfos} rangeLookup={rangeLookup} />} offset={isMobile ? 10 : 14} />

                    {boundaryKey && (
                      <ReferenceLine
                        x={boundaryKey}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        label={{
                          value: "Sekarang → Prediksi",
                          position: "insideTopRight",
                          fill: "#64748b",
                          fontSize: 11,
                        }}
                      />
                    )}

                    {chartInfos.map((info) => (
                      <React.Fragment key={info.type.id}>
                        <Area
                          dataKey={`hist_${info.type.id}`}
                          name={info.type.label}
                          type="monotone"
                          stroke={info.type.color}
                          strokeWidth={2.5}
                          fill={`url(#grad-${info.type.id})`}
                          dot={{ r: 3, strokeWidth: 0, fill: info.type.color }}
                          activeDot={{ r: 6 }}
                          connectNulls
                          legendType="none"
                          isAnimationActive
                        />
                        <Line
                          dataKey={`pred_${info.type.id}`}
                          type="monotone"
                          stroke={info.type.colorPrediction}
                          strokeWidth={2.5}
                          strokeDasharray="7 5"
                          dot={{ r: 5, strokeWidth: 2, stroke: info.type.colorPrediction, fill: "white" }}
                          activeDot={{ r: 7 }}
                          connectNulls
                          legendType="none"
                          isAnimationActive
                        />
                      </React.Fragment>
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* --- Custom legend --- */}
              <ChartLegend
                infos={chartInfos}
                avgVolatility={avgVolatilityChart}
                predictionWeeks={PREDICTION_WEEKS}
                modelLabel={activeModelLabel}
              />

              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Data historis bersumber dari BI Harga Pangan (bi.go.id/hargapangan).
                {errorMsg
                  ? " Prediksi tidak tersedia saat ini karena service prediksi tidak dapat dihubungi; grafik menampilkan data historis saja."
                  : " Hasil prediksi merupakan estimasi model dan dapat berbeda dari kondisi aktual di lapangan."}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function RiceTooltip({
  active,
  payload,
  label,
  infos,
  rangeLookup,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  infos: TypeChartInfo[];
  rangeLookup: Record<string, string>;
}) {
  if (!active || !payload || payload.length === 0 || !label) return null;

  const isFuture = label.startsWith(FUTURE_KEY_PREFIX);

  return (
    <div className="rounded-lg border bg-white dark:bg-slate-900 shadow-lg p-3.5 text-xs md:text-sm min-w-[220px]">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <span className="font-semibold text-slate-700 dark:text-slate-100">
          {rangeLookup[label] ?? label}
        </span>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            isFuture ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {isFuture ? "Prediksi" : "Historis"}
        </span>
      </div>
      <div className="space-y-2">
        {infos.map((info) => {
          const histKey = `hist_${info.type.id}`;
          const predKey = `pred_${info.type.id}`;
          const histEntry = payload.find((p) => p.dataKey === histKey);
          const predEntry = payload.find((p) => p.dataKey === predKey);
          const value = isFuture ? predEntry?.value : histEntry?.value ?? predEntry?.value;
          if (value === undefined || value === null) return null;
          const week = isFuture
            ? info.predictedWeeks.find((w) => w.weekKey === label)
            : undefined;
          const confidence = week?.confidence;
          const lstmWeight = info.prediction?.lstm_weight;
          const confidenceLabel =
            confidence !== undefined
              ? `keyakinan ${confidence <= 1 ? Math.round(confidence * 100) : confidence}%`
              : undefined;
          return (
            <div key={info.type.id} className="space-y-0.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isFuture ? info.type.colorPrediction : info.type.color }}
                  />
                  <span className="truncate text-slate-600 dark:text-slate-300">{info.type.label}</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-white shrink-0">
                  {formatRupiah(value)}
                </span>
              </div>
              {isFuture && lstmWeight !== undefined && (
                <p className="text-[10px] text-slate-400 pl-3 dark:text-slate-500">
                  bobot LSTM {(lstmWeight * 100).toFixed(0)}%
                  {confidenceLabel ? ` · ${confidenceLabel}` : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}