import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, type AuthActor } from "@/lib/supabase/auth-guard";
import { logServerActivity } from "@/lib/supabase/activity-log";
import { isStrongPassword } from "@/lib/password";
import { isValidEmail } from "@/lib/email";

async function requireSuperAdmin() {
  return requireAdmin(["superadmin"], "Hanya superadmin yang boleh mengakses ini.");
}

async function logAdminActivity(
  actor: AuthActor,
  actionType: string,
  description: string
) {
  await logServerActivity(createAdminClient(), {
    actorId: actor.id,
    actorName: actor.name || "Superadmin",
    actionType,
    description,
    module: "pengguna_admin",
  });
}

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: fetchError } = await admin
    .from("profiles")
    .select("id, name, email, role, created_at")
    .in("role", ["admin", "superadmin"])
    .order("created_at", { ascending: false });

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}

export async function POST(request: Request) {
  const { error, actor } = await requireSuperAdmin();
  if (error) return error;
  if (!actor) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 401 });

  const { name, email, password, role } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nama, email, dan password wajib diisi." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return NextResponse.json(
      { error: "Password minimal 8 karakter dengan kombinasi huruf besar, huruf kecil, angka, dan karakter khusus." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Gagal membuat akun." }, { status: 400 });
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.user.id,
    name,
    email,
    role: role === "superadmin" ? "superadmin" : "admin",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await logAdminActivity(actor, "add_admin", `Menambahkan admin ${name} (${email})`);

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const { error, actor } = await requireSuperAdmin();
  if (error) return error;
  if (!actor) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 401 });

  const { userId, name, email, password } = await request.json();

  if (!userId || !email) {
    return NextResponse.json({ error: "userId dan email wajib diisi." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
  }
  if (password && !isStrongPassword(password)) {
    return NextResponse.json(
      { error: "Password minimal 8 karakter dengan kombinasi huruf besar, huruf kecil, angka, dan karakter khusus." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, {
    email,
    ...(password ? { password } : {}),
  });
  if (authUpdateError) {
    return NextResponse.json({ error: authUpdateError.message }, { status: 400 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ name, email })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await logAdminActivity(actor, "update_admin", `Mengubah admin ${name} (${email})`);

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { error, actor } = await requireSuperAdmin();
  if (error) return error;
  if (!actor) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 401 });

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }
  if (id === actor.id) {
    return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("name, email")
    .eq("id", id)
    .single();

  const { error: deleteError } = await admin.auth.admin.deleteUser(id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await logAdminActivity(
    actor,
    "delete_admin",
    `Menghapus admin ${target?.name ?? ""} (${target?.email ?? id})`
  );

  return NextResponse.json({ success: true });
}