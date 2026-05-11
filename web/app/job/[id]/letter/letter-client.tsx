"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/supabase";
import { Icon } from "@/components/visual";

type Mode = "viewing" | "generating" | "revising";

export function LetterClient({ job }: { job: Job }) {
  const [letter, setLetter] = useState(job.letter_text || "");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<Mode>("viewing");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revisionCount, setRevisionCount] = useState(0);
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);

  // Auto-generate the first draft if there's no saved letter.
  useEffect(() => {
    if (!job.letter_text) {
      generateFresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateFresh() {
    setMode("generating");
    setError(null);
    try {
      const res = await fetch(`/api/draft-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, mode: "single" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setLetter(json.letter);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMode("viewing");
    }
  }

  async function reviseWithNotes() {
    if (!notes.trim()) return;
    setMode("revising");
    setError(null);
    try {
      const res = await fetch(`/api/draft-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          mode: "revise",
          previousDraft: letter,
          revisionNotes: notes,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setLetter(json.letter);
      setNotes("");
      setRevisionCount((c) => c + 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMode("viewing");
    }
  }

  async function save() {
    setBusy(true);
    try {
      await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letter_text: letter }),
      });
    } finally {
      setBusy(false);
    }
  }

  async function markApplied() {
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "applied",
          letter_text: letter,
          applied_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/applied");
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  function printLetter() {
    // Show only the .letter-page when printing (CSS @media print handles this).
    window.print();
  }

  const isGen = mode === "generating" || mode === "revising";

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .letter-page, .letter-page * { visibility: visible; }
          .letter-page {
            position: absolute; left: 0; top: 0;
            width: 100%; padding: 0; box-shadow: none; border: none;
          }
          @page { size: A4; margin: 20mm; }
        }
        .letter-page {
          background: #faf8f1;
          color: #15130f;
          width: 210mm;
          min-height: 297mm;
          padding: 28mm 24mm;
          box-shadow: 0 4px 24px rgba(21,19,15,0.12), 0 1px 0 rgba(21,19,15,0.04);
          border-radius: 4px;
          font-family: 'EB Garamond', 'Georgia', 'Times New Roman', serif;
          font-size: 11.5pt;
          line-height: 1.55;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        [data-theme="dark"] .letter-page {
          /* Paper stays paper-colored even in dark mode — a letter is a letter. */
          background: #faf8f1;
          color: #15130f;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(0,0,0,0.2);
        }
        .letter-page .letter-textarea {
          width: 100%;
          background: transparent;
          color: inherit;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          border: none;
          outline: none;
          resize: none;
          min-height: 220mm;
          padding: 0;
        }
        @media print {
          .letter-page .letter-textarea {
            min-height: 0;
          }
        }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "210mm 1fr", gap: 28, alignItems: "flex-start" }}>
        {/* A4 preview / editor */}
        <div className="letter-page" ref={previewRef}>
          {isGen ? (
            <div className="col gap-3">
              <div className="skeleton" style={{ height: 16, width: "70%" }} />
              <div className="skeleton" style={{ height: 12, width: "100%" }} />
              <div className="skeleton" style={{ height: 12, width: "95%" }} />
              <div className="skeleton" style={{ height: 12, width: "98%" }} />
              <div className="skeleton" style={{ height: 12, width: "60%" }} />
              <div style={{ height: 18 }} />
              <div className="skeleton" style={{ height: 12, width: "100%" }} />
              <div className="skeleton" style={{ height: 12, width: "94%" }} />
              <div className="skeleton" style={{ height: 12, width: "100%" }} />
              <div className="skeleton" style={{ height: 12, width: "55%" }} />
              <div style={{ marginTop: 24, fontFamily: "var(--f-mono)", fontSize: 10, color: "#8a8478" }}>
                {mode === "revising" ? "Revising with notes..." : "Drafting..."}
              </div>
            </div>
          ) : (
            <textarea
              className="letter-textarea"
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              spellCheck
              placeholder="Letter will appear here..."
            />
          )}
        </div>

        {/* Side panel */}
        <aside className="col gap-4" style={{ position: "sticky", top: 90 }}>
          <div className="card p-4">
            <div className="eyebrow" style={{ marginBottom: 10 }}>Letter</div>
            <div className="row between" style={{ marginBottom: 4, fontSize: 12 }}>
              <span className="muted">Words</span>
              <span className="mono">{wordCount(letter)}</span>
            </div>
            <div className="row between" style={{ fontSize: 12 }}>
              <span className="muted">Revisions</span>
              <span className="mono">{revisionCount}</span>
            </div>
          </div>

          {error && (
            <div className="card p-4" style={{ borderColor: "var(--rose-2)", color: "var(--rose-2)", fontSize: 13 }}>
              {error}
            </div>
          )}

          <div className="card p-4">
            <div className="eyebrow" style={{ marginBottom: 8 }}>Notes for revision</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="e.g. cut the second paragraph, less formal, don't claim I played their games, lead with Mørkredd instead"
              style={{ fontSize: 13 }}
              disabled={isGen}
            />
            <button
              className="btn btn-primary"
              onClick={reviseWithNotes}
              disabled={isGen || !notes.trim()}
              style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
            >
              {mode === "revising" ? "Revising..." : "Revise with notes"}
            </button>
            <button
              className="btn btn-flat"
              onClick={generateFresh}
              disabled={isGen}
              style={{ width: "100%", justifyContent: "center", marginTop: 8, fontSize: 13 }}
            >
              {mode === "generating" ? "Generating..." : "Regenerate from scratch"}
            </button>
          </div>

          <div className="card p-4">
            <div className="eyebrow" style={{ marginBottom: 8 }}>When ready</div>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ width: "100%", justifyContent: "center" }}
            >
              <Icon.external /> Open application page
            </a>
            <button
              className="btn btn-flat"
              onClick={save}
              disabled={busy || isGen}
              style={{ width: "100%", justifyContent: "center", marginTop: 8, fontSize: 13 }}
            >
              Save draft
            </button>
            <button
              className="btn btn-flat"
              onClick={printLetter}
              disabled={busy || isGen}
              style={{ width: "100%", justifyContent: "center", marginTop: 8, fontSize: 13 }}
            >
              Print
            </button>
            <button
              className="btn btn-primary"
              onClick={markApplied}
              disabled={busy || isGen || !letter.trim()}
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            >
              <Icon.send /> Mark as applied
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
