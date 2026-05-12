import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_PROFILE_COOKIE } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { slug } = await req.json();
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  const cookieStore = cookies();
  cookieStore.set(ACTIVE_PROFILE_COOKIE, slug, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ ok: true, slug });
}
