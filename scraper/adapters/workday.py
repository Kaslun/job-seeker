"""Workday job feed.

Workday tenants are a pain. Each studio has a unique URL like:
  https://{tenant}.wdN.myworkdayjobs.com/{site}

`ats_handle` for Workday in the studios table should be the path:
  "{tenant}|{wd_pod}|{site}"
e.g. "ubisoft|wd3|UbisoftCareers"

The API is a POST to {base}/wday/cxs/{tenant}/{site}/jobs with a JSON body.
Detail page text is fetched separately via a GET.
"""
import httpx
from scraper.clean import clean_text


def _parse_handle(handle: str) -> tuple[str, str, str] | None:
    parts = handle.split("|")
    if len(parts) != 3:
        return None
    tenant, pod, site = parts
    return tenant, pod, site


def fetch(handle: str) -> list[dict]:
    parsed = _parse_handle(handle)
    if not parsed:
        return []
    tenant, pod, site = parsed

    base = f"https://{tenant}.{pod}.myworkdayjobs.com"
    list_url = f"{base}/wday/cxs/{tenant}/{site}/jobs"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    body = {"limit": 50, "offset": 0, "searchText": "", "appliedFacets": {}}

    try:
        r = httpx.post(list_url, json=body, timeout=30, headers=headers, follow_redirects=True)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return []

    postings = data.get("jobPostings") or []
    out = []
    for p in postings:
        ext_path = p.get("externalPath") or ""
        # externalPath is something like "/UbisoftCareers/job/Paris/Game-Designer_R12345"
        if not ext_path:
            continue
        job_id = ext_path.rsplit("_", 1)[-1] or ext_path
        public_url = f"{base}{ext_path}"

        title = (p.get("title") or "").strip()
        location = p.get("locationsText") or ""
        posted = p.get("postedOn") or ""

        # Fetch detail for the JD body.
        detail_url = f"{base}/wday/cxs/{tenant}/{site}/job{ext_path}"
        jd_text = ""
        try:
            d = httpx.get(detail_url, timeout=20, headers=headers, follow_redirects=True)
            if d.status_code == 200:
                detail = d.json()
                jpi = detail.get("jobPostingInfo") or {}
                jd_text = clean_text(jpi.get("jobDescription") or "")
        except Exception:
            pass

        out.append({
            "source": "workday",
            "source_id": job_id,
            "title": title,
            "url": public_url,
            "location": location,
            "remote_type": "",
            "salary_text": "",
            "jd_text": jd_text,
        })
    return out
