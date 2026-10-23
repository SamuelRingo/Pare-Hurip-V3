import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth-guard";

type ImportRow = {
  segment_id: string
  subsegment: string
  periode: string
  phase: string
}

function isImportRow(value: unknown): value is ImportRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.segment_id === "string" &&
    typeof row.subsegment === "string" &&
    typeof row.periode === "string" &&
    typeof row.phase === "string"
  );
}

function isValidRow(row: ImportRow) {
  if (!/^\d{9}$/.test(row.segment_id)) return false;
  if (!row.subsegment || !row.periode || !row.phase) return false;
  return true;
}

export async function POST(request: Request) {
  const { error, actor } = await requireAdmin();
  if (error) return error;

  let body: { rows?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body request tidak valid" }, { status: 400 });
  }

  const rows = body.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Tidak ada data untuk disimpan" }, { status: 400 });
  }

  const invalidRows = rows.filter((row) => !isImportRow(row) || !isValidRow(row));
  if (invalidRows.length > 0) {
    return NextResponse.json(
      { error: `Terdapat ${invalidRows.length} baris tidak valid`, invalidRows },
      { status: 400 }
    );
  }

  const dedupedMap = new Map<string, ImportRow>();
  rows.forEach((row) => {
    const key = `${row.segment_id}|${row.subsegment}|${row.periode}`;
    dedupedMap.set(key, row);
  });
  const dedupedRows = Array.from(dedupedMap.values());

  const { data, error: upsertError } = await createAdminClient()
    .from("data_ksa")
    .upsert(
      dedupedRows.map((row) => ({
        ...row,
        created_by: actor.id,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "segment_id,subsegment,periode" }
    )
    .select("id");

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ savedCount: data?.length ?? dedupedRows.length });
}
