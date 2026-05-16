import { Sidebar } from "@/components/sidebar";
import { getSupabase, type Job } from "@/lib/supabase";
import { getAllProfiles } from "@/lib/profile";
import { SkippedClient } from "./skipped-client";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SkippedPage() {
  noStore();
  const sb = getSupabase();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [profiles, jobsResp] = await Promise.all([
    getAllProfiles(),
    sb
      .from("jobs")
      .select("*")
      .eq("status", "skip")
      .gte("discovered_at", cutoff)
      .order("discovered_at", { ascending: false }),
  ]);
  const jobs = (jobsResp.data as Job[]) || [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <Sidebar />
      <div className="main-shifted">
        <div style={{ padding: "32px 60px 60px", maxWidth: 1080, margin: "0 auto" }}>
          <div className="row between end" style={{ marginBottom: 18 }}>
            <div>
              <h1 className="h1">
                Second <span className="draw-u">look</span>.
              </h1>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 14, maxWidth: 600, marginTop: -4, marginBottom: 20 }}>
            Jobs you passed on in the last 30 days. If you changed your mind, save it back.
          </p>
          <SkippedClient initialJobs={jobs} profiles={profiles} />
        </div>
      </div>
    </div>
  );
}
