import { getSupabase, type Profile } from "./supabase";

export async function getAllProfiles(): Promise<Profile[]> {
  const sb = getSupabase();
  const { data } = await sb.from("profiles").select("*").order("sort_order");
  return (data as Profile[]) || [];
}
