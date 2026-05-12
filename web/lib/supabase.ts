import { createClient } from "@supabase/supabase-js";

export function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY!;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Bypass Next.js's data cache for every request.
      fetch: (url, options) =>
        fetch(url, { ...(options as RequestInit), cache: "no-store" }),
    },
  });
}

export type Job = {
  id: string;
  source: string;
  source_id: string;
  company: string;
  title: string;
  url: string;
  location: string | null;
  remote_type: string | null;
  salary_text: string | null;
  jd_text: string | null;
  fit_score: number | null;
  fit_rationale: string | null;
  status: "new" | "interested" | "skip" | "applied" | "screen" | "rejected" | "withdrawn" | "offer" | "ghosted";
  letter_text: string | null;
  discovered_at: string;
  applied_at: string | null;
  profile_slug: string | null;
  lang: "en" | "no" | null;
};

export type LocationMode = "norway" | "oslo" | "nordic_eu_uk" | "custom";

export type Profile = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  target_roles: string[];
  location_mode: LocationMode;
  location_custom: string | null;
  salary_floor_nok: number | null;
  exclusions: string[];
  seniority_min: "junior" | "mid" | "senior";
  cv_en: string | null;
  cv_no: string | null;
  voice_notes: string | null;
  sort_order: number;
  created_at: string;
};
