"""Generic careers page scraper.

Many studios have bespoke careers pages but include JobPosting structured data
(JSON-LD) for SEO. This adapter extracts those without per-site code.

`ats_handle` for the 'generic' adapter should be the careers index URL:
  e.g. "https://www.remedygames.com/careers/"

It will:
1. Fetch the index page.
2. Look for JSON-LD JobPosting entries directly (some sites embed all jobs).
3. If none found, look for links matching common career path patterns and
   fetch those individually for JSON-LD.

If no JobPosting JSON-LD exists anywhere, returns empty. (LLM extraction is
out of scope for now to keep cost predictable.)
"""
import httpx
import json
import re
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from scraper.clean import clean_text


JOB_LINK_PATTERNS = [
    r"/careers?/",
    r"/jobs?/",
    r"/positions?/",
    r"/openings?/",
    r"/vacancies/",
    r"/job-",
    r"/role/",
]


def _is_job_link(href: str, base_host: str) -> bool:
    if not href or href.startswith("#"):
        return False
    try:
        parsed = urlparse(href)
    except Exception:
        return False
    # Same host or relative
    if parsed.netloc and parsed.netloc != base_host:
        return False
    path = parsed.path or ""
    return any(re.search(pat, path) for pat in JOB_LINK_PATTERNS)


def _extract_json_ld_jobs(html: str, base_url: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    found = []
    for script in soup.find_all("script", type="application/ld+json"):
        if not script.string:
            continue
        try:
            data = json.loads(script.string)
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        # Some sites wrap with @graph
        for item in list(items):
            if isinstance(item, dict) and isinstance(item.get("@graph"), list):
                items.extend(item["@graph"])
        for item in items:
            if not isinstance(item, dict):
                continue
            if item.get("@type") != "JobPosting":
                continue
            found.append(item)
    return found


def _normalize_jsonld_job(item: dict, source_page_url: str) -> dict | None:
    title = (item.get("title") or "").strip()
    if not title:
        return None

    # Location
    loc_obj = item.get("jobLocation")
    if isinstance(loc_obj, list) and loc_obj:
        loc_obj = loc_obj[0]
    location = ""
    if isinstance(loc_obj, dict):
        addr = loc_obj.get("address") or {}
        if isinstance(addr, dict):
            location = ", ".join(
                p for p in [addr.get("addressLocality", ""), addr.get("addressRegion", ""), addr.get("addressCountry", "")]
                if p
            )

    remote_type = ""
    if item.get("jobLocationType") == "TELECOMMUTE":
        remote_type = "remote"

    # Identifier
    ident = item.get("identifier") or {}
    if isinstance(ident, dict):
        source_id = str(ident.get("value", "")) or item.get("url", "")
    else:
        source_id = str(ident) or item.get("url", "")

    if not source_id:
        # Fall back to title+location hash
        source_id = f"{title}|{location}"

    return {
        "source": "generic",
        "source_id": source_id,
        "title": title,
        "url": item.get("url") or source_page_url,
        "location": location,
        "remote_type": remote_type,
        "salary_text": "",
        "jd_text": clean_text(item.get("description") or ""),
    }


def fetch(handle: str) -> list[dict]:
    if not handle.startswith("http"):
        return []

    headers = {"User-Agent": "Mozilla/5.0 (compatible; job-seeker/1.0)"}
    try:
        r = httpx.get(handle, timeout=30, follow_redirects=True, headers=headers)
        r.raise_for_status()
    except Exception:
        return []

    base_host = urlparse(str(r.url)).netloc
    out = []

    # Pass 1: JSON-LD on the index page.
    direct = _extract_json_ld_jobs(r.text, str(r.url))
    for item in direct:
        norm = _normalize_jsonld_job(item, str(r.url))
        if norm:
            out.append(norm)

    if out:
        return out

    # Pass 2: discover individual job pages.
    soup = BeautifulSoup(r.text, "html.parser")
    candidate_urls = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        absolute = urljoin(str(r.url), href)
        if _is_job_link(absolute, base_host):
            candidate_urls.add(absolute)
        if len(candidate_urls) >= 30:
            break

    for u in list(candidate_urls)[:25]:  # cap to avoid runaway
        try:
            jr = httpx.get(u, timeout=15, headers=headers, follow_redirects=True)
            if jr.status_code != 200:
                continue
            for item in _extract_json_ld_jobs(jr.text, u):
                norm = _normalize_jsonld_job(item, u)
                if norm:
                    out.append(norm)
        except Exception:
            continue

    # Dedupe by (source_id, url) tuple in case the same JD appears twice.
    seen = set()
    deduped = []
    for j in out:
        key = (j["source_id"], j["url"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(j)
    return deduped
