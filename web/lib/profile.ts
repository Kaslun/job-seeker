import { cookies } from "next/headers";
import { getSupabase, type Profile } from "./supabase";

const COOKIE_NAME = "active_profile";

export async function getActiveProfile(): Promise<Profile | null> {
  const sb = getSupabase();
  const { data } = await sb.from("profiles").select("*").eq("active", true).order("sort_order");
  const profiles = (data as Profile[]) || [];
  if (profiles.length === 0) return null;

  const cookieStore = cookies();
  const stored = cookieStore.get(COOKIE_NAME)?.value;
  if (stored) {
    const match = profiles.find((p) => p.slug === stored);
    if (match) return match;
  }
  return profiles[0];
}

export async function getAllProfiles(): Promise<Profile[]> {
  const sb = getSupabase();
  const { data } = await sb.from("profiles").select("*").order("sort_order");
  return (data as Profile[]) || [];
}

export const ACTIVE_PROFILE_COOKIE = COOKIE_NAME;
