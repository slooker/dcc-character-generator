"""Who a request really came from, behind Cloudflare Tunnel and Caddy.

Through the tunnel every request reaches the app from Caddy, so the TCP peer
is the same internal address for every visitor. Forwarded headers are believed
only when that peer is a trusted proxy (TRUSTED_PROXIES: comma-separated
IPs/CIDRs; default the private and loopback ranges). A visitor's address is
then, in order:

- CF-Connecting-IP: set by Cloudflare to the real visitor (tunnel traffic).
- The last X-Forwarded-For entry: added by Caddy for LAN HTTPS visitors.
- The TCP peer.

Requests from anywhere else keep their TCP peer and can't spoof either header.
"""
import ipaddress
import os
from functools import lru_cache

from starlette.requests import Request

DEFAULT_TRUSTED = '127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,::1/128,fc00::/7'


@lru_cache
def trusted_networks(setting: str) -> tuple:
    return tuple(ipaddress.ip_network(x.strip(), strict=False) for x in setting.split(',') if x.strip())


def parse_ip(value: str | None):
    try:
        return ipaddress.ip_address((value or '').strip())
    except ValueError:
        return None


def peer_trusted(request: Request) -> bool:
    peer = parse_ip(request.client.host if request.client else None)
    networks = trusted_networks(os.environ.get('TRUSTED_PROXIES', DEFAULT_TRUSTED))
    return peer is not None and any(peer in network for network in networks)


def client_ip(request: Request) -> str:
    peer = request.client.host if request.client else '?'
    if not peer_trusted(request):
        return peer
    cloudflare = parse_ip(request.headers.get('cf-connecting-ip'))
    if cloudflare:
        return str(cloudflare)
    forwarded = parse_ip(request.headers.get('x-forwarded-for', '').split(',')[-1])
    return str(forwarded) if forwarded else peer


def request_scheme(request: Request) -> str:
    """https when a trusted proxy says the visitor used HTTPS (Caddy's X-Forwarded-Proto)."""
    if peer_trusted(request):
        forwarded = request.headers.get('x-forwarded-proto', '').split(',')[0].strip().lower()
        if forwarded in {'http', 'https'}:
            return forwarded
    return request.url.scheme
