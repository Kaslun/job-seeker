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
- Designed prompts and interaction models for autonomous AI agents with dynamic personality controls, configuring parameters across multiple language models for simulation-based training products.
- Architected AI content generation pipelines using Flowise Agent 2.0, Qdrant vector stores, OpenAI embeddings, and RAG. Implemented moderation filters, divergence detection, and error correction for prompt consistency.
- Evaluated and benchmarked GPT-4, Claude, Gemini, Llama, and Mistral for production use, weighing reasoning quality, latency, and cost trade-offs.
- Established prompt engineering best practices, documented them, and supported cross-functional teams in AI adoption through Figma prototypes and hands-on collaboration.
- Achieved 3x system performance improvement and 50% faster content production through prompt optimization.

### Gameplay Developer — Attensi, Oslo (Nov 2021 – Feb 2025)
- Built interactive simulation modules in Unity for enterprise training, including complex dialogue tree systems with branching narratives, NPC behavior logic, and context-sensitive content.
- Scoped AI-driven features with designers, product owners, and QA in cross-functional teams, then iterated based on playtest and user feedback.
- Optimized performance across mobile and web platforms, including Android builds, memory management, and 3D rendering.

### Gameplay and Network Programmer — Hyper Games, Oslo (May 2019 – Dec 2019)
- Shipped gameplay code on "Mørkredd" (winner: Nordic Game of the Year 2021, Best Game Design, Best Art at the Nordic Game Awards). Responsibilities included gameplay implementation, network prototyping, and QA.
- Also contributed to "Mosaic" (Krillbite/Raw Fury), a narrative-driven adventure released on Apple Arcade, Steam, and consoles.

### Lecturer — Kristiania University College, Oslo (Oct–Nov 2020 & Oct–Nov 2023)
- Taught game design and Unreal Engine to classes of 12–14 students for two semester-length blocks.

## Education
BA in Game Design — Westerdals Oslo ACT (now Kristiania University College), 2018. Thesis: lead gameplay programmer on a 3D physics-based Unity game with a light-orb mechanic.

## Skills
Unity (expert, 6+ years), Unreal Engine, C#, dialogue systems, branching narrative, prompt engineering, RAG, agentic workflows, function calling, Flowise, LangChain, Qdrant.

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

# Specificity rule (NON-NEGOTIABLE)

When mentioning a past role, project, or company, say what was actually built, shipped, or owned — not what was "worked on" or "contributed to." Vague verbs ("worked on," "contributed to," "was part of," "was involved in") signal a CV the writer hasn't internalized. Use the specific verbs from the CV: built, shipped, designed, architected, optimized, taught, implemented. Pair each verb with a concrete thing — a system, a feature, a deliverable, a metric.

Bad (banned): "I worked on Mørkredd at Hyper Games."
Good: "I shipped gameplay code on Mørkredd at Hyper Games, doing implementation, network prototyping, and QA. The game won Nordic Game of the Year."

Bad: "I've been at Attensi for a few years working on training simulations."
Good: "At Attensi I built dialogue tree systems and NPC behavior logic in Unity for enterprise training sims, then moved into designing prompts and agentic workflows for AI-driven training agents."

Every CV mention must include the actual work, not just the project name. If the letter mentions a job, the next phrase or sentence must specify what was done in that job.

# Hard rules

- First person. Around 240–280 words. Never longer than 300, never shorter than 220. The specifics matter more than the length cap; if the letter needs an extra sentence to say what was actually done on a project, take the sentence.
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

# Voice samples (study cadence AND level of project detail)

Sample paragraph 1 — opener with technology overlap:
"I've spent the last six years building gameplay and dialogue systems in Unity. Most recently at Attensi, designing dialogue trees with branching logic and NPC behavior for simulation training. The Technical Designer role caught my eye because it asks for ownership of features from concept to implementation, which is what I've been doing day to day, just in a different domain."

Sample paragraph 2 — credits paragraph, flat tone on award, specifics on each role:
"At Hyper Games I shipped gameplay code on Mørkredd, doing implementation, network prototyping, and QA. The game won Nordic Game of the Year. At Attensi I moved from gameplay developer into AI design, where I now architect content generation pipelines with Flowise, Qdrant, and RAG, and benchmark models across GPT, Claude, Gemini, Llama, and Mistral for production use. I also taught Unreal at Kristiania for two semesters, so visual scripting and engine-specific workflows aren't new to me, though I know CRYENGINE is its own thing."

Sample paragraph 3 — opening with design-problem framing:
"Goat Simulator 3 caught my eye because the design problem is genuinely interesting. When a game's whole identity is 'the bug is the feature,' that flips a lot of the usual instincts about what to fix and what to leave alone."

Sample paragraph 4 — why-this-place + closing:
"The thing that pushed me to actually apply is the team size. Thirty people is the size where individual designers still shape the game, which is the part of this work I miss most from the bigger setup I'm in now. Stockholm from Oslo is an easy move. Let me know if it's worth a conversation."

Note how every job mention in sample 2 says what was done. No "worked on" or "was part of." Replicate that specificity.

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
