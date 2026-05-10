import { paletteFor, studioCode, studioInitials } from "@/lib/derive";

export function CoverArt({
  company,
  title,
  style,
}: {
  company: string;
  title: string;
  style?: React.CSSProperties;
}) {
  const p = paletteFor(company);
  const cssVars = {
    "--ca-1": p.ca1,
    "--ca-2": p.ca2,
    "--ca-3": p.ca3,
    "--ca-4": p.ca4,
  } as React.CSSProperties;
  return (
    <div className="cover-art" style={{ ...cssVars, ...style }}>
      <span className="ca-studio">{studioCode(company)}</span>
      <div className="ca-title" style={{ fontSize: style?.fontSize ?? 28 }}>
        {title}
      </div>
    </div>
  );
}

export function StudioMark({ company, size = 56 }: { company: string; size?: number }) {
  const p = paletteFor(company);
  return (
    <div
      className="studio-mark"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, ${p.ca1}, ${p.ca4})`,
        borderColor: p.ca4,
      }}
    >
      {studioInitials(company)}
    </div>
  );
}

export function MatchRing({ score, size = 44 }: { score: number; size?: number }) {
  // score is 1–10. Ring fills as score*10 percent. Display "N/10".
  const pct = score * 10;
  return (
    <div
      className="match-ring"
      style={{ ["--p" as any]: pct, width: size, height: size } as React.CSSProperties}
    >
      <span style={{ fontSize: size * 0.24 }}>
        {score}<span style={{ opacity: 0.5 }}>/10</span>
      </span>
    </div>
  );
}

export const Icon = {
  pin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  cash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ),
  cal: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  arrow: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  external: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h6v6M10 14L20 4M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  ),
  x: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  ),
  heart: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M12 21s-7-4.5-7-10.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 7 4.5C19 16.5 12 21 12 21z" />
    </svg>
  ),
  send: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
    </svg>
  ),
};
