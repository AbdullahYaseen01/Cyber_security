"""Rate-limited web crawler — downloads pages for source analysis."""

from __future__ import annotations

import asyncio
import hashlib
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag

import httpx
from bs4 import BeautifulSoup

from core.config import (
    CRAWL_MAX_DEPTH,
    CRAWL_MAX_PAGES_PER_DOMAIN,
    HTTP_TIMEOUT,
    REQUEST_DELAY,
    SOURCES_DIR,
    SCOPE_DOMAINS,
    USER_AGENT,
    FORBIDDEN_PATHS,
)


def _in_scope(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return any(host == d or host.endswith("." + d) for d in SCOPE_DOMAINS)


def _is_crawlable(url: str) -> bool:
    path = urlparse(url).path.lower()
    if any(f in path for f in FORBIDDEN_PATHS):
        return False
    if re.search(r"\.(pdf|zip|png|jpg|jpeg|gif|svg|mp4|mp3|woff2?|ttf|ico)$", path):
        return False
    return _in_scope(url)


class WebCrawler:
    def __init__(self):
        self.pages: list[dict] = []
        self._seen: set[str] = set()

    async def crawl(self, start_urls: list[str], domain: str) -> list[dict]:
        SOURCES_DIR.mkdir(parents=True, exist_ok=True)
        domain_dir = SOURCES_DIR / domain.replace(".", "_")
        domain_dir.mkdir(parents=True, exist_ok=True)

        queue: list[tuple[str, int]] = [(u, 0) for u in start_urls]
        self.pages = []
        self._seen = set()

        async with httpx.AsyncClient(
            timeout=HTTP_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
            verify=True,
        ) as client:
            while queue and len(self.pages) < CRAWL_MAX_PAGES_PER_DOMAIN:
                url, depth = queue.pop(0)
                url, _ = urldefrag(url)
                if url in self._seen or not _is_crawlable(url):
                    continue
                self._seen.add(url)

                await asyncio.sleep(REQUEST_DELAY)
                try:
                    r = await client.get(url)
                except Exception:
                    continue

                content_type = r.headers.get("content-type", "")
                body = r.text if "text" in content_type or "html" in content_type or "javascript" in content_type else ""

                # Save source for line-by-line analysis
                file_hash = hashlib.md5(url.encode()).hexdigest()[:12]
                ext = ".html" if "html" in content_type else ".js" if "javascript" in content_type else ".txt"
                source_path = domain_dir / f"{file_hash}{ext}"
                source_path.write_text(body[:500_000], encoding="utf-8", errors="replace")

                page = {
                    "url": str(r.url),
                    "status": r.status_code,
                    "content_type": content_type,
                    "size": len(body),
                    "source_path": str(source_path),
                    "headers": dict(r.headers),
                }
                self.pages.append(page)

                if depth < CRAWL_MAX_DEPTH and "html" in content_type:
                    links = self._extract_links(body, str(r.url))
                    for link in links:
                        if link not in self._seen:
                            queue.append((link, depth + 1))

        return self.pages

    def _extract_links(self, html: str, base: str) -> list[str]:
        links = []
        try:
            soup = BeautifulSoup(html, "html.parser")
            for tag in soup.find_all("a", href=True):
                href = urljoin(base, tag["href"])
                if _is_crawlable(href):
                    links.append(href)
            # Also extract script src for JS analysis
            for tag in soup.find_all("script", src=True):
                href = urljoin(base, tag["src"])
                if _in_scope(href):
                    links.append(href)
        except Exception:
            pass
        return links[:50]
