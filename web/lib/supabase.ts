import { createClient } from "@supabase/supabase-js";

export function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY!;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
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
  status: "new" | "interested" | "skip" | "applied";
  letter_text: string | null;
  discovered_at: string;
  applied_at: string | null;
};
