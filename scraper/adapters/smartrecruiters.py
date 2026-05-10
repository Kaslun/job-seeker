"""SmartRecruiters public job posting API.

Handle format: "{tenant}" or "{tenant}#{filter_substring}"
- tenant alone: fetch all postings.
- with #filter: only include postings whose department.label or location.fullLocation
  contains the filter substring (case-insensitive). Used to split shared tenants
  like Ubisoft/Massive that share the 'ubisoft2' tenant.

Paginates past 100 results (SmartRecruiters caps each page at 100).
"""
import httpx
from scraper.clean import clean_text


def _parse_handle(handle: str) -> tuple[str, str | None, bool]:
    """Returns (tenant, filter_substring, negate). negate=True means exclude matches."""
    if "#" in handle:
        tenant, flt = handle.split("#", 1)
        flt = flt.strip()
        if flt.startswith("-"):
            return tenant.strip(), flt[1:].lower(), True
        return tenant.strip(), flt.lower(), False
    return handle.strip(), None, False


def _matches_filter(posting: dict, flt: str) -> bool:
    if not flt:
        return True
    dept = ((posting.get("department") or {}).get("label") or "").lower()
    loc = ((posting.get("location") or {}).get("fullLocation") or "").lower()
    company_name = (posting.get("companyName") or "").lower()
    return flt in dept or flt in loc or flt in company_name


def fetch(handle: str) -> list[dict]:
    tenant, flt, negate = _parse_handle(handle)
    headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
    base = f"https://api.smartrecruiters.com/v1/companies/{tenant}/postings"

    # Paginate. SmartRecruiters max limit is 100; advance via offset until empty.
    all_postings = []
    offset = 0
    page_limit = 100
    max_pages = 10  # 1000 postings / studio max, sanity bound
    for _ in range(max_pages):
        r = httpx.get(base, timeout=30, follow_redirects=True, headers=headers,
                      params={"limit": page_limit, "offset": offset})
        r.raise_for_status()
        data = r.json()
        chunk = data.get("content", []) or []
        if not chunk:
            break
        all_postings.extend(chunk)
        offset += len(chunk)
        if len(chunk) < page_limit:
            break

    out = []
    for posting in all_postings:
        match = _matches_filter(posting, flt or "")
        if flt and (negate and match):
            continue
        if flt and (not negate and not match):
            continue
        posting_id = posting.get("id") or posting.get("uuid") or ""
        title = (posting.get("name") or "").strip()

        loc_obj = posting.get("location") or {}
        loc_parts = [
            loc_obj.get("city", ""),
            loc_obj.get("region", ""),
            loc_obj.get("country", ""),
        ]
        location = ", ".join(p for p in loc_parts if p)

        remote_type = ""
        if loc_obj.get("remote"):
            remote_type = "remote"
        elif loc_obj.get("fullLocation"):
            full = loc_obj["fullLocation"].lower()
            if "remote" in full:
                remote_type = "remote"
            elif "hybrid" in full:
                remote_type = "hybrid"

        jd_text = clean_text(posting.get("jobAd", {}).get("sections", {}).get("jobDescription", {}).get("text", "")) if posting.get("jobAd") else ""
        if not jd_text:
            try:
                detail = httpx.get(
                    f"{base}/{posting_id}",
                    timeout=20, headers=headers, follow_redirects=True,
                )
                if detail.status_code == 200:
                    d = detail.json()
                    sections = d.get("jobAd", {}).get("sections", {}) or {}
                    parts = []
                    for key in ("companyDescription", "jobDescription", "qualifications", "additionalInformation"):
                        sec = sections.get(key) or {}
                        if isinstance(sec, dict) and sec.get("text"):
                            parts.append(clean_text(sec["text"]))
                    jd_text = "\n\n".join(p for p in parts if p)
            except Exception:
                pass

        salary_text = ""
        comp = posting.get("compensation") or {}
        if isinstance(comp, dict) and comp.get("min") and comp.get("max"):
            currency = comp.get("currency", "")
            salary_text = f"{comp['min']}–{comp['max']} {currency}".strip()

        apply_url = (posting.get("applyUrl")
                     or f"https://jobs.smartrecruiters.com/{tenant}/{posting_id}")

        out.append({
            "source": "smartrecruiters",
            "source_id": str(posting_id),
            "title": title,
            "url": apply_url,
            "location": location,
            "remote_type": remote_type,
            "salary_text": salary_text,
            "jd_text": jd_text,
        })
    return out
