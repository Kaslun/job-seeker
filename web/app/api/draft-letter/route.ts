import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Embedded CV — same content as scraper/cv.md, copied here so the web app
// doesn't need filesystem access at runtime on Vercel.
const CV = `# Kasper Mork Lunde

Oslo, Norway | (+47) 970 96 782 | kasperml@hotmail.com | linkedin.com/in/kasperlunde

## Summary

Prompt engineer and AI designer with hands-on experience designing prompts across multiple providers (GPT, Claude, Gemini) and building AI-driven interactive experiences in games and simulation-based training. Skilled in agentic workflows, RAG, chain-of-thought reasoning, few-shot learning, and function calling through production systems. Gameplay development background on award-winning titles brings deep understanding of game design, dialogue systems, and narrative content.

## Experience

### Product Designer (AI Designer) — Attensi, Oslo (Feb 2025 – Present)
- Design prompts and interaction models for autonomous AI agents with dynamic personality controls.
- Architect AI content generation pipelines using Flowise Agent 2.0, Qdrant vector stores, OpenAI embeddings, and RAG.
- Evaluate and benchmark language models (GPT-4, Claude, Gemini, Llama, Mistral) for production use.
- Define prompt engineering best practices and support cross-functional teams.
- Achieved 3x system performance improvement and 50% faster content production.

### Gameplay Developer — Attensi, Oslo (Nov 2021 – Feb 2025)
- Developed interactive simulation modules in Unity for enterprise training.
- Built complex dialogue tree systems with branching narratives, NPC behavior logic.
- Optimized performance across mobile and web platforms.

### Gameplay and Network Programmer — Hyper Games, Oslo (May 2019 – Dec 2019)
- Contributed to "Mørkredd" — winner of Nordic Game of the Year 2021, Best Game Design, and Best Art at the Nordic Game Awards.
- Worked on "Mosaic" (Krillbite/Raw Fury), a narrative-driven adventure released on Apple Arcade, Steam, and consoles.

### Lecturer — Kristiania University College, Oslo (Oct–Nov 2020 & Oct–Nov 2023)
- Taught game design and Unreal Engine.

## Education
BA in Game Design — Westerdals Oslo ACT (now Kristiania University College), 2018.

## Skills
Unity (Expert, 6+ years), Unreal Engine, C#, dialogue systems, branching narrative, prompt engineering, RAG, agentic workflows.

## Languages
Norwegian (native), English (C2), Spanish (B1).
`;

const SYSTEM = `You write personal cover letters that don't sound like AI wrote them.

Hard rules:
- First-person ("I"), conversational, slightly informal but still professional.
- Around 250 words. Never longer than 280, never shorter than 200.
- No buzzwords. Banned: leverage, robust, comprehensive, passionate, dynamic, synergy, transformative, innovative, cutting-edge, seamless, ecosystem, journey, dive into, unlock, that being said, in today's fast-paced world.
- No em dashes (use commas or periods). No "Honored to apply" or similar.
- Don't reuse phrases from the job description. Don't restate what the company does back to them.
- Lead with one specific reason this role catches the candidate's eye, grounded in the candidate's actual work — not generic enthusiasm.
- Mention one or two concrete things from the candidate's CV that map to what the role needs. Use the title of a shipped game by name when relevant.
- End with a low-key sign-off, no exclamation points.

Output: just the letter body. No "Dear hiring manager" header, no signature block. Plain text, no markdown.`;

export async function POST(req: Request) {
  const body = await req.json();
  const { jobId, mode } = body as { jobId: string; mode: "variants" | "single" };

  const sb = getSupabase();
  const { data: job, error } = await sb.from("jobs").select("*").eq("id", jobId).single();
  if (error || !job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const jobContext = `Company: ${job.company}
Title: ${job.title}
Location: ${job.location || "(not specified)"}

Job description:
${(job.jd_text || "").slice(0, 3500)}`;

  if (mode === "variants") {
    // Generate three voice calibration drafts in parallel.
    const voices = [
      "warm, slightly self-deprecating, like an experienced developer chatting with a colleague over coffee",
      "direct and confident, gets to the point fast, slightly dry humor",
      "thoughtful and reflective, longer sentences, mentions craft explicitly",
    ];

    const calls = voices.map((voice) =>
      client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 600,
        system: [
          { type: "text", text: SYSTEM },
          { type: "text", text: `Candidate CV:\n\n${CV}`, cache_control: { type: "ephemeral" } },
        ],
        messages: [
          {
            role: "user",
            content: `${jobContext}\n\nWrite the letter in this voice: ${voice}`,
          },
        ],
      })
    );

    try {
      const results = await Promise.all(calls);
      const variants = results.map((r) => {
        const text = r.content
          .map((b) => (b.type === "text" ? b.text : ""))
          .join("\n")
          .trim();
        return text;
      });
      return NextResponse.json({ variants });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // single mode (not used yet, but available)
  try {
    const r = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 600,
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: `Candidate CV:\n\n${CV}`, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: jobContext }],
    });
    const text = r.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();
    return NextResponse.json({ letter: text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
