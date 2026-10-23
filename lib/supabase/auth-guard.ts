import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface AuthActor {
  id: string;
  name: string;
  email: string | undefined;
}

/**
 * Shared admin authorization guard for API routes.
 * Verifies the session cookie and the profile role of the caller,
 * returning a NextResponse error when the caller is not authorized.
 */
export async function requireAdmin(
  allowedRoles: string[] = ["admin", "superadmin"],
  forbiddenMessage = "Anda tidak memiliki akses."
): Promise<{ error: NextResponse; actor: null } | { error: null; actor: AuthActor }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Belum login." }, { status: 401 }),
      actor: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role)) {
    return {
      error: NextResponse.json({ error: forbiddenMessage }, { status: 403 }),
      actor: null,
    };
  }

  return {
    error: null,
    actor: { id: user.id, name: profile.name ?? "", email: user.email },
  };
}
