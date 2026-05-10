"""Fit scoring with Claude Haiku.

Uses prompt caching on the CV portion so repeated calls within a run cost
~80% less on the cached tokens.
"""
import os
import json
import re
from anthropic import Anthropic

MODEL = "claude-haiku-4-5"
MAX_JD_CHARS = 3000  # truncate to keep input cost low
MAX_SCORING_CALLS = 30  # hard cap per run, defends against scraper bugs

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


SYSTEM_PROMPT = """You evaluate whether a job posting is a fit for a candidate.

You will be given the candidate's CV and a job description. Output a single JSON object:

{"score": <integer 1-10>, "rationale": "<one short sentence>"}

Scoring guide:
- 9-10: Strong match on role, seniority, and skills. Worth applying.
- 7-8: Good match with one gap (e.g. seniority slightly off, secondary skill missing).
- 5-6: Partial match. Some relevant skills but role family or seniority is misaligned.
- 1-4: Poor match. Wrong role family, wrong seniority, location impossible, excluded sector.

Score harshly on role/seniority/skill fit. Reserve 8+ for genuinely strong fits.

Location guidance:
- Don't penalize Nordic cities (Stockholm, Copenhagen, Helsinki, Reykjavik, etc.) at all when the candidate's home country is Norway. Treat them as equivalent to Norway.
- For other EU cities, only deduct 1 point if the role is otherwise excellent and onsite-only. Hybrid or remote-friendly EU roles should not be penalized for location.
- A US-only or APAC-only role with no remote-from-Norway option is a hard fail (score 1-3 regardless of skill match).

Pay attention to the candidate's stated preferences in the CV (target roles, seniority, location, exclusions).

Output only the JSON. No preamble, no markdown fences."""


def score_job(cv_text: str, job: dict) -> dict | None:
    """Returns {'score': int, 'rationale': str} or None on error."""
    client = _get_client()
    jd = (job.get("jd_text") or "")[:MAX_JD_CHARS]

    user_msg = f"""Job:
Company: {job.get('company', '')}
Title: {job.get('title', '')}
Location: {job.get('location', '')}
Remote: {job.get('remote_type', '')}

Description:
{jd}"""

    try:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=200,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                },
                {
                    "type": "text",
                    "text": f"Candidate CV:\n\n{cv_text}",
                    "cache_control": {"type": "ephemeral"},
                },
            ],
            messages=[{"role": "user", "content": user_msg}],
        )
        text = "".join(b.text for b in resp.content if hasattr(b, "text")).strip()

        # Strip code fences if the model wrapped the JSON anyway.
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

        data = json.loads(text)
        score = int(data.get("score", 0))
        rationale = str(data.get("rationale", "")).strip()
        if not 1 <= score <= 10:
            return None
        return {"score": score, "rationale": rationale}
    except Exception as e:
        print(f"  scoring error for {job.get('company')} / {job.get('title')}: {e}")
        return None
