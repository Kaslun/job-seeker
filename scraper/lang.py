"""Detect whether a JD is in Norwegian or English.

Free, no API call. Uses density of Norwegian-only markers vs common English words.
"""
import re

# Norwegian-specific characters that virtually never appear in English text.
NO_CHARS = re.compile(r"[æøåÆØÅ]")

# High-frequency Norwegian words that mostly don't appear in English.
NO_WORDS = {
    "og", "med", "som", "for", "av", "i", "til", "fra", "på", "om",
    "er", "har", "kan", "skal", "vil", "blir", "være", "vært",
    "vi", "du", "deg", "din", "ditt", "dine", "vår", "vårt", "våre",
    "ikke", "men", "også", "eller", "samt", "hvor", "når",
    "stilling", "stillingen", "arbeid", "ansvar", "krav", "ønsker",
    "kvalifikasjoner", "erfaring", "bedriften", "selskapet",
    "norsk", "norge", "oslo", "kontor", "team", "kollega",
    "år", "års", "måneder", "uker", "dager",
}

# High-frequency English words used as signal in the opposite direction.
EN_WORDS = {
    "the", "and", "of", "to", "in", "for", "with", "we", "you", "are",
    "is", "be", "have", "has", "will", "this", "that", "our", "your",
    "experience", "skills", "responsibilities", "requirements", "qualifications",
    "team", "company", "role", "position", "candidate", "job",
}


def detect(text: str | None) -> str:
    """Return 'no' or 'en'. Defaults to 'en' on tie or empty input."""
    if not text or len(text) < 50:
        return "en"

    sample = text[:5000].lower()

    # If we see æøå anywhere, Norwegian is overwhelmingly likely.
    no_char_hits = len(NO_CHARS.findall(sample))
    if no_char_hits >= 3:
        return "no"

    words = re.findall(r"\b[a-zæøå]+\b", sample)
    if not words:
        return "en"

    no_hits = sum(1 for w in words if w in NO_WORDS)
    en_hits = sum(1 for w in words if w in EN_WORDS)

    # Norwegian needs higher density to overcome the bias of shared loanwords
    # (English words appear in Norwegian JDs too). Threshold tuned empirically.
    if no_hits >= en_hits * 0.6 and no_hits >= 5:
        return "no"
    return "en"
