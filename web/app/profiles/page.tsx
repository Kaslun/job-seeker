import { SidebarShell } from "@/components/sidebar-shell";
import { getAllProfiles } from "@/lib/profile";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfilesPage() {
  noStore();
  const profiles = await getAllProfiles();

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <SidebarShell />
      <div className="main-shifted">
        <div style={{ padding: "32px 60px 60px", maxWidth: 1080, margin: "0 auto" }}>
          <div className="row between end" style={{ marginBottom: 24 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>{profiles.length} profile{profiles.length === 1 ? "" : "s"}</div>
              <h1 className="h1">Your <span className="draw-u">profiles</span>.</h1>
            </div>
          </div>

          <p className="muted" style={{ marginBottom: 24, fontSize: 14, maxWidth: 640 }}>
            Each profile is a self-contained job search. Its own target roles, location filter, studio list, CV, and voice notes. Pick one to edit.
          </p>

          <div className="col gap-3">
            {profiles.map((p) => {
              const cvLangs = [p.cv_en && "EN", p.cv_no && "NO"].filter(Boolean).join(" · ");
              const locLabel = {
                norway: "Norway",
                oslo: "Oslo only",
                nordic_eu_uk: "Nordic + EU/UK",
                custom: p.location_custom || "Custom",
              }[p.location_mode];
              return (
                <Link
                  key={p.slug}
                  href={`/profiles/${p.slug}`}
                  className="card p-5"
                  style={{ display: "block", textDecoration: "none", color: "inherit", cursor: "pointer" }}
                >
                  <div className="row between gap-4">
                    <div>
                      <div className="row gap-3" style={{ marginBottom: 6 }}>
                        <h2 className="h2" style={{ fontSize: 22 }}>{p.name}</h2>
                        {!p.active && <span className="chip chip-outline" style={{ fontSize: 11 }}>Inactive</span>}
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {p.target_roles.length} role{p.target_roles.length === 1 ? "" : "s"} · {locLabel}
                        {cvLangs && ` · CV: ${cvLangs}`}
                      </div>
                    </div>
                    <span className="mono dim" style={{ fontSize: 11 }}>EDIT →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
