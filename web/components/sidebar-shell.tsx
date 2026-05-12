import { getActiveProfile, getAllProfiles } from "@/lib/profile";
import { Sidebar } from "./sidebar";

export async function SidebarShell() {
  const [profiles, active] = await Promise.all([getAllProfiles(), getActiveProfile()]);
  return <Sidebar profiles={profiles} activeProfileSlug={active?.slug ?? null} />;
}
