import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth-guard";

/** Insert a single KSA data row (manual add in KelolaDataKSA). */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const { segment_id, subsegment, periode, phase } = body ?? {};

  if (!segment_id || !subsegment || !periode || !phase) {
    return NextResponse.json({ error: "Semua kolom wajib diisi." }, { status: 400 });
  }

  const { error: insertError } = await createAdminClient()
    .from("data_ksa")
    .insert({ segment_id, subsegment, periode, phase });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** Update the periode/phase of an existing KSA data row. */
export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const { id, periode, phase } = body ?? {};

  if (!id || !periode || phase === undefined) {
    return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
  }

  const { error: updateError } = await createAdminClient()
    .from("data_ksa")
    .update({ periode, phase })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** Delete a KSA data row by id. */
export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const { id } = body ?? {};

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  const { error: deleteError } = await createAdminClient()
    .from("data_ksa")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
