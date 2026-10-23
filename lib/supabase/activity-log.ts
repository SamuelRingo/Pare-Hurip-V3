import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type ActivityModule = "import_data" | "kelola_data" | "referensi_wilayah" | "model_prediksi" | "pengguna_admin"

interface LogActivityParams {
  actorId: string | null
  actorName: string
  actionType: string
  description: string
  module: ActivityModule
}

/** Insert an activity log row using the browser (anon) client. */
export async function logActivity({
  actorId,
  actorName,
  actionType,
  description,
  module,
}: LogActivityParams) {
  const { error } = await supabase.from("activity_log").insert({
    actor_id: actorId,
    actor_name: actorName,
    action_type: actionType,
    description,
    module,
  });

  if (error) {
    console.error("Failed to log activity:", error.message);
  }
}

/** Insert an activity log row using the service-role (admin) client. */
export async function logServerActivity(
  admin: SupabaseClient,
  { actorId, actorName, actionType, description, module }: LogActivityParams
) {
  const { error } = await admin.from("activity_log").insert({
    actor_id: actorId,
    actor_name: actorName,
    action_type: actionType,
    description,
    module,
  });

  if (error) {
    console.error("Failed to log activity:", error.message);
  }
}
