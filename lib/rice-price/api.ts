/**
 * Data & API module for the "Weekly Rice Price Prediction" chart.
 *
 * The ML model (LSTM Hybrid) actually predicts prices DAILY.
 * On the frontend side, those daily values (both historical and
 * predicted) are aggregated into WEEKLY averages for the chart,
 * making it more compact and readable.
 *
 * Data sources:
 * - History    -> from the `rice_prices` table in Supabase (database).
 * - Prediction -> proxied through the Next.js API route
 *   `/api/v1/rice-price/predict/batch`, which calls the local ML service
 *   (`ml-pare-hurip`), endpoint `/api/v1/lstm-hybrid-price/predict/batch`.
 *   Always called in batch for ALL rice types at once (used by the summary
 *   card); the chart card just filters these results, it doesn't re-fetch
 *   per type.
 */

import { supabase } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// 1. Rice types
// ---------------------------------------------------------------------------

export interface RiceTypeOption {
  id: string;
  /** Exact name sent to the API (`rice_type`) */
  label: string;
  /** Line identity color (history, solid) */
  color: string;
  /** Line identity color (prediction, slightly lighter) */
  colorPrediction: string;
}

export const RICE_TYPES: RiceTypeOption[] = [
  { id: "bawah-1", label: "Beras Kualitas Bawah I", color: "#ea580c", colorPrediction: "#fb923c" },
  { id: "bawah-2", label: "Beras Kualitas Bawah II", color: "#d97706", colorPrediction: "#fbbf24" },
  { id: "medium", label: "Beras Kualitas Medium I", color: "#16a34a", colorPrediction: "#4ade80" },
  { id: "medium-2", label: "Beras Kualitas Medium II", color: "#0d9488", colorPrediction: "#2dd4bf" },
  { id: "super-1", label: "Beras Kualitas Super I", color: "#2563eb", colorPrediction: "#60a5fa" },
  { id: "super-2", label: "Beras Kualitas Super II", color: "#7c3aed", colorPrediction: "#a78bfa" },
];

export interface DailyPricePoint {
  date: string;
  price: number;
  /**
   * Optional — only set when the prediction API sends it.
   * Never fabricated by the frontend.
   */
  confidence?: number;
}

export async function fetchRicePriceHistory(
  riceTypeId: number,
  days: number
): Promise<DailyPricePoint[]> {
  const { data, error } = await supabase
    .from("rice_prices")
    .select("date, price")
    .eq("rice_type_id", riceTypeId)
    .order("date", { ascending: false })
    .limit(days);

  if (error) {
    // Log technical detail for debugging; show generic message to user
    console.warn("[rice-price] fetch history failed", error);
    throw new Error("Gagal memuat data. Silakan coba lagi.");
  }

  if (!data || data.length === 0) return [];

  return data.reverse().map((row) => ({
    date: row.date,
    price: row.price,
  }));
}

 /** Fetch daily price history within a given date range (inclusive) */
export async function fetchRicePriceByRange(
  riceTypeId: number,
  fromDate: string,
  toDate: string
): Promise<DailyPricePoint[]> {
  const { data, error } = await supabase
    .from("rice_prices")
    .select("date, price")
    .eq("rice_type_id", riceTypeId)
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date", { ascending: true });

  if (error) {
    // Log technical detail for debugging; show generic message to user
    console.warn("[rice-price] fetch range failed", error);
    throw new Error("Gagal memuat data. Silakan coba lagi.");
  }

  if (!data) return [];

  return data.map((row) => ({
    date: row.date,
    price: row.price,
  }));
}

// ---------------------------------------------------------------------------
// 3. Daily -> weekly aggregation
// ---------------------------------------------------------------------------

export interface WeeklyPoint {
  weekKey: string; // unique week identifier, used as the X category
  label: string; // short label shown on the X axis
  rangeLabel: string; // full label "13 - 19 Jul 2026" for the tooltip
  startDate: string;
  endDate: string;
  avgPrice: number;
  /** Average daily confidence (when every day in the week has it) */
  confidence?: number;
}

const DATE_FMT = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
const DATE_FMT_YEAR = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

/** Group daily data (chronological) into 7-day buckets */
export function aggregateWeekly(daily: DailyPricePoint[], keyPrefix = "w"): WeeklyPoint[] {
  const weeks: WeeklyPoint[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    if (chunk.length === 0) continue;
    const avg = chunk.reduce((sum, d) => sum + d.price, 0) / chunk.length;
    const start = new Date(chunk[0].date);
    const end = new Date(chunk[chunk.length - 1].date);
    let confidence: number | undefined;
    if (chunk.every((d) => typeof d.confidence === "number")) {
      confidence =
        chunk.reduce((sum, d) => sum + (d.confidence as number), 0) / chunk.length;
    }
    weeks.push({
      weekKey: `${keyPrefix}-${weeks.length}`,
      label: `${DATE_FMT.format(start)}`,
      rangeLabel: `${DATE_FMT.format(start)} – ${DATE_FMT_YEAR.format(end)}`,
      startDate: chunk[0].date,
      endDate: chunk[chunk.length - 1].date,
      avgPrice: Math.round(avg),
      confidence,
    });
  }
  return weeks;
}

/** Coefficient of variation (stdev / mean) in percent — used as a historical volatility measure */
export function computeVolatility(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdev = Math.sqrt(variance);
  return (stdev / mean) * 100;
}

// ---------------------------------------------------------------------------
// 4. Prediction API client — proxied via Next.js API routes
//    Supports two models: LSTM Hybrid and Naive (same request shape,
//    different response fields and upstream endpoints).
// ---------------------------------------------------------------------------

/**
 * ML API base URL is ONLY used server-side (inside the Next.js API routes).
 * The browser never calls it directly — that's why it doesn't need
 * NEXT_PUBLIC_ and won't hit CORS.
 * (Not re-exported to client to avoid exposing internal URL in bundle)
 */

/** Available price prediction models */
export type PricePredictionModel = "lstm" | "naive";

export const PRICE_PREDICTION_MODELS: { value: PricePredictionModel; label: string }[] = [
  { value: "lstm", label: "LSTM" },
  { value: "naive", label: "Naive" },
];

/** Same-origin proxy paths per model */
const PROXY_BATCH_PATHS: Record<string, string> = {
  lstm: "/api/v1/rice-price/predict/batch",
  naive: "/api/v1/naive-price/predict/batch",
};

export interface PricePredictionPoint {
  target_date: string;
  predicted_price: number;
  /** Optional — only set when the prediction API sends it (defensive, not fabricated) */
  confidence?: number;
}

export interface RicePricePredictionResult {
  rice_type: string;
  last_known_price: number;
  last_known_date: string;
  /** Only present for LSTM Hybrid; absent for Naive */
  lstm_weight?: number;
  /** Only present for LSTM Hybrid; absent for Naive */
  relative_volatility?: number;
  predictions: PricePredictionPoint[];
}

interface PredictSingleRequest {
  rice_type: string;
  last_prices: number[];
  last_price_date: string;
}

interface PredictBatchRequest {
  items: PredictSingleRequest[];
}

interface PredictBatchResponse {
  results: RicePricePredictionResult[];
}

/** Cache prediction results per (rice_type, last data date, model).
 *  Auto-invalidated when the last data date changes or model switches. */
const pricePredictionCache = new Map<string, RicePricePredictionResult>();
const PRICE_PREDICTION_CACHE_MAX = 200;

/** Clear the price prediction cache (called when the user switches models). */
export function clearPricePredictionCache(): void {
  pricePredictionCache.clear();
}

/**
 * Fetch predictions for one or more rice types. Always goes through the
 * batch endpoint (even for 1 item) — the single non-batch endpoint is no
 * longer used because the caller (RicePricePredictionChart) always sends
 * all RICE_TYPES at once in one request.
 * Results are cached per (rice_type, last_price_date, model) so revisits
 * with the same data and model don't call the ML service again.
 */
export async function predictRicePrices(
  items: PredictSingleRequest[],
  model: PricePredictionModel = "lstm"
): Promise<RicePricePredictionResult[]> {
  if (items.length === 0) return [];

  const keys = items.map((item) => `${item.rice_type}|${item.last_price_date}|${model}`);

  // All items cached -> return results directly in request order.
  if (keys.every((key) => pricePredictionCache.has(key))) {
    return keys.map((key) => pricePredictionCache.get(key)!);
  }

  const body: PredictBatchRequest = { items };
  const proxyPath = PROXY_BATCH_PATHS[model];
  const res = await fetch(proxyPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Log technical detail for debugging; show generic message to user
    console.warn("[rice-price] prediction request failed", { model, status: res.status });
    throw new Error("Prediksi tidak tersedia saat ini. Silakan coba lagi.");
  }

  const data = (await res.json()) as PredictBatchResponse;
  const results = data.results ?? [];

  if (pricePredictionCache.size >= PRICE_PREDICTION_CACHE_MAX) {
    pricePredictionCache.clear();
  }
  results.forEach((r, idx) => {
    // Store with the same key used for lookup (from the request item).
    pricePredictionCache.set(keys[idx] ?? `${r.rice_type}|${r.last_known_date}`, r);
  });

  return results;
}