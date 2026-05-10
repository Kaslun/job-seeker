// Deterministic palette + derived fields from a job row.

const PALETTES = [
  { ca1: "#1a3a5e", ca2: "#ff8c42", ca3: "#3a6b8c", ca4: "#0c1d33" }, // aurora
  { ca1: "#2a4a3a", ca2: "#a8c66c", ca3: "#1c3527", ca4: "#0e1a14" }, // moss
  { ca1: "#3d2a55", ca2: "#e8a3c2", ca3: "#5a3a7a", ca4: "#1f1530" }, // halflight
  { ca1: "#1c4a5a", ca2: "#7adfdf", ca3: "#0e2a36", ca4: "#091820" }, // polar
  { ca1: "#1a2a4a", ca2: "#5a7adf", ca3: "#0d1a30", ca4: "#06101e" }, // tide
  { ca1: "#5a1a14", ca2: "#ff8a3c", ca3: "#3a0e0a", ca4: "#1f0805" }, // ember
  { ca1: "#5a4a1a", ca2: "#ffd84d", ca3: "#3a2f10", ca4: "#1a1408" }, // bright
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function paletteFor(company: string) {
  return PALETTES[hash(company) % PALETTES.length];
}

export function studioInitials(company: string): string {
  // First letter of first two whitespace-separated words, fallback to first 2 chars.
  const parts = company.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return company.slice(0, 2).toUpperCase();
}

export function studioCode(company: string): string {
  // Short uppercase code for the cover art "studio" badge.
  const parts = company.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0] + parts[1]).slice(0, 8).toUpperCase();
  }
  return company.slice(0, 8).toUpperCase();
}

// Skill keywords we'll surface as chips.
const SKILL_KEYWORDS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bunity\b/i, label: "Unity" },
  { pattern: /\bunreal( engine)?\b/i, label: "Unreal" },
  { pattern: /\bgodot\b/i, label: "Godot" },
  { pattern: /\bC\+\+/i, label: "C++" },
  { pattern: /\bC#\b/i, label: "C#" },
  { pattern: /\bpython\b/i, label: "Python" },
  { pattern: /\blua\b/i, label: "Lua" },
  { pattern: /\bRPG\b/i, label: "RPG" },
  { pattern: /\bFPS\b/i, label: "FPS" },
  { pattern: /\bMMO\b/i, label: "MMO" },
  { pattern: /\bopen[- ]world\b/i, label: "Open world" },
  { pattern: /\blive[- ]ops?\b/i, label: "Live ops" },
  { pattern: /\bmultiplayer\b/i, label: "Multiplayer" },
  { pattern: /\bco-?op\b/i, label: "Co-op" },
  { pattern: /\bcombat\b/i, label: "Combat" },
  { pattern: /\beconomy\b/i, label: "Economy" },
  { pattern: /\bnarrative\b/i, label: "Narrative" },
  { pattern: /\bdialogue\b/i, label: "Dialogue" },
  { pattern: /\bquest\b/i, label: "Quests" },
  { pattern: /\blevel design\b/i, label: "Level design" },
  { pattern: /\bAI\b/i, label: "AI" },
  { pattern: /\bagile\b/i, label: "Agile" },
  { pattern: /\bremote\b/i, label: "Remote" },
  { pattern: /\bhybrid\b/i, label: "Hybrid" },
  { pattern: /\bvisa\b/i, label: "Visa-friendly" },
  { pattern: /\brelocation\b/i, label: "Relocation" },
];

export function extractTags(jd: string | null, location: string | null, remote: string | null): string[] {
  const haystack = `${jd || ""} ${location || ""} ${remote || ""}`;
  const found: string[] = [];
  for (const { pattern, label } of SKILL_KEYWORDS) {
    if (pattern.test(haystack) && !found.includes(label)) found.push(label);
    if (found.length >= 5) break;
  }
  return found;
}

export function extractPitch(jd: string | null): string {
  if (!jd) return "";
  // First sentence-ish chunk, capped.
  const cleaned = jd.replace(/\s+/g, " ").trim();
  const m = cleaned.match(/^(.{30,180}?[.!?])(\s|$)/);
  if (m) return m[1];
  return cleaned.slice(0, 160) + (cleaned.length > 160 ? "…" : "");
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.floor((now - then) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

export function levelFromTitle(title: string): string {
  if (/\b(senior|sr\.?|lead|principal)\b/i.test(title)) return "Senior";
  if (/\b(junior|jr\.?|associate)\b/i.test(title)) return "Junior";
  return "Mid";
}
