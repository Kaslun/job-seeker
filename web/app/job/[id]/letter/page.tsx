import { TopNav } from "@/components/top-nav";
import { getSupabase, type Job } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LetterClient } from "./letter-client";

export const dynamic = "force-dynamic";

export default async function LetterPage({ params }: { params: { id: string } }) {
  const sb = getSupabase();
  const { data, error } = await sb.from("jobs").select("*").eq("id", params.id).single();
  if (error || !data) notFound();
  const job = data as Job;

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <TopNav />
      <div style={{ padding: "24px 40px 80px", maxWidth: 1180, margin: "0 auto" }}>
        <div className="row between" style={{ marginBottom: 18 }}>
          <Link href={`/job/${job.id}`} className="row gap-2 mono dim" style={{ fontSize: 12 }}>
            ← back to job
          </Link>
          <div className="col" style={{ alignItems: "flex-end" }}>
            <div className="eyebrow">{job.company}</div>
            <div className="h3" style={{ fontSize: 16 }}>{job.title}</div>
          </div>
        </div>
        <LetterClient job={job} />
      </div>
    </div>
  );
}
