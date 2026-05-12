import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `Convert the provided CV/resume into clean, well-structured markdown.

Rules:
- Preserve all content. Do not summarize, omit, or paraphrase.
- Use # for the name (top of CV), ## for section headers (Summary, Experience, Education, Skills, Languages, etc), ### for individual roles.
- Each role: "### Title — Company, Location (dates)" then bullet points for responsibilities.
- Keep the original language. If the source is Norwegian, output Norwegian.
- Use plain bullet points (- ) for lists.
- Strip page numbers, headers/footers, and other PDF artifacts.
- No commentary, no explanation. Output ONLY the markdown CV.`;

export async function POST(req: Request) {
  const body = await req.json();
  const { content, mediaType } = body as { content: string; mediaType: string };

  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  try {
    let userContent: Anthropic.MessageParam["content"];
    if (mediaType === "application/pdf") {
      userContent = [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: content },
        },
        { type: "text", text: "Convert this CV to markdown following the rules above." },
      ];
    } else {
      // Plain text — just pass it through; this still helps clean up formatting.
      userContent = `Convert this CV to clean markdown following the rules above:\n\n${content}`;
    }

    const r = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: userContent }],
    });

    const text = r.content.map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
    return NextResponse.json({ markdown: text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
