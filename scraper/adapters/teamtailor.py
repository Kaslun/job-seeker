"""Teamtailor public careers feed.
Most teamtailor instances expose a JSON-LD or sitemap, plus a JSON API at
/api/v1/jobs (sometimes requires API key — we fall back to the public site scrape).

Strategy: hit the public careers page and parse the embedded jobs data.
"""
import httpx
import re
import json
from bs4 import BeautifulSoup


def fetch(handle: str) -> list[dict]:
    base = f"https://career.{handle}.com"
    candidates = [
        f"{base}/jobs",
        f"https://{handle}.teamtailor.com/jobs",
        f"https://careers.{handle}.com/jobs",
    ]
    html = ""
    base_used = ""
    for url in candidates:
        try:
            r = httpx.get(url, timeout=30, follow_redirects=True)
            if r.status_code == 200 and "teamtailor" in r.text.lower():
                html = r.text
                base_used = url
                break
        except Exception:
            continue
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    out = []
    seen = set()

    # Teamtailor renders jobs as <a href="/jobs/{id}-{slug}"> — extract them.
    for link in soup.select('a[href*="/jobs/"]'):
        href = link.get("href", "")
        m = re.search(r"/jobs/(\d+)", href)
        if not m:
            continue
        job_id = m.group(1)
        if job_id in seen:
            continue
        seen.add(job_id)

        title = (link.get_text(" ", strip=True) or "").strip()
        if not title or len(title) < 3:
            continue

        # Build absolute URL.
        if href.startswith("http"):
            full_url = href
        else:
            full_url = base_used.rstrip("/jobs") + href if href.startswith("/") else f"{base_used}/{href}"

        # Try to fetch the individual posting for location and JD.
        location, jd_text, remote_type = "", "", ""
        try:
            jr = httpx.get(full_url, timeout=20, follow_redirects=True)
            if jr.status_code == 200:
                jsoup = BeautifulSoup(jr.text, "html.parser")
                # Teamtailor pages have JSON-LD with the JobPosting schema.
                for script in jsoup.find_all("script", type="application/ld+json"):
                    try:
                        data = json.loads(script.string or "{}")
                    except Exception:
                        continue
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        if not isinstance(item, dict):
                            continue
                        if item.get("@type") == "JobPosting":
                            jd_text = BeautifulSoup(item.get("description", ""), "html.parser").get_text("\n", strip=True)
                            loc = item.get("jobLocation", {})
                            if isinstance(loc, list) and loc:
                                loc = loc[0]
                            if isinstance(loc, dict):
                                addr = loc.get("address", {})
                                location = ", ".join(filter(None, [
                                    addr.get("addressLocality", ""),
                                    addr.get("addressCountry", ""),
                                ]))
                            if item.get("jobLocationType") == "TELECOMMUTE":
                                remote_type = "remote"
        except Exception:
            pass

        out.append({
            "source": "teamtailor",
            "source_id": job_id,
            "title": title,
            "url": full_url,
            "location": location,
            "remote_type": remote_type,
            "salary_text": "",
            "jd_text": jd_text,
        })
    return out
