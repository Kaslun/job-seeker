"""SmartRecruiters public job posting API.
URL pattern: https://api.smartrecruiters.com/v1/companies/{handle}/postings
"""
import httpx
from scraper.clean import clean_text


def fetch(handle: str) -> list[dict]:
    url = f"https://api.smartrecruiters.com/v1/companies/{handle}/postings"
    headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
    r = httpx.get(url, timeout=30, follow_redirects=True, headers=headers, params={"limit": 100})
    r.raise_for_status()
    data = r.json()

    out = []
    for posting in data.get("content", []) or []:
        posting_id = posting.get("id") or posting.get("uuid") or ""
        title = (posting.get("name") or "").strip()
        ref = posting.get("refNumber") or posting_id

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

        # SmartRecruiters list endpoint doesn't always include description.
        # Fetch the detail endpoint when missing.
        jd_text = clean_text(posting.get("jobAd", {}).get("sections", {}).get("jobDescription", {}).get("text", "")) if posting.get("jobAd") else ""
        if not jd_text:
            try:
                detail = httpx.get(
                    f"https://api.smartrecruiters.com/v1/companies/{handle}/postings/{posting_id}",
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

        # Salary: SmartRecruiters has typedExperience / customField data sometimes
        salary_text = ""
        comp = posting.get("compensation") or {}
        if isinstance(comp, dict) and comp.get("min") and comp.get("max"):
            currency = comp.get("currency", "")
            salary_text = f"{comp['min']}–{comp['max']} {currency}".strip()

        apply_url = (posting.get("applyUrl")
                     or f"https://jobs.smartrecruiters.com/{handle}/{posting_id}")

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
