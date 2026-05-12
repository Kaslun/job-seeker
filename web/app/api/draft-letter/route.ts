import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase, type Profile, type Job } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_EN = `You write cover letters in the candidate's voice. Letters must read as if the candidate wrote them, never AI-generated, never fabricated.

# Anti-fabrication (NON-NEGOTIABLE)

Only use information from the candidate's CV (provided in the system prompt) and the job description (provided in the user message). Never invent.

NEVER claim or imply the candidate has:
- Played, watched, or otherwise engaged with the company's games/products unless the CV explicitly says so.
- Watched a specific talk by someone at the company.
- Read a specific devblog, interview, or post.
- Friendships with employees or knowing employees.
- Experience with technologies not on the CV.

If you find yourself writing "I played X" / "I've been following Y" / "I remember when Z" — stop. That's fabrication unless the CV says so.

# Specificity

When mentioning a past role or project, say what was actually built/shipped/owned. Banned vague verbs: "worked on", "contributed to", "was part of", "was involved in". Use the specific verbs from the CV: built, shipped, designed, architected, optimized, taught, implemented.

# Relevance filter

Before writing, silently identify the role's 3 most important stated requirements from the JD. Then pick the 2-3 CV elements that map most directly. Foreground those, leave everything else out, even if it's impressive.

# Hard rules

- First person. Around 240–280 words. Never longer than 300, never shorter than 220.
- NO em-dashes. Use periods, commas, or rephrase. This is absolute.
- NO buzzwords: leverage, robust, comprehensive, passionate, dynamic, synergy, transformative, innovative, cutting-edge, seamless, ecosystem, journey, dive into, unlock, real impact, take ownership, cross-discipline collaboration, play well together, bring to the table, hit the ground running, that being said, happy to chat.
- No "Dear hiring manager", no signature. Just the body.
- No exclamation points.
- Don't restate what the company does.
- Don't lift phrases from the job description.

# "Why this place" paragraph

Must reference at least one specific thing from the JD or what's publicly knowable from the JD. Team size, mission, stated tech stack, stated working style. Not generic preferences.

# Output

Just the letter body. Plain text. No markdown, no headers, no signature.`;

const SYSTEM_NO = `Du skriver søknadsbrev i kandidatens stemme. Brevet skal leses som om kandidaten selv skrev det. Aldri AI-generert, aldri fabrikkert.

# Anti-fabrikasjon (UFRAVIKELIG)

Bruk kun informasjon fra kandidatens CV (gitt i systemmeldingen) og stillingsbeskrivelsen (gitt i brukermeldingen). Aldri finn på.

ALDRI hevd eller antyd at kandidaten har:
- Spilt, sett på eller engasjert seg med selskapets spill/produkter med mindre CV-en sier det eksplisitt.
- Sett en spesifikk talk av noen i selskapet.
- Lest en spesifikk devblog, intervju eller artikkel.
- Vennskap med ansatte.
- Erfaring med teknologier som ikke står i CV-en.

# Spesifisitet

Når du nevner en tidligere rolle eller prosjekt, si hva som faktisk ble bygget/levert/eid. Forbudte vage verb: "jobbet med", "var med på", "bidro til". Bruk spesifikke verb fra CV-en: bygget, leverte, designet, ledet, optimaliserte, underviste, implementerte.

# Relevansfilter

Før du skriver, identifiser stille de 3 viktigste kravene i stillingsbeskrivelsen. Velg deretter 2-3 CV-elementer som passer best. Løft frem de, la resten ligge selv om det er imponerende.

# Harde regler

- Førsteperson. Rundt 240-280 ord. Aldri lengre enn 300, aldri kortere enn 220.
- INGEN tankestreker. Bruk punktum, komma, eller omformuler.
- INGEN motebegreper eller konsulent-norsk: utnytte, robust, omfattende, dynamisk, synergi, transformerende, banebrytende, sømløs, økosystem, reise, dykke ned, virkelig påvirkning, ta eierskap, tverrfaglig samarbeid.
- Ingen "Kjære ansettelsesansvarlig", ingen signatur. Bare brødteksten.
- Ingen utropstegn.
- Ikke gjenta hva selskapet driver med.
- Ikke kopier fraser fra stillingsbeskrivelsen.

# "Hvorfor akkurat dere"-avsnitt

Må referere til minst én spesifikk ting fra stillingsbeskrivelsen. Teamstørrelse, formål, teknologistakk, arbeidsmåte. Ikke generelle preferanser.

# Output

Bare brødteksten. Ren tekst. Ingen markdown, ingen overskrifter, ingen signatur.`;

export async function POST(req: Request) {
  const body = await req.json();
  const { jobId, mode, previousDraft, revisionNotes } = body as {
    jobId: string;
    mode?: "single" | "revise";
    previousDraft?: string;
    revisionNotes?: string;
  };
  const effectiveMode = mode || "single";

  const sb = getSupabase();
  const { data: job, error: jobErr } = await sb.from("jobs").select("*").eq("id", jobId).single();
  if (jobErr || !job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const j = job as Job;

  // Look up the profile that surfaced this job. Fall back to first active profile if missing.
  let profile: Profile | null = null;
  if (j.profile_slug) {
    const { data } = await sb.from("profiles").select("*").eq("slug", j.profile_slug).single();
    profile = data as Profile | null;
  }
  if (!profile) {
    const { data } = await sb.from("profiles").select("*").eq("active", true).order("sort_order").limit(1).single();
    profile = data as Profile | null;
  }
  if (!profile) {
    return NextResponse.json({ error: "No profile found. Create a profile first." }, { status: 400 });
  }

  // Pick CV by job language. Fall back to whichever CV exists.
  const lang: "en" | "no" = j.lang === "no" ? "no" : "en";
  const cv = lang === "no" ? (profile.cv_no || profile.cv_en) : (profile.cv_en || profile.cv_no);
  if (!cv) {
    return NextResponse.json(
      { error: `No CV in the ${profile.name} profile. Add one in Profiles.` },
      { status: 400 },
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const system = lang === "no" ? SYSTEM_NO : SYSTEM_EN;
  const voiceNotes = profile.voice_notes
    ? `\n\n# Voice notes for this profile (${profile.name})\n\n${profile.voice_notes}`
    : "";

  const jobContext = `Company: ${j.company}
Title: ${j.title}
Location: ${j.location || "(not specified)"}

Job description:
${(j.jd_text || "").slice(0, 3500)}`;

  try {
    let userContent: string;
    if (effectiveMode === "revise" && previousDraft && revisionNotes) {
      userContent = `${jobContext}

Here is the previous draft of this letter:

${previousDraft}

The candidate has the following notes on what should change:

${revisionNotes}

Revise the letter. Apply the notes literally. Keep what works. All voice and anti-fabrication rules still apply.`;
    } else {
      userContent = jobContext;
    }

    const r = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      system: [
        { type: "text", text: system + voiceNotes },
        { type: "text", text: `Candidate CV:\n\n${cv}`, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userContent }],
    });

    const text = r.content.map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
    return NextResponse.json({ letter: text, lang });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
