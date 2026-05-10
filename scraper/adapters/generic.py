"""Generic careers page scraper.

Strategy (in order):
1. Fetch the careers index page; check for JSON-LD JobPosting entries directly.
2. Try sitemap.xml at the root of the careers domain. Filter URLs matching job
   detail patterns. Fetch each one, look for JSON-LD JobPosting entries.
3. If sitemap is empty or absent, crawl the index page for links matching job
   patterns and visit those.

`ats_handle` should be the careers index URL, e.g. "https://www.remedygames.com/careers".
"""
import httpx
import json
import re
from urllib.parse import urljoin, urlparse
from xml.etree import ElementTree as ET
from bs4 import BeautifulSoup
from scraper.clean import clean_text


JOB_PATH_PATTERNS = [
    r"/careers?/[^/]+/?$",
    r"/jobs?/[^/]+/?$",
    r"/positions?/[^/]+/?$",
    r"/openings?/[^/]+/?$",
    r"/vacancies?/[^/]+/?$",
    r"/role/[^/]+/?$",
    r"/job-[a-z0-9-]+/?$",
]

INDEX_PATTERNS = [
    r"/careers/?$",
    r"/jobs/?$",
    r"/career/?$",
    r"/openings/?$",
    r"/positions/?$",
    r"/vacancies/?$",
    r"/recrutement/?$",
]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; job-seeker/1.0)"}


def _is_job_url(url: str, base_host: str) -> bool:
    if not url:
        return False
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    if parsed.netloc and parsed.netloc != base_host:
        return False
    path = parsed.path or ""
    if any(re.search(pat, path, re.IGNORECASE) for pat in INDEX_PATTERNS):
        return False
    return any(re.search(pat, path, re.IGNORECASE) for pat in JOB_PATH_PATTERNS)


def _fetch_sitemap_urls(root_url: str, base_host: str) -> list[str]:
    parsed = urlparse(root_url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    candidates = [
        f"{base}/sitemap.xml",
        f"{base}/sitemap_index.xml",
        f"{base}/sitemap-index.xml",
    ]
    found: list[str] = []
    sub_sitemaps: list[str] = []

    for sm_url in candidates:
        try:
            r = httpx.get(sm_url, timeout=8, headers=HEADERS, follow_redirects=True)
            if r.status_code != 200 or "<" not in r.text[:500]:
                continue
            try:
                root = ET.fromstring(r.text)
            except ET.ParseError:
                continue
            for el in root.iter():
                tag = el.tag.rsplit("}", 1)[-1]
                if tag == "loc" and el.text:
                    url = el.text.strip()
                    if url.endswith(".xml"):
                        sub_sitemaps.append(url)
                    elif _is_job_url(url, base_host):
                        found.append(url)
            if found:
                break
        except Exception:
            continue

    if not found and sub_sitemaps:
        for sm_url in sub_sitemaps[:5]:
            try:
                r = httpx.get(sm_url, timeout=8, headers=HEADERS, follow_redirects=True)
                if r.status_code != 200:
                    continue
                root = ET.fromstring(r.text)
                for el in root.iter():
                    tag = el.tag.rsplit("}", 1)[-1]
                    if tag == "loc" and el.text:
                        url = el.text.strip()
                        if _is_job_url(url, base_host):
                            found.append(url)
            except Exception:
                continue

    seen = set()
    uniq = []
    for u in found:
        if u in seen:
            continue
        seen.add(u)
        uniq.append(u)
        if len(uniq) >= 80:
            break
    return uniq


def _extract_json_ld_jobs(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for script in soup.find_all("script", type="application/ld+json"):
        if not script.string:
            continue
        try:
            data = json.loads(script.string)
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for item in list(items):
            if isinstance(item, dict) and isinstance(item.get("@graph"), list):
                items.extend(item["@graph"])
        for item in items:
            if isinstance(item, dict) and item.get("@type") == "JobPosting":
                out.append(item)
    return out


def _normalize(item: dict, page_url: str) -> dict | None:
    title = (item.get("title") or "").strip()
    if not title:
        return None
    loc_obj = item.get("jobLocation")
    if isinstance(loc_obj, list) and loc_obj:
        loc_obj = loc_obj[0]
    location = ""
    if isinstance(loc_obj, dict):
        addr = loc_obj.get("address") or {}
        if isinstance(addr, dict):
            location = ", ".join(p for p in [
                addr.get("addressLocality", ""),
                addr.get("addressRegion", ""),
                addr.get("addressCountry", ""),
            ] if p)

    remote_type = "remote" if item.get("jobLocationType") == "TELECOMMUTE" else ""

    ident = item.get("identifier") or {}
    if isinstance(ident, dict):
        source_id = str(ident.get("value") or item.get("url") or page_url)
    else:
        source_id = str(ident or item.get("url") or page_url)

    return {
        "source": "generic",
        "source_id": source_id,
        "title": title,
        "url": item.get("url") or page_url,
        "location": location,
        "remote_type": remote_type,
        "salary_text": "",
        "jd_text": clean_text(item.get("description") or ""),
    }


def _fallback_index_crawl(root_url: str, base_host: str) -> list[str]:
    try:
        r = httpx.get(root_url, timeout=20, headers=HEADERS, follow_redirects=True)
        if r.status_code != 200:
            return []
    except Exception:
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    urls = []
    seen = set()
    for a in soup.find_all("a", href=True):
        absolute = urljoin(str(r.url), a["href"])
        if _is_job_url(absolute, base_host) and absolute not in seen:
            seen.add(absolute)
            urls.append(absolute)
            if len(urls) >= 40:
                break
    return urls


def _dedupe(jobs: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for j in jobs:
        key = (j["source_id"], j["url"])
        if key in seen:
            continue
        seen.add(key)
        out.append(j)
    return out


def fetch(handle: str) -> list[dict]:
    if not handle.startswith("http"):
        return []
    parsed = urlparse(handle)
    base_host = parsed.netloc
    if not base_host:
        return []

    out: list[dict] = []

    # Step 1: JSON-LD on the index page (one fast request).
    try:
        index_r = httpx.get(handle, timeout=10, headers=HEADERS, follow_redirects=True)
        if index_r.status_code == 200:
            for item in _extract_json_ld_jobs(index_r.text):
                norm = _normalize(item, str(index_r.url))
                if norm:
                    out.append(norm)
    except Exception:
        pass

    if out:
        return _dedupe(out)

    # Step 2: sitemap discovery.
    job_urls = _fetch_sitemap_urls(handle, base_host)

    # If sitemap returned nothing, stop. Don't hammer individual pages blindly.
    if not job_urls:
        return []

    # Step 3: fetch sitemap-discovered job pages and extract JSON-LD.
    for url in job_urls[:40]:
        try:
            jr = httpx.get(url, timeout=10, headers=HEADERS, follow_redirects=True)
            if jr.status_code != 200:
                continue
            for item in _extract_json_ld_jobs(jr.text):
                norm = _normalize(item, url)
                if norm:
                    out.append(norm)
        except Exception:
            continue

    return _dedupe(out)
