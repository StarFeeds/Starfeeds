"""Can a project link be shown inside LikeMinds (in an iframe)?

Many sites forbid framing via `X-Frame-Options` or CSP `frame-ancestors`.
Browsers don't let the page read those headers cross-origin, so the
frontend asks here first and falls back to "open in a new tab" when the
site can't be embedded.

The server fetches user-supplied URLs, so every hop is resolved and
rejected if it points at a private/loopback/link-local address (SSRF guard).
"""

import asyncio
import ipaddress
import socket
import time
from urllib.parse import urljoin, urlparse

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.api.deps import CurrentUser
from app.core.config import settings

router = APIRouter(prefix="/links", tags=["links"])

MAX_REDIRECTS = 4
TIMEOUT = httpx.Timeout(6.0)
CACHE_TTL = 3600
_cache: dict[str, tuple[float, "LinkCheck"]] = {}


class LinkCheck(BaseModel):
    url: str
    embeddable: bool
    reachable: bool


async def _is_public_host(host: str) -> bool:
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror:
        return False
    for *_, sockaddr in infos:
        ip = ipaddress.ip_address(sockaddr[0])
        if not ip.is_global:
            return False
    return bool(infos)


def _source_matches(src: str, origin: str) -> bool:
    """Does a CSP source expression (e.g. `https://*.example.com`, `https:`,
    `example.com`) cover one of our frontend origins?"""
    o = urlparse(origin)
    src = src.rstrip("/").lower()
    if src == "*" or src == f"{o.scheme}:":
        return True
    if "://" in src:
        scheme, host = src.split("://", 1)
        if scheme != o.scheme:
            return False
    else:
        host = src
    host = host.split("/", 1)[0]
    if host.startswith("*."):
        return bool(o.hostname) and o.hostname.endswith(host[1:])
    return host == o.netloc or host == o.hostname


def _frame_ancestors_allow(csp_values: list[str]) -> bool:
    """True unless a CSP frame-ancestors directive excludes all our origins."""
    origins = settings.cors_origins_list
    for csp in csp_values:
        for directive in csp.split(";"):
            parts = directive.strip().split()
            if not parts or parts[0].lower() != "frame-ancestors":
                continue
            if not any(_source_matches(s, o) for s in parts[1:] for o in origins):
                return False
    return True


def _embeddable(headers: httpx.Headers) -> bool:
    xfo = headers.get("x-frame-options", "").strip().lower()
    if xfo in ("deny", "sameorigin") or xfo.startswith("allow-from"):
        return False
    return _frame_ancestors_allow(headers.get_list("content-security-policy"))


async def _check(url: str) -> LinkCheck:
    current = url
    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False) as client:
        for _ in range(MAX_REDIRECTS + 1):
            parsed = urlparse(current)
            if parsed.scheme not in ("http", "https") or not parsed.hostname:
                break
            if not await _is_public_host(parsed.hostname):
                break
            try:
                async with client.stream(
                    "GET", current, headers={"User-Agent": "LikeMinds-LinkCheck/1.0"}
                ) as resp:
                    if resp.is_redirect and "location" in resp.headers:
                        current = urljoin(current, resp.headers["location"])
                        continue
                    # An https page can't frame plain-http content (mixed content).
                    ok = resp.status_code < 400 and parsed.scheme == "https"
                    return LinkCheck(url=current, embeddable=ok and _embeddable(resp.headers), reachable=True)
            except httpx.HTTPError:
                break
    return LinkCheck(url=current, embeddable=False, reachable=False)


@router.get("/check", response_model=LinkCheck)
async def check_link(_: CurrentUser, url: str = Query(max_length=500)) -> LinkCheck:
    now = time.monotonic()
    hit = _cache.get(url)
    if hit and now - hit[0] < CACHE_TTL:
        return hit[1]
    result = await _check(url)
    if len(_cache) > 1000:
        _cache.clear()
    _cache[url] = (now, result)
    return result
