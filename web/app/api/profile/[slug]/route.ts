import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = new Set([
  "name", "active", "target_roles", "location_mode", "location_custom",
  "salary_floor_nok", "exclusions", "seniority_min", "cv_en", "cv_no", "voice_notes",
]);

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json();
  const update: Record<string, any> = {};
  for (const k of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(k)) update[k] = body[k];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no allowed fields" }, { status: 400 });
  }

  const sb = getSupabase();
  const { error } = await sb.from("profiles").update(update).eq("slug", params.slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/profiles");
  revalidatePath(`/profiles/${params.slug}`);
  revalidatePath("/feed");
  revalidatePath("/liked");
  revalidatePath("/applied");

  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const sb = getSupabase();
  const { data, error } = await sb.from("profiles").select("*").eq("slug", params.slug).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
