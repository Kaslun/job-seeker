"use client";

import { useMemo } from "react";
import type { Job, Profile } from "@/lib/supabase";
import { JobList } from "@/components/job-list";
import { ProfileFilterChips, useProfileFilter } from "@/components/profile-filter";

export function AppliedClient({ initialJobs, profiles }: { initialJobs: Job[]; profiles: Profile[] }) {
  const { selected, toggle, setAll } = useProfileFilter(profiles);

  const visible = useMemo(() => {
    if (!selected) return initialJobs;
    return initialJobs.filter((j) => j.profile_slug && selected.has(j.profile_slug));
  }, [initialJobs, selected]);

  const inProgress = visible.filter((j) => j.status === "applied" || j.status === "screen");
  const offers = visible.filter((j) => j.status === "offer");
  const closed = visible.filter((j) => j.status === "rejected" || j.status === "withdrawn" || j.status === "ghosted");

  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 10, marginTop: -8 }}>
        {inProgress.length} in flight · {offers.length} offer{offers.length === 1 ? "" : "s"} · {closed.length} closed
      </div>
      <ProfileFilterChips profiles={profiles} selected={selected} onToggle={toggle} onSetAll={setAll} />

      {offers.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 className="h2" style={{ fontSize: 22, marginBottom: 16 }}>Offers</h2>
          <JobList jobs={offers} mode="applied" profiles={profiles} />
        </section>
      )}

      <section style={{ marginBottom: 36 }}>
        <h2 className="h2" style={{ fontSize: 22, marginBottom: 16 }}>In flight</h2>
        {inProgress.length === 0 ? (
          <div className="card p-5 muted">No applications in progress.</div>
        ) : (
          <JobList jobs={inProgress} mode="applied" profiles={profiles} />
        )}
      </section>

      {closed.length > 0 && (
        <section>
          <h2 className="h2" style={{ fontSize: 22, marginBottom: 16, color: "var(--ink-2)" }}>Closed</h2>
          <JobList jobs={closed} mode="closed" profiles={profiles} />
        </section>
      )}
    </>
  );
}
