"""Ashby public job board API.
URL pattern: https://api.ashbyhq.com/posting-api/job-board/{handle}?includeCompensation=true
"""
import httpx
from scraper.clean import clean_text


def fetch(handle: str) -> list[dict]:
    url = f"https://api.ashbyhq.com/posting-api/job-board/{handle}?includeCompensation=true"
    r = httpx.get(url, timeout=30, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    data = r.json()
    out = []
    for job in data.get("jobs", []) or []:
        location = job.get("location") or ""
        # Ashby may surface remote/hybrid via address tags
        address = job.get("address") or {}
        if isinstance(address, dict):
            postal = address.get("postalAddress") or {}
            country = postal.get("addressCountry", "") if isinstance(postal, dict) else ""
            if country and country not in location:
                location = f"{location}, {country}".strip(", ")

        remote_type = ""
        wp = (job.get("workplaceType") or "").lower()
        if wp:
            remote_type = wp
        elif job.get("isRemote"):
            remote_type = "remote"

        # Compensation tier strings, when present.
        salary_text = ""
        comp = job.get("compensation") or {}
        if isinstance(comp, dict):
            tier = comp.get("compensationTierSummary")
            if tier:
                salary_text = str(tier)

        out.append({
            "source": "ashby",
            "source_id": str(job.get("id", "")),
            "title": (job.get("title") or "").strip(),
            "url": job.get("jobUrl") or job.get("applyUrl") or "",
            "location": location,
            "remote_type": remote_type,
            "salary_text": salary_text,
            "jd_text": clean_text(job.get("descriptionHtml") or job.get("descriptionPlain") or ""),
        })
    return out
