import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = new Set(["status", "letter_text", "applied_at"]);

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
  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabase();
  const { data, error } = await sb.from("jobs").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
