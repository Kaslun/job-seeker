"""Lever public job postings API.
URL pattern: https://api.lever.co/v0/postings/{handle}?mode=json
"""
import httpx
from scraper.clean import clean_text


def fetch(handle: str) -> list[dict]:
    url = f"https://api.lever.co/v0/postings/{handle}?mode=json"
    r = httpx.get(url, timeout=30, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    postings = r.json()
    out = []
    for p in postings:
        cats = p.get("categories", {}) or {}
        location = cats.get("location", "") or ""
        commitment = cats.get("commitment", "") or ""
        team = cats.get("team", "") or ""

        jd_parts = [p.get("descriptionPlain", "") or clean_text(p.get("description", ""))]
        for lst in p.get("lists", []) or []:
            jd_parts.append(clean_text(lst.get("text", "")))
            jd_parts.append(clean_text(lst.get("content", "")))
        jd_parts.append(p.get("additionalPlain", "") or clean_text(p.get("additional", "")))
        jd_text = clean_text("\n\n".join(part for part in jd_parts if part))

        out.append({
            "source": "lever",
            "source_id": p.get("id", ""),
            "title": (p.get("text") or "").strip(),
            "url": p.get("hostedUrl", ""),
            "location": f"{location} ({team})" if team else location,
            "remote_type": "remote" if "remote" in location.lower() else commitment,
            "salary_text": "",
            "jd_text": jd_text,
        })
    return out
