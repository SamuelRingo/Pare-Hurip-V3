import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth-guard";

/** Insert a new district (region reference). */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const { district_code, name } = body ?? {};

  if (!district_code || !name) {
    return NextResponse.json({ error: "Kode dan nama kecamatan harus diisi." }, { status: 400 });
  }

  const { error: insertError } = await createAdminClient()
    .from("districts")
    .insert({ district_code, name });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** Update district code/name by id. */
export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const { id, district_code, name } = body ?? {};

  if (!id || !district_code || !name) {
    return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
  }

  const { error: updateError } = await createAdminClient()
    .from("districts")
    .update({ district_code, name })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** Delete a district by id. */
export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const { id } = body ?? {};

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  const { error: deleteError } = await createAdminClient()
    .from("districts")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
