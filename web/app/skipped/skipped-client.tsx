"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Job, Profile } from "@/lib/supabase";
import { StudioMark, Icon } from "@/components/visual";
import { ProfileBadge, ProfileFilterChips, useProfileFilter } from "@/components/profile-filter";

export function SkippedClient({ initialJobs, profiles }: { initialJobs: Job[]; profiles: Profile[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();
  const { selected, toggle, setAll } = useProfileFilter(profiles);

  const visible = useMemo(() => {
    if (!selected) return jobs;
    return jobs.filter((j) => j.profile_slug && selected.has(j.profile_slug));
  }, [jobs, selected]);

  async function unskip(j: Job) {
    setBusyId(j.id);
    try {
      const res = await fetch(`/api/jobs/${j.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "interested" }),
      });
      if (!res.ok) throw new Error(await res.text());
      setJobs((js) => js.filter((x) => x.id !== j.id));
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        {visible.length} passed in the last 30 days
      </div>
      <ProfileFilterChips profiles={profiles} selected={selected} onToggle={toggle} onSetAll={setAll} />

      {visible.length === 0 ? (
        <div className="card p-8 center" style={{ flexDirection: "column", textAlign: "center", gap: 12 }}>
          <div className="h2" style={{ fontSize: 22 }}>Nothing skipped recently.</div>
          <p className="muted" style={{ maxWidth: 420 }}>
            {jobs.length === 0
              ? "Roles you pass on from the feed appear here."
              : "Try toggling another profile chip."}
          </p>
        </div>
      ) : (
        <div className="col gap-2">
          {visible.map((j) => (
            <div
              key={j.id}
              className="card p-4"
              style={{ opacity: 0.85, display: "block" }}
            >
              <div className="row between gap-4">
                <Link href={`/job/${j.id}`} className="row gap-3 grow" style={{ minWidth: 0, textDecoration: "none", color: "inherit" }}>
                  <StudioMark company={j.company} size={42} />
                  <div style={{ minWidth: 0 }}>
                    <div className="row gap-2">
                      <span className="eyebrow" style={{ fontSize: 10 }}>{j.company}</span>
                      <ProfileBadge profiles={profiles} slug={j.profile_slug} />
                    </div>
                    <div className="h3" style={{ fontSize: 16, marginBottom: 2 }}>{j.title}</div>
                    {j.location && <div className="mono dim" style={{ fontSize: 11 }}>{j.location}</div>}
                  </div>
                </Link>
                <div className="col gap-2" style={{ alignItems: "flex-end", flex: "0 0 auto" }}>
                  {j.fit_score != null && (
                    <span className="mono dim" style={{ fontSize: 11 }}>{j.fit_score}/10</span>
                  )}
                  <button
                    className="btn btn-flat"
                    onClick={() => unskip(j)}
                    disabled={busyId === j.id}
                    style={{ fontSize: 12, padding: "4px 12px" }}
                  >
                    {busyId === j.id ? "..." : "Save this →"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
