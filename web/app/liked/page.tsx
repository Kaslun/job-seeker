import { Sidebar } from "@/components/sidebar";
import { getSupabase, type Job } from "@/lib/supabase";
import { getAllProfiles } from "@/lib/profile";
import { LikedClient } from "./liked-client";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LikedPage() {
  noStore();
  const sb = getSupabase();
  const [profiles, jobsResp] = await Promise.all([
    getAllProfiles(),
    sb
      .from("jobs")
      .select("*")
      .eq("status", "interested")
      .order("fit_score", { ascending: false, nullsFirst: false })
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
                Worth a <span className="draw-u">closer look</span>.
              </h1>
            </div>
          </div>
          <LikedClient initialJobs={jobs} profiles={profiles} />
        </div>
      </div>
    </div>
  );
}
