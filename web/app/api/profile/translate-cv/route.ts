import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_EN_TO_NO = `Translate the provided English CV to Norwegian (bokmål).

Rules:
- Preserve all content, structure, dates, company names, technologies, and proper nouns.
- Use natural, professional Norwegian appropriate for a CV. Not stiff. Not consultant-speak.
- Translate role titles to common Norwegian equivalents when there's a standard (e.g. "Lecturer" → "Foreleser"). Keep technology and product names in their original form (Unity, Unreal, Figma).
- Preserve the markdown formatting exactly (# ## ### bullets).
- Awards and game titles in quotes keep their original form, but you can add a Norwegian gloss in parentheses if natural.
- Output ONLY the translated markdown. No commentary, no headers like "Translation:".`;

const SYSTEM_NO_TO_EN = `Translate the provided Norwegian CV to English.

Rules:
- Preserve all content, structure, dates, company names, technologies, and proper nouns.
- Use natural, professional English appropriate for a CV. Active voice. Specific verbs (built, shipped, designed, led) over generic ones (worked on, contributed to).
- Keep technology and product names in their original form.
- Preserve the markdown formatting exactly (# ## ### bullets).
- Norwegian compound nouns like "brukersentrert" → "user-centered", "tverrfaglig" → "cross-functional", "designprosesser" → "design processes".
- Output ONLY the translated markdown. No commentary.`;

export async function POST(req: Request) {
  const body = await req.json();
  const { content, from, to } = body as { content: string; from: "en" | "no"; to: "en" | "no" };

  if (!content || !from || !to) {
    return NextResponse.json({ error: "content, from, to required" }, { status: 400 });
  }
  if (from === to) {
    return NextResponse.json({ error: "from and to must differ" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const system = from === "en" ? SYSTEM_EN_TO_NO : SYSTEM_NO_TO_EN;

  try {
    const r = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content }],
    });
    const text = r.content.map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
    return NextResponse.json({ markdown: text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
