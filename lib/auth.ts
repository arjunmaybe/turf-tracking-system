import type { SupabaseClient } from "@supabase/supabase-js";
import type { StaffRole } from "@/types/database";

export interface AuthState {
  userId: string | null;
  email: string | null;
  role: StaffRole | null;
  isStaff: boolean;
}

/** Look up the staff role for the current session user. Null => not staff. */
export async function getStaffRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<StaffRole | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const role = (data as { role: string }).role;
  return role === "owner" || role === "staff" ? role : null;
}

/** Resolve full auth state: session user + explicit staff membership. */
export async function resolveAuthState(
  supabase: SupabaseClient,
): Promise<AuthState> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, email: null, role: null, isStaff: false };
  const role = await getStaffRole(supabase, user.id);
  return {
    userId: user.id,
    email: user.email ?? null,
    role,
    isStaff: role !== null,
  };
}
