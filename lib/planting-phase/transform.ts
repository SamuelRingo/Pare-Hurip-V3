/**
 * Transformations for planting-phase data:
 * snap arbitrary phase values onto the display grid and build the
 * historical series from raw `data_ksa` rows.
 */

import { AGGREGATE_VALUE, displayOrder, getMode, MONTH_NAMES_SHORT } from "@/lib/planting-phase/constants";
import type { DataKsaRow } from "@/lib/planting-phase/queries";
import type { PhasePoint } from "@/lib/planting-phase/data";

/** Find the nearest phase value in `displayOrder` for a number (used
 * after averaging several subsegment predictions in aggregate mode). */
export function nearestKnownPhase(value: number): number {
  return displayOrder.reduce((closest, phase) =>
    Math.abs(phase - value) < Math.abs(closest - value) ? phase : closest
  , displayOrder[0]);
}

/** Build the history series from raw rows (aggregate = mean per period,
 * otherwise = mode per period). */
export function buildHistoryFromRows(rows: DataKsaRow[], subsegment: string): PhasePoint[] {
  if (rows.length === 0) return [];

  if (subsegment === AGGREGATE_VALUE) {
    const grouped = new Map<string, DataKsaRow[]>();
    for (const row of rows) {
      const list = grouped.get(row.periode) ?? [];
      list.push(row);
      grouped.set(row.periode, list);
    }
    const aggregated: PhasePoint[] = [];
    for (const [periode, group] of grouped) {
      const [year, month] = periode.split("-").map(Number);
      const avgPhase =
        group.reduce((sum, r) => sum + parseFloat(r.phase), 0) / group.length;
      aggregated.push({
        monthLabel: `${MONTH_NAMES_SHORT[month - 1]} '${String(year).slice(-2)}`,
        month,
        year,
        phase: nearestKnownPhase(avgPhase),
        kind: "historical",
      });
    }
    return aggregated;
  }

  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const list = grouped.get(row.periode) ?? [];
    list.push(row.phase);
    grouped.set(row.periode, list);
  }
  return [...grouped].map(([periode, phases]) => {
    const [year, month] = periode.split("-").map(Number);
    return {
      monthLabel: `${MONTH_NAMES_SHORT[month - 1]} '${String(year).slice(-2)}`,
      month,
      year,
      phase: nearestKnownPhase(parseFloat(getMode(phases) ?? "")),
      kind: "historical" as const,
    };
  });
}
