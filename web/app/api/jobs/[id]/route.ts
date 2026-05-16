import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = new Set(["status", "letter_text", "applied_at", "notes", "deadline", "recruiter_contact", "salary_discussed"]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const update: Record<string, any> = {};
  for (const k of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(k)) update[k] = body[k];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no allowed fields" }, { status: 400 });
  }

  const sb = getSupabase();
  const { error } = await sb.from("jobs").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Invalidate every page that reads from jobs. Cheap, comprehensive.
  revalidatePath("/feed");
  revalidatePath("/liked");
  revalidatePath("/applied");
  revalidatePath(`/job/${params.id}`);
  revalidatePath(`/job/${params.id}/letter`);

  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabase();
  const { data, error } = await sb.from("jobs").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
