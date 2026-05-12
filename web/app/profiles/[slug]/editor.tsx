"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LocationMode, Profile } from "@/lib/supabase";

type CvLang = "en" | "no";

const LOCATION_MODES: { value: LocationMode; label: string }[] = [
  { value: "norway", label: "Norway only" },
  { value: "oslo", label: "Oslo only" },
  { value: "nordic_eu_uk", label: "Nordic + EU/UK" },
  { value: "custom", label: "Custom" },
];

const SENIORITY_LEVELS = ["junior", "mid", "senior"] as const;

export function ProfileEditor({ initialProfile }: { initialProfile: Profile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [activeCvLang, setActiveCvLang] = useState<CvLang>(profile.cv_en ? "en" : "no");
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState<CvLang | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saved" | "error">("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void save();
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/profile/${profile.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          active: profile.active,
          target_roles: profile.target_roles,
          location_mode: profile.location_mode,
          location_custom: profile.location_custom,
          salary_floor_nok: profile.salary_floor_nok,
          exclusions: profile.exclusions,
          seniority_min: profile.seniority_min,
          cv_en: profile.cv_en,
          cv_no: profile.cv_no,
          voice_notes: profile.voice_notes,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 1500);
    } catch (e: any) {
      setSaveStatus("error");
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function setField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function setCv(lang: CvLang, text: string) {
    if (lang === "en") setField("cv_en", text);
    else setField("cv_no", text);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setParsing(true);
    setError(null);
    try {
      if (f.type === "application/pdf") {
        const buf = await f.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const res = await fetch("/api/profile/parse-cv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: base64, mediaType: "application/pdf" }),
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setCv(activeCvLang, json.markdown);
      } else {
        // Plain text / markdown — read directly
        const text = await f.text();
        const res = await fetch("/api/profile/parse-cv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, mediaType: "text/plain" }),
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setCv(activeCvLang, json.markdown);
      }
    } catch (e: any) {
      setError("Upload failed: " + e.message);
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function translateTo(toLang: CvLang) {
    const fromLang: CvLang = toLang === "en" ? "no" : "en";
    const source = fromLang === "en" ? profile.cv_en : profile.cv_no;
    if (!source) {
      setError(`No ${fromLang.toUpperCase()} CV to translate from.`);
      return;
    }
    const existing = toLang === "en" ? profile.cv_en : profile.cv_no;
    if (existing && !confirm(`Overwrite the existing ${toLang.toUpperCase()} CV?`)) return;

    setTranslating(toLang);
    setError(null);
    try {
      const res = await fetch("/api/profile/translate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: source, from: fromLang, to: toLang }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setCv(toLang, json.markdown);
      setActiveCvLang(toLang);
    } catch (e: any) {
      setError("Translation failed: " + e.message);
    } finally {
      setTranslating(null);
    }
  }

  const currentCv = activeCvLang === "en" ? profile.cv_en : profile.cv_no;

  return (
    <div className="col gap-6">
      {/* Header */}
      <div className="row between" style={{ alignItems: "flex-end" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Profile</div>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setField("name", e.target.value)}
            style={{
              fontFamily: "var(--f-display)",
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              background: "transparent",
              border: "none",
              padding: 0,
              width: "100%",
              maxWidth: 500,
            }}
          />
        </div>
        <div className="row gap-3">
          <span className="mono dim" style={{ fontSize: 11, minWidth: 60, textAlign: "right" }}>
            {busy ? "saving..." : saveStatus === "saved" ? "saved ✓" : saveStatus === "error" ? "save failed" : ""}
          </span>
          <label className="row gap-2" style={{ cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={profile.active}
              onChange={(e) => setField("active", e.target.checked)}
            />
            <span style={{ fontSize: 14 }}>Active</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="card p-4" style={{ borderColor: "var(--rose-2)", color: "var(--rose-2)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Search config */}
      <section className="card p-5">
        <h2 className="h3" style={{ marginBottom: 16, fontSize: 18 }}>Search</h2>

        <div className="col gap-4">
          <div>
            <div className="eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>Target roles</div>
            <textarea
              value={profile.target_roles.join("\n")}
              onChange={(e) =>
                setField(
                  "target_roles",
                  e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                )
              }
              rows={6}
              placeholder="One role per line. e.g. Game Designer&#10;Technical Designer&#10;Senior Game Designer"
              style={{ fontSize: 13, fontFamily: "var(--f-mono)" }}
            />
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>
              {profile.target_roles.length} role{profile.target_roles.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="row gap-4">
            <div style={{ flex: 1 }}>
              <div className="eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>Location</div>
              <select
                value={profile.location_mode}
                onChange={(e) => setField("location_mode", e.target.value as LocationMode)}
                style={selectStyle}
              >
                {LOCATION_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div className="eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>Seniority floor</div>
              <select
                value={profile.seniority_min}
                onChange={(e) => setField("seniority_min", e.target.value as Profile["seniority_min"])}
                style={selectStyle}
              >
                {SENIORITY_LEVELS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div className="eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>Salary floor (NOK)</div>
              <input
                type="number"
                value={profile.salary_floor_nok ?? ""}
                onChange={(e) => setField("salary_floor_nok", e.target.value ? Number(e.target.value) : null)}
                placeholder="700000"
              />
            </div>
          </div>

          {profile.location_mode === "custom" && (
            <div>
              <div className="eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>Custom cities</div>
              <input
                type="text"
                value={profile.location_custom ?? ""}
                onChange={(e) => setField("location_custom", e.target.value)}
                placeholder="Comma-separated. e.g. Oslo, Bergen, Trondheim"
              />
            </div>
          )}

          <div>
            <div className="eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>Exclusions (any match = reject)</div>
            <textarea
              value={profile.exclusions.join("\n")}
              onChange={(e) =>
                setField(
                  "exclusions",
                  e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                )
              }
              rows={3}
              placeholder="One keyword per line. e.g. casino&#10;slots&#10;hyper-casual"
              style={{ fontSize: 13, fontFamily: "var(--f-mono)" }}
            />
          </div>
        </div>
      </section>

      {/* CV editor */}
      <section className="card p-5">
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="h3" style={{ fontSize: 18 }}>CV</h2>
          <div className="row gap-2">
            <button
              className={"btn btn-flat" + (activeCvLang === "en" ? " active-tab" : "")}
              onClick={() => setActiveCvLang("en")}
              style={tabStyle(activeCvLang === "en")}
            >
              English {profile.cv_en ? "" : "(empty)"}
            </button>
            <button
              className={"btn btn-flat" + (activeCvLang === "no" ? " active-tab" : "")}
              onClick={() => setActiveCvLang("no")}
              style={tabStyle(activeCvLang === "no")}
            >
              Norsk {profile.cv_no ? "" : "(tom)"}
            </button>
          </div>
        </div>

        <div className="row gap-2" style={{ marginBottom: 10, flexWrap: "wrap" }}>
          <button
            className="btn btn-flat"
            onClick={() => fileRef.current?.click()}
            disabled={parsing}
            style={{ fontSize: 12 }}
          >
            {parsing ? "Parsing..." : `Upload ${activeCvLang.toUpperCase()} CV (PDF or text)`}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.md,.txt,application/pdf,text/markdown,text/plain"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <button
            className="btn btn-flat"
            onClick={() => translateTo(activeCvLang === "en" ? "no" : "en")}
            disabled={!!translating || !currentCv}
            style={{ fontSize: 12 }}
            title={`Translate this CV to ${activeCvLang === "en" ? "Norwegian" : "English"} and switch to that tab`}
          >
            {translating
              ? "Translating..."
              : `Translate to ${activeCvLang === "en" ? "Norwegian" : "English"} →`}
          </button>
        </div>

        <textarea
          value={currentCv ?? ""}
          onChange={(e) => setCv(activeCvLang, e.target.value)}
          rows={24}
          placeholder={`Paste or upload your ${activeCvLang.toUpperCase()} CV here, in markdown.`}
          style={{ fontSize: 13, fontFamily: "var(--f-mono)", lineHeight: 1.5 }}
        />
        <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>
          {currentCv ? `${currentCv.length} characters` : "Empty"}
        </div>
      </section>

      {/* Voice notes */}
      <section className="card p-5">
        <h2 className="h3" style={{ marginBottom: 6, fontSize: 18 }}>Voice notes</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          How letters should sound for this profile. The system reads this on every draft.
        </p>
        <textarea
          value={profile.voice_notes ?? ""}
          onChange={(e) => setField("voice_notes", e.target.value)}
          rows={5}
          placeholder="e.g. Conversational, like talking to a colleague. State credentials flatly. Avoid recruiter speak."
          style={{ fontSize: 13 }}
        />
      </section>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--card)",
  color: "var(--ink)",
  border: "1px solid var(--paper-3)",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--f-body)",
  fontSize: 14,
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 12,
    padding: "6px 14px",
    background: active ? "var(--ink)" : "transparent",
    color: active ? "var(--paper)" : "var(--ink-2)",
    borderColor: active ? "var(--ink)" : "var(--paper-3)",
    boxShadow: "none",
  };
}
