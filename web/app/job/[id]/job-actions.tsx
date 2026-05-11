"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/supabase";
import { Icon } from "@/components/visual";

const STATUS_LABELS: Record<Job["status"], string> = {
  new: "New",
  interested: "Interested",
  skip: "Skipped",
  applied: "Applied",
  screen: "In screen",
  rejected: "Rejected",
  withdrawn: "Withdrew",
  offer: "Offer",
  ghosted: "Ghosted",
};

const TRANSITIONS: Partial<Record<Job["status"], { to: Job["status"]; label: string; tone?: "primary" | "danger" | "flat" }[]>> = {
  applied: [
    { to: "screen", label: "Heard back", tone: "primary" },
    { to: "rejected", label: "Rejected", tone: "danger" },
    { to: "ghosted", label: "Ghosted", tone: "flat" },
    { to: "withdrawn", label: "Withdrew", tone: "flat" },
  ],
  screen: [
    { to: "offer", label: "Got offer", tone: "primary" },
    { to: "rejected", label: "Rejected", tone: "danger" },
    { to: "withdrawn", label: "Withdrew", tone: "flat" },
  ],
  offer: [
    { to: "withdrawn", label: "Withdrew", tone: "flat" },
  ],
};

const TERMINAL: Job["status"][] = ["rejected", "withdrawn", "ghosted"];

export function JobActions({ job }: { job: Job }) {
  const [status, setStatus] = useState(job.status);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const updateStatus = async (newStatus: Job["status"]) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus(newStatus);
      router.refresh();
    } catch (e: any) {
      alert("Failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const letterCta = job.letter_text ? "Edit saved letter" : "Draft letter";

  return (
    <div className="card p-5">
      <div className="eyebrow" style={{ marginBottom: 8 }}>Status</div>
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className="h3" style={{ fontSize: 16 }}>{STATUS_LABELS[status]}</span>
        {status === "applied" && job.applied_at && (
          <span className="mono dim" style={{ fontSize: 11 }}>
            {new Date(job.applied_at).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="col gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{ width: "100%", justifyContent: "center" }}
        >
          <Icon.external /> Open posting
        </a>
        {status !== "applied" && (
          <>
            <Link
              href={`/job/${job.id}/letter`}
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {letterCta} <Icon.arrow />
            </Link>
            <div className="row gap-2" style={{ marginTop: 4 }}>
              <button
                className="btn btn-flat"
                onClick={() => updateStatus(status === "interested" ? "new" : "interested")}
                disabled={busy}
                style={{ flex: 1, justifyContent: "center", fontSize: 13 }}
              >
                {status === "interested" ? "Unmark" : "Interested"}
              </button>
              <button
                className="btn btn-flat btn-danger"
                onClick={() => updateStatus("skip")}
                disabled={busy || status === "skip"}
                style={{ flex: 1, justifyContent: "center", fontSize: 13 }}
              >
                Skip
              </button>
            </div>
          </>
        )}
        {status === "applied" && job.letter_text && (
          <Link
            href={`/job/${job.id}/letter`}
            className="btn btn-flat"
            style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
          >
            View letter sent
          </Link>
        )}
        {TRANSITIONS[status] && (
          <>
            <div className="eyebrow" style={{ marginTop: 12, marginBottom: 4, fontSize: 10 }}>Update status</div>
            <div className="col gap-2">
              {TRANSITIONS[status]!.map((t) => (
                <button
                  key={t.to}
                  className={
                    "btn " +
                    (t.tone === "primary" ? "btn-primary" : t.tone === "danger" ? "btn-flat btn-danger" : "btn-flat")
                  }
                  onClick={() => updateStatus(t.to)}
                  disabled={busy}
                  style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}
        {TERMINAL.includes(status) && (
          <div className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: "center" }}>
            {status === "rejected" && "They passed."}
            {status === "withdrawn" && "You pulled this one."}
            {status === "ghosted" && "Heard nothing back."}
          </div>
        )}
      </div>
    </div>
  );
}
