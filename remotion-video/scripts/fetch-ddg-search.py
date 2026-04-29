#!/usr/bin/env python3
"""
DuckDuckGo HTML search — standalone, no API key required.
Used by workflowGenerator.js as search fallback.

Usage:
    python3 fetch-ddg-search.py "DeepSeek V4" [freshness]

    freshness: pd (past day, default), pw (week), pm (month), 24h
"""
import sys
import os
import re
import json
import urllib.request
import urllib.parse
import html

TIMEOUT = 12
DUCKDUCKGO_HTML_BASE = "https://html.duckduckgo.com/html/"
FRESHNESS_MAP = {"24h": "", "pd": "d", "pw": "w", "pm": "m"}


def decode_entities(text):
    """Decode basic HTML entities."""
    text = str(text or "")
    text = re.sub(r'&#(\d+);', lambda m: chr(int(m.group(1))), text)
    text = re.sub(r'&#x([0-9a-f]+);', lambda m: chr(int(m.group(1), 16)), text)
    for entity in [("&quot;", '"'), ("&apos;", "'"), ("&#39;", "'"),
                   ("&lt;", "<"), ("&gt;", ">"), ("&amp;", "&"),
                   ("&nbsp;", " "), ("&mdash;", "—"), ("&ndash;", "–")]:
        text = text.replace(entity[0], entity[1])
    return text


def strip_html(text):
    """Remove HTML tags and decode entities."""
    return decode_entities(re.sub(r'<[^>]+>', '', str(text or "")).strip())


def ddg_search(query, freshness="pd"):
    """Search DuckDuckGo HTML and return list of {title, link, snippet}."""
    df_val = FRESHNESS_MAP.get(freshness, "d")
    params = {"q": query}
    if df_val:
        params["df"] = df_val

    url = f"{DUCKDUCKGO_HTML_BASE}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,"
                      "application/xml;q=0.9,*/*;q=0.8",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            page = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:
        return {"error": str(exc), "results": []}

    results = []
    # <a class="result__a" href="URL">Title text<b>...</b> more</a>
    # plus nearby <a class="result__snippet" ...>snippet text</a>
    anchor_re = re.compile(
        r'<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>',
        re.DOTALL,
    )
    snippet_re = re.compile(r'<a[^>]+class="result__snippet"[^>]*>(.*?)</a>', re.DOTALL)

    anchors = list(anchor_re.finditer(page))
    snippets = {m.start(): strip_html(m.group(1)) for m in snippet_re.finditer(page)}

    for match in anchors:
        raw_url = match.group(1).strip()
        # DuckDuckGo redirect URLs: //duckduckgo.com/l/?uddg=URL
        if "uddg=" in raw_url:
            try:
                from urllib.parse import unquote
                raw_url = unquote(raw_url.split("uddg=")[1].split("&")[0])
            except Exception:
                pass

        title = strip_html(match.group(2))
        if not title or not raw_url:
            continue

        # Find nearest snippet before or after this anchor
        snippet = ""
        pos = match.start()
        for sp in sorted(snippets.keys()):
            if abs(sp - pos) < 300:
                snippet = snippets[sp]
                break

        results.append({
            "title": title,
            "link": raw_url,
            "snippet": snippet[:200],
        })

    return {"error": None, "results": results[:10]}


if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "AI news"
    freshness = sys.argv[2] if len(sys.argv) > 2 else "pd"
    output = ddg_search(query, freshness)
    # Print compact JSON to stdout
    print(json.dumps(output, ensure_ascii=False, separators=(",", ":")))
