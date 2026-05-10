"""Workable public job board API."""
import httpx
from scraper.clean import clean_text


def fetch(handle: str) -> list[dict]:
    urls = [
        f"https://apply.workable.com/api/v1/widget/accounts/{handle}",
        f"https://{handle}.workable.com/api/jobs",
    ]
    data = None
    for url in urls:
        try:
            r = httpx.get(url, timeout=30, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code == 200:
                data = r.json()
                break
        except Exception:
            continue
    if not data:
        return []

    jobs = data.get("jobs") or data.get("results") or []
    out = []
    for j in jobs:
        location_obj = j.get("location") or {}
        if isinstance(location_obj, dict):
            loc_parts = [
                location_obj.get("city", ""),
                location_obj.get("region", ""),
                location_obj.get("country", ""),
            ]
            location = ", ".join(p for p in loc_parts if p)
        else:
            location = str(location_obj)

        remote = ""
        if j.get("remote") or j.get("telecommuting"):
            remote = "remote"
        wtype = j.get("workplace") or j.get("workplaceType") or ""
        if wtype:
            remote = wtype.lower()

        url = j.get("url") or j.get("application_url") or f"https://apply.workable.com/{handle}/j/{j.get('shortcode', '')}"

        out.append({
            "source": "workable",
            "source_id": j.get("shortcode") or j.get("id") or "",
            "title": (j.get("title") or "").strip(),
            "url": url,
            "location": location,
            "remote_type": remote,
            "salary_text": "",
            "jd_text": clean_text(j.get("description", "") or j.get("full_description", "")),
        })
    return out
