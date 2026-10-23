/**
 * Prediction clients — call the ml-pare-hurip FastAPI service through
 * proxied Next.js routes (`/api/v1/random-forest/predict/batch` or
 * `/api/v1/markov/predict/batch`).
 * Includes a per-(district, subsegment, model, last period) cache.
 */

import { AGGREGATE_VALUE, MONTH_NAMES_SHORT } from "@/lib/planting-phase/constants";
import { nearestKnownPhase } from "@/lib/planting-phase/transform";
import type { PhasePoint } from "@/lib/planting-phase/data";
import type { DataKsaRow } from "@/lib/planting-phase/queries";

/** Prediction models available for the planting-phase chart. */
export type PredictionModel = "random_forest" | "markov";

export const PREDICTION_MODELS: { value: PredictionModel; label: string }[] = [
  { value: "random_forest", label: "Random Forest" },
  { value: "markov", label: "Markov Chain" },
];

const ML_BATCH_PATHS: Record<PredictionModel, string> = {
  random_forest: "/api/v1/random-forest/predict/batch",
  markov: "/api/v1/markov/predict/batch",
};

interface RandomForestPredictionItem {
  horizon_months: number;
  target_year: number;
  target_month: number;
  predicted_phase: string;
  confidence: number;
}

interface RandomForestBatchResultItem {
  segment_id?: string | null;
  subsegment: string;
  district_code: string;
  last_known_phase: string;
  last_known_year: number;
  last_known_month: number;
  predictions: RandomForestPredictionItem[];
}

/**
 * Markov horizon entry — like RF's HorizonPrediction but without
 * target_year/target_month (derived from the input period + horizon_months).
 */
interface MarkovHorizonPrediction {
  horizon_months: number;
  predicted_phase: string;
  transition_probability: number;
}

interface MarkovBatchResultItem {
  segment_id?: string | null;
  subsegment: string;
  current_phase: string;
  predictions: MarkovHorizonPrediction[];
}

interface BatchResponse {
  results: Array<RandomForestBatchResultItem | MarkovBatchResultItem>;
}

/** Model-agnostic horizon entry used by the averaging loop. */
interface NormalizedHorizon {
  phase: number;
  confidence: number;
  target_year: number;
  target_month: number;
}

interface PredictPhaseParams {
  districtCode: string;
  subsegment: string;
  currentPhase: number;
  previousPhase: number;
  month: number;
  year: number;
  segmentId?: string;
}

function normalizePhase(phase: number): string {
  const s = String(phase);
  if (Number.isInteger(phase) && !s.includes(".")) {
    return phase + ".0";
  }
  return s;
}

async function requestPredictionBatch(
  paramsList: PredictPhaseParams[],
  model: PredictionModel
): Promise<BatchResponse> {
  const res = await fetch(ML_BATCH_PATHS[model], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: paramsList.map((p) => ({
        segment_id: p.segmentId ?? null,
        subsegment: p.subsegment,
        current_phase: normalizePhase(p.currentPhase),
        previous_phase: normalizePhase(p.previousPhase),
        district_code: p.districtCode,
        month: p.month,
        year: p.year,
      })),
    }),
  });

  if (!res.ok) {
    // Log technical detail for debugging; show generic message to user
    console.warn("[planting-phase] prediction batch failed", { model, status: res.status });
    throw new Error("Layanan prediksi tidak tersedia saat ini.");
  }
  return res.json();
}

/** Cache prediction results per (district, subsegment, model, last period).
 *  Auto-invalidated when the last period changes (new data arrives). */
const predictionCache = new Map<string, PhasePoint[]>();
const PREDICTION_CACHE_MAX = 200;

/** Clear all cached predictions (called when the user switches models). */
export function clearPredictionCache(): void {
  predictionCache.clear();
}

/**
 * Normalize batch results into per-result horizon arrays:
 * - Random Forest: `predictions[]` (h+1..h+3) straight from the API.
 * - Markov: `predictions[]` (h+1..h+3) with transition_probability as
 *   confidence; target month/year derived from the matched input item
 *   (input period + horizon_months, wrapping the year).
 */
function normalizeHorizons(
  model: PredictionModel,
  batch: BatchResponse,
  paramsList: PredictPhaseParams[]
): NormalizedHorizon[][] {
  if (model === "markov") {
    return batch.results.map((result, i) => {
      const item = result as MarkovBatchResultItem;
      const input = paramsList[i] ?? paramsList[0];
      return (item.predictions ?? []).map((p) => {
        const total = input.month - 1 + p.horizon_months;
        return {
          phase: parseFloat(p.predicted_phase),
          confidence: p.transition_probability,
          target_year: input.year + Math.floor(total / 12),
          target_month: (total % 12) + 1,
        };
      });
    });
  }
  return (batch.results as RandomForestBatchResultItem[]).map((r) =>
    (r.predictions ?? []).map((p) => ({
      phase: parseFloat(p.predicted_phase),
      confidence: p.confidence,
      target_year: p.target_year,
      target_month: p.target_month,
    }))
  );
}

/**
 * Fetch prediction points for one district.
 * - If `subsegment === "aggregate"`, take the last 2 data points PER
 *   SUBSEGMENT from `rawRows` (same query result as the history),
 *   send a batch, then average the predictions per horizon.
 * - Otherwise, send a single item built from the history.
 * - Both models yield 3 horizons (h+1..h+3) per subsegment.
 * - Results are cached per (district, subsegment, model, last period).
 */
export async function fetchPrediction(
  model: PredictionModel,
  districtCode: string,
  subsegment: string,
  history: PhasePoint[],
  segmentPrefix: string,
  rawRows: DataKsaRow[]
): Promise<PhasePoint[]> {
  const last = history[history.length - 1];
  const prev = history[history.length - 2] ?? last;

  const cacheKey = `${segmentPrefix}|${subsegment}|${model}|${last.year}-${last.month}`;
  const cached = predictionCache.get(cacheKey);
  if (cached) return cached;

  let paramsList: PredictPhaseParams[];

  if (subsegment === AGGREGATE_VALUE) {
    // Keep the 2 newest rows per subsegment from the fetched rows
    // (rows are ascending by period; keep only the last 2 per subsegment).
    const bySub = new Map<string, DataKsaRow[]>();
    for (const row of rawRows) {
      const list = bySub.get(row.subsegment) ?? [];
      list.push(row);
      if (list.length > 2) list.shift();
      bySub.set(row.subsegment, list);
    }

    paramsList = [];
    for (const [sub, rows] of bySub) {
      const newest = rows[rows.length - 1];
      const prevRow = rows.length > 1 ? rows[rows.length - 2] : newest;
      const [year, month] = newest.periode.split("-").map(Number);
      paramsList.push({
        districtCode,
        subsegment: sub,
        currentPhase: parseFloat(newest.phase),
        previousPhase: parseFloat(prevRow.phase),
        month,
        year,
        segmentId: newest.segment_id,
      });
    }

    if (paramsList.length === 0) return [];
  } else {
    paramsList = [{
      districtCode,
      subsegment,
      currentPhase: last.phase,
      previousPhase: prev.phase,
      month: last.month,
      year: last.year,
      segmentId: last.segment_id,
    }];
  }

  const batch: BatchResponse = await requestPredictionBatch(paramsList, model);
  const horizonPreds = normalizeHorizons(model, batch, paramsList);
  const combined = averagePerHorizon(horizonPreds);

  if (predictionCache.size >= PREDICTION_CACHE_MAX) predictionCache.clear();
  predictionCache.set(cacheKey, combined);
  return combined;
}

/** Average phase & confidence across subsegments per horizon and build
 *  the final PhasePoint list. */
function averagePerHorizon(horizonPreds: NormalizedHorizon[][]): PhasePoint[] {
  const horizonCount = horizonPreds.reduce((max, p) => Math.max(max, p.length), 0);
  const combined: PhasePoint[] = [];

  for (let h = 0; h < horizonCount; h++) {
    const atH = horizonPreds
      .map((p) => p[h])
      .filter((p): p is NormalizedHorizon => Boolean(p));

    if (atH.length === 0) continue;

    const avgPhaseValue =
      atH.reduce((sum, p) => sum + p.phase, 0) / atH.length;
    const avgConfidence =
      atH.reduce((sum, p) => sum + p.confidence, 0) / atH.length;
    const target = atH[0];

    combined.push({
      monthLabel: `${MONTH_NAMES_SHORT[target.target_month - 1]} '${String(
        target.target_year
      ).slice(-2)}`,
      month: target.target_month,
      year: target.target_year,
      phase: nearestKnownPhase(avgPhaseValue),
      kind: "prediction",
      confidence: avgConfidence,
    });
  }

  return combined;
}
