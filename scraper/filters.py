"""Cheap pre-LLM filters, parameterised by profile.

Each profile from Supabase has its own:
- target_roles (list of role labels — we build regex from these)
- location_mode (norway / oslo / nordic_eu_uk / custom)
- location_custom (optional comma-separated cities)
- seniority_min (junior / mid / senior)
- exclusions (list of substrings to reject)
"""
import re


# Location bundles by mode. Strings matched as case-insensitive substrings against
# the job's location + remote_type fields.
LOCATION_BUNDLES: dict[str, list[str]] = {
    "norway": [
        "norway", "oslo", "bergen", "trondheim", "stavanger", "norge",
        "remote",  # remote-from-norway counts; filtered by reject list below
    ],
    "oslo": [
        "oslo", "norge",  # 'norge' included because some Norwegian listings only say country
        "remote",
    ],
    "nordic_eu_uk": [
        # Nordic
        "norway", "oslo", "norge",
        "sweden", "stockholm", "malmo", "malmö", "gothenburg", "göteborg", "skövde", "skovde",
        "denmark", "copenhagen", "aarhus", "københavn",
        "finland", "helsinki", "espoo", "tampere",
        "iceland", "reykjavik",
        # EU
        "germany", "berlin", "hamburg", "munich", "münchen", "frankfurt", "cologne", "köln",
        "france", "paris", "lyon", "montpellier", "bordeaux", "annecy",
        "uk", "united kingdom", "london", "guildford", "leamington", "brighton", "manchester",
            "liverpool", "edinburgh", "dundee", "cambridge", "oxford", "bristol", "leeds",
            "england", "scotland", "wales",
        "netherlands", "amsterdam", "utrecht", "eindhoven",
        "belgium", "brussels", "ghent",
        "ireland", "dublin", "cork", "galway",
        "spain", "barcelona", "madrid", "valencia",
        "portugal", "lisbon", "porto",
        "italy", "milan", "rome",
        "poland", "warsaw", "warszawa", "krakow", "kraków", "wrocław", "wroclaw", "gdansk", "gdańsk",
        "czech", "prague", "praha", "brno",
        "austria", "vienna", "wien",
        "switzerland", "zurich", "zürich", "geneva",
        "ukraine", "kyiv", "kiev", "lviv",
        "romania", "bucharest",
        "hungary", "budapest",
        "estonia", "tallinn",
        "lithuania", "vilnius",
        "latvia", "riga",
        "europe", "eu", "emea",
        "remote",
    ],
}

# Locations to reject outright. Apply across all modes.
REJECT_LOCATIONS = [
    "united states only", "us only", "usa only",
    "canada only",
    "north america only",
    "asia pacific only", "apac only",
]

# Seniority filters by seniority_min level.
JUNIOR_PATTERNS = [
    r"\bjunior\b", r"\bjr\.?\b", r"\bintern(ship)?\b",
    r"\bgraduate\b", r"\btrainee\b", r"\bentry[-\s]?level\b",
    r"\bworking\s*student\b", r"\bworkstudent\b", r"\bapprentice\b",
    r"\bpraktikant\b", r"\bsommerstudent\b",  # Norwegian equivalents
]


def _role_to_pattern(role: str) -> str:
    """Build a regex pattern from a role label. Handles 'Senior Game Designer' →
    a pattern that matches 'senior game designer' with flexible whitespace."""
    parts = re.split(r"\s+", role.strip())
    escaped = [re.escape(p.lower()) for p in parts if p]
    if not escaped:
        return ""
    return r"\b" + r"\s+".join(escaped) + r"\b"


def title_matches(title: str, target_roles: list[str], exclusions: list[str]) -> bool:
    if not title:
        return False
    title_l = title.lower()

    # Exclusions: any substring match in title kills the job.
    for ex in exclusions or []:
        if ex.lower() in title_l:
            return False

    # Target roles: at least one must match.
    for role in target_roles or []:
        pat = _role_to_pattern(role)
        if pat and re.search(pat, title, re.IGNORECASE):
            return True
    return False


def passes_seniority(title: str, seniority_min: str) -> bool:
    """Reject jobs below the minimum seniority by title heuristic."""
    if seniority_min == "junior":
        return True
    title_l = title or ""
    is_junior = any(re.search(p, title_l, re.IGNORECASE) for p in JUNIOR_PATTERNS)
    if seniority_min == "mid" and is_junior:
        return False
    if seniority_min == "senior":
        if is_junior:
            return False
        # Senior must have an explicit senior/lead/principal marker.
        if not re.search(r"\b(senior|sr\.?|lead|principal|staff)\b", title_l, re.IGNORECASE):
            return False
    return True


def location_acceptable(
    location: str, remote_type: str, mode: str, custom: str | None = None,
) -> bool:
    text = f"{location or ''} {remote_type or ''}".lower()
    if not text.strip():
        return True  # unknown — let the LLM judge

    if any(r in text for r in REJECT_LOCATIONS):
        return False

    if mode == "custom":
        if not custom:
            return True
        cities = [c.strip().lower() for c in custom.split(",") if c.strip()]
        return any(c in text for c in cities) or "remote" in text

    bundle = LOCATION_BUNDLES.get(mode, LOCATION_BUNDLES["nordic_eu_uk"])
    return any(loc in text for loc in bundle)


def company_acceptable(company: str, exclusions: list[str]) -> bool:
    if not company:
        return True
    company_l = company.lower()
    for ex in exclusions or []:
        if ex.lower() in company_l:
            return False
    return True


def passes_cheap_filters(job: dict, profile: dict) -> tuple[bool, str]:
    """Return (passes, reason_if_not). Uses the supplied profile config."""
    target_roles = profile.get("target_roles") or []
    exclusions = profile.get("exclusions") or []
    location_mode = profile.get("location_mode") or "nordic_eu_uk"
    location_custom = profile.get("location_custom")
    seniority_min = profile.get("seniority_min") or "mid"

    if not company_acceptable(job.get("company", ""), exclusions):
        return False, "company excluded"
    if not title_matches(job.get("title", ""), target_roles, exclusions):
        return False, "title not a match"
    if not passes_seniority(job.get("title", ""), seniority_min):
        return False, "below seniority floor"
    if not location_acceptable(
        job.get("location", ""), job.get("remote_type", ""),
        location_mode, location_custom,
    ):
        return False, "location not acceptable"
    return True, ""
