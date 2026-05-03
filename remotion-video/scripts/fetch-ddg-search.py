#!/usr/bin/env python3
"""
DuckDuckGo HTML search — standalone, no API key required.
Falls back to Bing HTML search if DuckDuckGo fails.

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
BING_HTML_URL = "https://cn.bing.com/search"


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


def bing_search(query):
    """Search Bing HTML and return list of {title, link, snippet}."""
    params = {
        "q": query,
        "setlang": "zh-CN",
        "ensearch": "0",
    }
    url = f"{BING_HTML_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            page = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:
        return {"error": str(exc), "results": []}

    results = []

    # Bing HTML result structure:
    # <li class="b_algo"> <h2><a href="URL">Title</a></h2> <p>snippet...</p> </li>
    # Also: <li class="b_algo"> <h2><a href="URL">Title</a></h2> <cite>domain</cite> <p>snippet...</p> </li>

    item_re = re.compile(
        r'<li[^>]+class="b_algo"[^>]*>(.*?)</li>',
        re.DOTALL | re.IGNORECASE,
    )
    title_re = re.compile(r'<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.DOTALL | re.IGNORECASE)
    snippet_re = re.compile(r'<p[^>]*>(.*?)</p>', re.DOTALL | re.IGNORECASE)

    for item_match in item_re.finditer(page):
        item_html = item_match.group(1)

        title_match = title_re.search(item_html)
        if not title_match:
            continue

        raw_url = title_match.group(1).strip()
        title = strip_html(title_match.group(2))

        if not title or not raw_url:
            continue

        # Try to get snippet from <p> tag in the item
        snippet_match = snippet_re.search(item_html)
        snippet = ""
        if snippet_match:
            snippet = strip_html(snippet_match.group(1))
            # Clean up extra whitespace
            snippet = re.sub(r'\s+', ' ', snippet).strip()
            snippet = snippet[:200]

        # Skip obvious "related searches" or non-result items
        if raw_url.startswith("http") and "bing.com" not in raw_url:
            results.append({
                "title": title,
                "link": raw_url,
                "snippet": snippet,
            })

    return {"error": None, "results": results[:10]}


if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "AI news"
    freshness = sys.argv[2] if len(sys.argv) > 2 else "pd"

    # Try DuckDuckGo first
    output = ddg_search(query, freshness)

    # Fall back to Bing if DuckDuckGo returns no results or error
    if output.get("error") or len(output.get("results", [])) == 0:
        output = bing_search(query)

    # Print compact JSON to stdout
    print(json.dumps(output, ensure_ascii=False, separators=(",", ":")))
