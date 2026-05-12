import { SidebarShell } from "@/components/sidebar-shell";
import { getSupabase, type Profile } from "@/lib/supabase";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProfileEditor } from "./editor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfileEditPage({ params }: { params: { slug: string } }) {
  noStore();
  const sb = getSupabase();
  const { data, error } = await sb.from("profiles").select("*").eq("slug", params.slug).single();
  if (error || !data) notFound();
  const profile = data as Profile;

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <SidebarShell />
      <div className="main-shifted">
        <div style={{ padding: "32px 60px 80px", maxWidth: 1080, margin: "0 auto" }}>
          <div className="row between" style={{ marginBottom: 18 }}>
            <Link href="/profiles" className="row gap-2 mono dim" style={{ fontSize: 12 }}>← profiles</Link>
          </div>
          <ProfileEditor initialProfile={profile} />
        </div>
      </div>
    </div>
  );
}
