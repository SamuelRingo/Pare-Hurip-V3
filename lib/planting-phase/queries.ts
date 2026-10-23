/**
 * Supabase queries for planting-phase data (`data_ksa` table):
 * raw row fetching, per-district subsegment options, and the
 * history series builder entry point.
 */

import { supabase } from "@/lib/supabase/client";
import { AGGREGATE_VALUE } from "@/lib/planting-phase/constants";
import { buildHistoryFromRows } from "@/lib/planting-phase/transform";
import type { PhasePoint } from "@/lib/planting-phase/data";

export interface DataKsaRow {
  segment_id: string
  subsegment: string
  periode: string
  phase: string
}

/**
 * Fetch raw `data_ksa` rows for one district and subsegment.
 * Filters using the 7-digit district code as a segment_id prefix.
 * - If subsegment === "aggregate", all subsegments in the district are fetched.
 * - If the database query fails, throws an error (handled by the caller).
 * - If no data is found, returns an empty array (not an error).
 */
export async function fetchRawRows(
  districtCode: string,
  subsegment: string
): Promise<DataKsaRow[]> {
  let query = supabase
    .from("data_ksa")
    .select("segment_id, subsegment, periode, phase")
    .like("segment_id", `${districtCode}%`);

  if (subsegment !== AGGREGATE_VALUE) {
    query = query.eq("subsegment", subsegment);
  }

  query = query.not("phase", "like", "7.%");
  query = query.neq("phase", "8");

  const { data, error } = await query.order("periode", { ascending: true });

  if (error) {
    throw new Error("Gagal memuat data historis dari database.");
  }

  return (data ?? []) as DataKsaRow[];
}

/**
 * Fetch historical data from the `data_ksa` table for one district and subsegment.
 * - If subsegment === "aggregate", all subsegments in the district are averaged
 *   per period.
 * - If the database query fails, throws an error (handled by the caller).
 * - If no data is found, returns an empty array (not an error).
 */
export async function fetchHistoryFromDataKsa(
  districtCode: string,
  subsegment: string
): Promise<PhasePoint[]> {
  const rows = await fetchRawRows(districtCode, subsegment);
  return buildHistoryFromRows(rows, subsegment);
}

/** Distinct subsegment codes available for a district (sorted). */
export async function getSubsegmentOptions(districtCode: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("data_ksa")
    .select("subsegment")
    .like("segment_id", `${districtCode}%`)
    .neq("subsegment", "")
    .not("subsegment", "is", null);

  if (error) {
    throw new Error("Gagal memuat daftar subsegmen.");
  }

  const unique = [...new Set((data ?? []).map((r) => r.subsegment).filter(Boolean))] as string[];
  return unique.sort();
}
