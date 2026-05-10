"""Defensive HTML stripping for ATS payloads.

Some ATSes return JD text that's been HTML-escaped (e.g. &lt;p&gt;) inside what
should already be plain text, or that contains nested <div>/<span>/<p> markup
copy-pasted from Word. We unescape, then strip tags, then collapse whitespace.
"""
import html
import re
from bs4 import BeautifulSoup


def clean_text(s: str | None) -> str:
    if not s:
        return ""
    # Unescape HTML entities up to twice (some sources double-encode).
    prev = None
    cur = s
    for _ in range(3):
        if cur == prev:
            break
        prev = cur
        cur = html.unescape(cur)
    # Strip any tags that are now exposed.
    text = BeautifulSoup(cur, "html.parser").get_text("\n", strip=True)
    # Collapse runs of whitespace within lines, preserve paragraph breaks.
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    # Drop empty lines that pile up after stripping, but keep a single blank
    # line as a paragraph separator.
    out = []
    last_blank = False
    for line in lines:
        if not line:
            if not last_blank and out:
                out.append("")
            last_blank = True
        else:
            out.append(line)
            last_blank = False
    return "\n".join(out).strip()
