"""Cheap pre-LLM filters. These run free, before any API calls."""
import re

# Title patterns that we care about. Each entry is a regex (case-insensitive).
# Designed to catch the role list with reasonable variants.
TITLE_PATTERNS = [
    r"\bgame\s*designer\b",
    r"\btechnical\s*designer\b",
    r"\btechnical\s*game\s*designer\b",
    r"\bsystems?\s*designer\b",
    r"\bgameplay\s*designer\b",
    r"\bcombat\s*designer\b",
    r"\beconomy\s*designer\b",
    r"\bnarrative\s*designer\b",
    r"\bnarrative\s*systems\s*designer\b",
    r"\bquest\s*designer\b",
    r"\blevel\s*designer\b",
    r"\bencounter\s*designer\b",
    r"\bai\s*designer\b",
    r"\bgame\s*ai\s*designer\b",
    r"\bsenior\s*designer\b",
    r"\blead\s*designer\b",
]

# Hard rejections in title or company name. Any match → skip.
EXCLUDE_PATTERNS = [
    r"\bcasino\b",
    r"\bslots?\b",
    r"\bbingo\b",
    r"\bsweepstakes?\b",
    r"\bgambl(ing|er)\b",
    r"\bbetting\b",
    r"\bpoker\b",
    r"\bsocial\s*casino\b",
    r"\bhyper[-\s]?casual\b",
    r"\bidle\s*game\b",
    r"\bmatch[-\s]?3\b",
]

# Seniority filter: skip junior/intern/entry roles.
JUNIOR_PATTERNS = [
    r"\bjunior\b",
    r"\bjr\.?\b",
    r"\bintern(ship)?\b",
    r"\bgraduate\b",
    r"\btrainee\b",
    r"\bentry[-\s]?level\b",
    r"\bworking\s*student\b",
    r"\bworkstudent\b",
    r"\bapprentice\b",
]

# Locations we accept. Match any of these (case-insensitive substring).
# This is intentionally permissive — false positives caught by the LLM scoring later.
ACCEPTABLE_LOCATIONS = [
    # Nordic
    "norway", "oslo", "norge",
    "sweden", "stockholm", "malmo", "malmö", "gothenburg", "göteborg", "skövde", "skovde",
    "denmark", "copenhagen", "aarhus", "københavn",
    "finland", "helsinki", "espoo", "tampere",
    "iceland", "reykjavik",
    # Rest of EU
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
    "remote",  # caught here, validated downstream
]

# Locations to reject outright (us-only roles slip through "remote" sometimes).
REJECT_LOCATIONS = [
    "united states only", "us only", "usa only",
    "canada only",
    "north america only",
    "asia pacific",
    "apac only",
]


def matches_any(text, patterns):
    if not text:
        return False
    return any(re.search(p, text, re.IGNORECASE) for p in patterns)


def title_matches(title: str) -> bool:
    """True if the title looks like a role we want."""
    if not title:
        return False
    if matches_any(title, EXCLUDE_PATTERNS):
        return False
    if matches_any(title, JUNIOR_PATTERNS):
        return False
    return matches_any(title, TITLE_PATTERNS)


def location_acceptable(location: str, remote_type: str = "") -> bool:
    """True if the location is somewhere we can work from or relocate to."""
    text = f"{location or ''} {remote_type or ''}".lower()
    if not text.strip():
        return True  # unknown — let the LLM judge
    if any(r in text for r in REJECT_LOCATIONS):
        return False
    return any(loc in text for loc in ACCEPTABLE_LOCATIONS)


def company_acceptable(company: str) -> bool:
    """Reject companies whose name screams casino/gambling."""
    if not company:
        return True
    return not matches_any(company, EXCLUDE_PATTERNS)


def passes_cheap_filters(job: dict) -> tuple[bool, str]:
    """Return (passes, reason_if_not)."""
    if not company_acceptable(job.get("company", "")):
        return False, "company excluded"
    if not title_matches(job.get("title", "")):
        return False, "title not a match"
    if not location_acceptable(job.get("location", ""), job.get("remote_type", "")):
        return False, "location not acceptable"
    return True, ""
