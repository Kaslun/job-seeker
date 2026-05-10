"""Lever public job postings API.
URL pattern: https://api.lever.co/v0/postings/{handle}?mode=json
"""
import httpx
from bs4 import BeautifulSoup


def html_to_text(html: str) -> str:
    if not html:
        return ""
    return BeautifulSoup(html, "html.parser").get_text("\n", strip=True)


def fetch(handle: str) -> list[dict]:
    url = f"https://api.lever.co/v0/postings/{handle}?mode=json"
    r = httpx.get(url, timeout=30, follow_redirects=True)
    r.raise_for_status()
    postings = r.json()
    out = []
    for p in postings:
        cats = p.get("categories", {}) or {}
        location = cats.get("location", "") or ""
        commitment = cats.get("commitment", "") or ""
        team = cats.get("team", "") or ""

        # Build JD text from descriptionPlain + lists.
        jd_parts = [p.get("descriptionPlain", "") or html_to_text(p.get("description", ""))]
        for lst in p.get("lists", []) or []:
            jd_parts.append(lst.get("text", ""))
            jd_parts.append(html_to_text(lst.get("content", "")))
        jd_parts.append(p.get("additionalPlain", "") or html_to_text(p.get("additional", "")))
        jd_text = "\n\n".join(part for part in jd_parts if part)

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
