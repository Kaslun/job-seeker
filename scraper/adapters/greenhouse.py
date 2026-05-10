"""Greenhouse public job board API.
URL pattern: https://boards-api.greenhouse.io/v1/boards/{handle}/jobs?content=true
"""
import httpx
from bs4 import BeautifulSoup


def html_to_text(html: str) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "html.parser")
    return soup.get_text("\n", strip=True)


def fetch(handle: str) -> list[dict]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{handle}/jobs?content=true"
    r = httpx.get(url, timeout=30, follow_redirects=True)
    r.raise_for_status()
    data = r.json()
    out = []
    for job in data.get("jobs", []):
        location = (job.get("location") or {}).get("name", "")
        offices = ", ".join(o.get("name", "") for o in (job.get("offices") or []))
        location_full = location or offices
        out.append({
            "source": "greenhouse",
            "source_id": str(job["id"]),
            "title": job.get("title", "").strip(),
            "url": job.get("absolute_url", ""),
            "location": location_full,
            "remote_type": "",  # greenhouse rarely flags this; rely on jd_text
            "salary_text": "",
            "jd_text": html_to_text(job.get("content", "")),
        })
    return out
