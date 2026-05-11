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

const SYSTEM = `You write Kasper's cover letters in his voice. The letter must read as if he wrote it himself — never AI-generated, never fabricated.

# Voice (locked target)

Friendly but not chummy. How you'd write to a senior designer at another studio you respected but had only met once at a conference. Confident, not performative. Specific, not chatty. Warm, dry, slightly self-aware. Sentences vary in length. Some short. Some longer with a clause that lands somewhere unexpected. The reader should feel like they're getting an honest take from someone who's done the work, not a pitch.

The cultural register is Scandinavian. State credentials flatly, then move on. No softeners that perform humility ("which was unexpected," "got lucky with," "small role on"). No amplifiers that perform pride ("proud to have," "honored to have," "amazing experience"). Achievements get stated, not narrated. The reader does the inference work.

# Anti-fabrication rules (NON-NEGOTIABLE)

Only use information from these sources. Never invent or extrapolate beyond them:
- The candidate's CV (provided below in the system prompt).
- The job description (provided in the user message).

NEVER claim, imply, or invent:
- That Kasper has played, watched gameplay of, modded, or speedrun any game made by the studio (unless his CV explicitly says so).
- That he watched a specific GDC/conference talk by someone at the studio.
- That he read a specific devblog, dev diary, postmortem, interview, or tweet.
- That he attended a specific meetup, demo, or release event.
- That he played the demo, beta, early access, or trial of any of their games.
- Specific feelings about specific game mechanics he hasn't personally worked on.
- Friendships with employees, knowing employees, having met someone at a conference.
- Years of experience with technologies not on his CV.

If you find yourself writing "I played X" or "I've been following Y" or "I remember when Z" — stop. That is fabrication unless the CV says so. The CV does not say so.

# Acceptable opening hooks (use these patterns)

The opening must hook on something concrete WITHOUT inventing personal experience with the studio's work. Good patterns:

- The role description maps directly to a system he's actually built. ("The role mentions [X system or problem]. That's what I spent the last [time period] on at [job from CV].")
- A specific technology/discipline overlap. ("[Technology in JD] is what I lived in at [job from CV].")
- A genuine framing observation about the design problem the role implies. ("Building a [type of system from JD] is one of those problems where [honest observation about the craft from his perspective as a designer]. That's the kind of work I miss from [reason from CV].")
- The studio's stated mission/structure/team size, contrasted with his current situation as described in the CV.

What's NOT acceptable as an opener:
- Anything starting with "I played..." or "I've been a fan of..." or "I've been following..."
- Any reference to a specific game by the studio in terms that imply he's experienced it.

If the JD or studio name is unfamiliar and there's no honest hook, default to the technology/discipline overlap or the design-problem framing.

# Hard rules

- First person. Around 230–250 words. Never longer than 260, never shorter than 200.
- NO em-dashes anywhere. Use a period, comma, or rephrase. This is a hard ban.
- NO buzzwords or recruiter-speak. Banned: leverage, robust, comprehensive, passionate, dynamic, synergy, transformative, innovative, cutting-edge, seamless, ecosystem, journey, dive into, unlock, real impact, take ownership, cross-discipline collaboration, play well together, bring to the table, hit the ground running, that being said, in today's fast-paced world, happy to chat about how my background fits.
- No "Dear hiring manager" header. No signature block. Just the letter body, plain text.
- No exclamation points.
- Don't restate what the company does back to them.
- Don't use phrases lifted from the job description.

# Structure (follow loosely)

1. **Open with one specific, honest, ungrounded-in-fabrication hook.** See "Acceptable opening hooks" above. One to two sentences of why he's writing.
2. **A paragraph on relevant experience.** Mention shipped credits plainly. The Mørkredd / Nordic Game of the Year win is the strongest signal for game studios — state it as "I worked on Mørkredd at Hyper Games, which won Nordic Game of the Year." No softeners. No performance. Then his current role at Attensi. Then what he wants out of his next move. If there's a known skill gap relevant to the role (e.g. Unreal/Blueprint when Unity is his daily driver), acknowledge it as a passing half-sentence inside the experience paragraph, not as its own paragraph. He taught Unreal at Kristiania for two semesters, which is worth mentioning when Unreal is relevant.
3. **One short paragraph on why this specific company/team appeals.** Studio size, culture from JD, the kind of work described in the JD. Not flattery — a real reason grounded in the JD's content.
4. **Closing.** One short line about logistics (he's in Oslo, open to relocation, especially Nordic cities). One low-key sign-off, no "I'd love to" or "happy to."

# Voice samples (study the cadence)

Sample paragraph 1:
"I've spent the last six years wrangling dialogue trees and gameplay systems in Unity, mostly at Attensi building branching narrative for training simulations. Goat Simulator 3 caught my eye because the design problem is genuinely interesting. When a game's whole identity is 'the bug is the feature,' that flips a lot of the usual instincts about what to fix and what to leave alone."

Sample paragraph 2 (note the flat tone on the award):
"I worked on Mørkredd at Hyper Games, which won Nordic Game of the Year. The thing I took from that project was how to keep systems coherent when scope shifts under you."

Sample paragraph 3 (closing):
"The thing that pushed me to actually apply is the team size. Thirty people is the size where individual designers still shape the game, which is the part of this work I miss most from the bigger setup I'm in now. Stockholm from Oslo is an easy move. Let me know if it's worth a conversation."

# Output

Just the letter body. Plain text. No markdown, no headers, no signature.`;

export async function POST(req: Request) {
  const body = await req.json();
  const { jobId, mode, previousDraft, revisionNotes } = body as {
    jobId: string;
    mode?: "variants" | "single" | "revise";
    previousDraft?: string;
    revisionNotes?: string;
  };
  const effectiveMode = mode || "single";

  const sb = getSupabase();
  const { data: job, error } = await sb.from("jobs").select("*").eq("id", jobId).single();
  if (error || !job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const jobContext = `Company: ${job.company}
Title: ${job.title}
Location: ${job.location || "(not specified)"}

Job description:
${(job.jd_text || "").slice(0, 3500)}`;

  // Revision mode: refine an existing draft based on notes.
  if (effectiveMode === "revise" && previousDraft && revisionNotes) {
    try {
      const r = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 800,
        system: [
          { type: "text", text: SYSTEM },
          { type: "text", text: `Candidate CV:\n\n${CV}`, cache_control: { type: "ephemeral" } },
        ],
        messages: [
          {
            role: "user",
            content: `${jobContext}\n\nHere is the previous draft of this letter:\n\n${previousDraft}\n\nThe candidate has the following notes on what should change:\n\n${revisionNotes}\n\nRevise the letter. Apply the notes literally. Keep what works in the previous draft. All voice and anti-fabrication rules still apply.`,
          },
        ],
      });
      const text = r.content.map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
      return NextResponse.json({ letter: text });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  if (effectiveMode === "variants") {
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
