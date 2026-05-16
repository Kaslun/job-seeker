"use client";

import { useEffect, useRef, useState } from "react";
import type { Job } from "@/lib/supabase";

export function NotesPanel({ job }: { job: Job }) {
  const [notes, setNotes] = useState(job.notes || "");
  const [deadline, setDeadline] = useState(job.deadline || "");
  const [recruiter, setRecruiter] = useState(job.recruiter_contact || "");
  const [salary, setSalary] = useState(job.salary_discussed || "");
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved" | "error">("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    // Skip the first effect run so we don't autosave on initial mount.
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void save();
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, deadline, recruiter, salary]);

  async function save() {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          deadline: deadline || null,
          recruiter_contact: recruiter || null,
          salary_discussed: salary || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 1400);
    } catch {
      setSaveStatus("error");
    }
  }

  return (
    <div className="card p-5">
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="eyebrow">Notes</div>
        <span className="mono dim" style={{ fontSize: 10, minWidth: 50, textAlign: "right" }}>
          {saveStatus === "saving" ? "saving..." : saveStatus === "saved" ? "saved ✓" : saveStatus === "error" ? "failed" : ""}
        </span>
      </div>

      <div className="col gap-3" style={{ marginBottom: 12 }}>
        <div>
          <label className="eyebrow" style={{ fontSize: 10, display: "block", marginBottom: 4 }}>
            Deadline
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>
        <div>
          <label className="eyebrow" style={{ fontSize: 10, display: "block", marginBottom: 4 }}>
            Recruiter / contact
          </label>
          <input
            type="text"
            value={recruiter}
            onChange={(e) => setRecruiter(e.target.value)}
            placeholder="Name, email"
            style={{ fontSize: 13 }}
          />
        </div>
        <div>
          <label className="eyebrow" style={{ fontSize: 10, display: "block", marginBottom: 4 }}>
            Salary discussed
          </label>
          <input
            type="text"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="e.g. 850k NOK"
            style={{ fontSize: 13 }}
          />
        </div>
      </div>

      <label className="eyebrow" style={{ fontSize: 10, display: "block", marginBottom: 4 }}>
        Notes
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        placeholder="Free-form. Recruiter call notes, interview impressions, why you're interested, anything."
        style={{ fontSize: 13, lineHeight: 1.5 }}
      />
    </div>
  );
}
