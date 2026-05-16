"use client";

import { useMemo } from "react";
import type { Job, Profile } from "@/lib/supabase";
import { JobList } from "@/components/job-list";
import { ProfileFilterChips, useProfileFilter } from "@/components/profile-filter";

export function LikedClient({ initialJobs, profiles }: { initialJobs: Job[]; profiles: Profile[] }) {
  const { selected, toggle, setAll } = useProfileFilter(profiles);

  const visible = useMemo(() => {
    if (!selected) return initialJobs;
    return initialJobs.filter((j) => j.profile_slug && selected.has(j.profile_slug));
  }, [initialJobs, selected]);

  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 10, marginTop: -8 }}>
        {visible.length} saved
      </div>
      <ProfileFilterChips profiles={profiles} selected={selected} onToggle={toggle} onSetAll={setAll} />

      {visible.length === 0 ? (
        <div className="card p-8 center" style={{ flexDirection: "column", textAlign: "center", gap: 12 }}>
          <div className="h2" style={{ fontSize: 24 }}>Nothing here yet.</div>
          <p className="muted" style={{ maxWidth: 420 }}>
            {initialJobs.length === 0
              ? "When you mark a role as Interested from the feed, it shows up here."
              : "Try toggling another profile chip."}
          </p>
        </div>
      ) : (
        <JobList jobs={visible} mode="liked" profiles={profiles} />
      )}
    </>
  );
}
