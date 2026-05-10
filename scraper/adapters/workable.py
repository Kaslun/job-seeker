"""Workable public job board API.
Two URL patterns exist; we try both.
"""
import httpx
from bs4 import BeautifulSoup


def html_to_text(html: str) -> str:
    if not html:
        return ""
    return BeautifulSoup(html, "html.parser").get_text("\n", strip=True)


def fetch(handle: str) -> list[dict]:
    # Workable has a public JSON endpoint that lists postings.
    # The /spi/v3/accounts/{handle}/jobs endpoint requires auth, so we use the
    # public widget endpoint instead.
    urls = [
        f"https://apply.workable.com/api/v1/widget/accounts/{handle}",
        f"https://{handle}.workable.com/api/jobs",
    ]
    data = None
    for url in urls:
        try:
            r = httpx.get(url, timeout=30, follow_redirects=True)
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
            "jd_text": html_to_text(j.get("description", "") or j.get("full_description", "")),
        })
    return out
