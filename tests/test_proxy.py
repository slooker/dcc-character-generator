from __future__ import annotations

import os
import unittest
from unittest import mock

from starlette.requests import Request

from server.proxy import client_ip, request_scheme


def request(peer: str, headers: dict[str, str] | None = None, scheme: str = "http") -> Request:
    return Request({
        "type": "http",
        "method": "GET",
        "path": "/",
        "scheme": scheme,
        "server": ("dcc.slooker.us", 80),
        "client": (peer, 50000),
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
    })


class ProxyTests(unittest.TestCase):
    """Behind Cloudflare Tunnel + Caddy, the visitor's address and scheme come from trusted proxy headers."""

    def test_tunnel_visitor_uses_cf_connecting_ip(self) -> None:
        r = request("172.18.0.1", {"CF-Connecting-IP": "203.0.113.9", "X-Forwarded-For": "192.168.0.66", "X-Forwarded-Proto": "https"})
        self.assertEqual(client_ip(r), "203.0.113.9")
        self.assertEqual(request_scheme(r), "https")

    def test_lan_https_visitor_uses_caddys_forwarded_for(self) -> None:
        r = request("172.18.0.1", {"X-Forwarded-For": "1.2.3.4, 192.168.0.16"})
        self.assertEqual(client_ip(r), "192.168.0.16")

    def test_direct_lan_visitor_is_the_peer(self) -> None:
        r = request("192.168.0.16")
        self.assertEqual((client_ip(r), request_scheme(r)), ("192.168.0.16", "http"))

    def test_untrusted_peers_cannot_spoof_headers(self) -> None:
        r = request("203.0.113.50", {"CF-Connecting-IP": "1.1.1.1", "X-Forwarded-For": "1.1.1.1", "X-Forwarded-Proto": "https"})
        self.assertEqual((client_ip(r), request_scheme(r)), ("203.0.113.50", "http"))

    def test_garbage_headers_fall_back_to_the_peer(self) -> None:
        r = request("172.18.0.1", {"CF-Connecting-IP": "not-an-ip", "X-Forwarded-For": "also bad", "X-Forwarded-Proto": "gopher"})
        self.assertEqual((client_ip(r), request_scheme(r)), ("172.18.0.1", "http"))

    def test_trusted_proxies_can_be_narrowed(self) -> None:
        with mock.patch.dict(os.environ, {"TRUSTED_PROXIES": "172.18.0.1/32"}):
            self.assertEqual(client_ip(request("192.168.0.16", {"CF-Connecting-IP": "1.1.1.1"})), "192.168.0.16")
            self.assertEqual(client_ip(request("172.18.0.1", {"CF-Connecting-IP": "1.1.1.1"})), "1.1.1.1")


if __name__ == "__main__":
    unittest.main(verbosity=2)
