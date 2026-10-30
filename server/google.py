"""Sign in with Google (OpenID Connect authorization code flow with PKCE).

Configure with GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (an OAuth client of
type "Web application" in Google Cloud Console). Its authorized redirect URI
must be <PUBLIC_URL>/api/auth/google/callback; PUBLIC_URL defaults to the
address the request came in on (through a trusted proxy, see proxy.py).

1. /api/auth/google/start sends the browser to Google with a random state,
   nonce and PKCE challenge, remembered in a short-lived HttpOnly cookie.
2. Google redirects back to /callback with a code. The state must match; the
   code is exchanged at Google's token endpoint (with the client secret and
   PKCE verifier). The ID token comes straight from Google over HTTPS, so per
   Google's OpenID Connect docs its claims are checked (issuer, audience,
   expiry, nonce) without verifying the signature.
3. The Google account (its stable `sub`) maps to one of our users:
   - an existing `google` identity signs in as its user;
   - otherwise Google's *verified* email links to the account with that email.
     If that account never verified the address, its password is dropped,
     because whoever set it never proved they own the email;
   - otherwise a new, already-verified account is created.
Errors redirect to /?auth_error=<code>; success redirects to /?signed_in=google.
"""
import base64
import hashlib
import json
import os
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from server.auth import checked_name, cookie_secure, normalize_email, start_session
from server.database import get_session
from server.models import AuthIdentity, EmailCode, User, UserSession, utcnow
from server.proxy import request_scheme

AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
TOKEN_URL = 'https://oauth2.googleapis.com/token'
ISSUERS = {'accounts.google.com', 'https://accounts.google.com'}
FLOW_COOKIE = 'google_oauth'
FLOW_SECONDS = 600

router = APIRouter(prefix='/api/auth/google', tags=['auth'])


class GoogleError(Exception):
    """Ends the flow; `code` goes back to the app as ?auth_error=<code>."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def client_id() -> str:
    return os.environ.get('GOOGLE_CLIENT_ID', '')


def configured() -> bool:
    return bool(client_id() and os.environ.get('GOOGLE_CLIENT_SECRET'))


def public_url(request: Request) -> str:
    configured_url = os.environ.get('PUBLIC_URL', '').rstrip('/')
    if configured_url:
        return configured_url
    return f'{request_scheme(request)}://{request.headers.get("host", request.url.netloc)}'


def redirect_uri(request: Request) -> str:
    return f'{public_url(request)}/api/auth/google/callback'


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def exchange_code(code: str, verifier: str, redirect: str) -> dict:
    """POST the code to Google's token endpoint; returns the JSON response."""
    body = urllib.parse.urlencode({
        'code': code,
        'client_id': client_id(),
        'client_secret': os.environ.get('GOOGLE_CLIENT_SECRET', ''),
        'redirect_uri': redirect,
        'grant_type': 'authorization_code',
        'code_verifier': verifier,
    }).encode()
    request = urllib.request.Request(TOKEN_URL, data=body, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.load(response)
    except (urllib.error.URLError, OSError, ValueError) as error:
        raise GoogleError('google_unavailable') from error


def id_token_claims(token: str, nonce: str) -> dict:
    try:
        payload = token.split('.')[1]
        claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
    except (IndexError, ValueError):
        raise GoogleError('google_bad_token')
    audience = claims.get('aud')
    audiences = audience if isinstance(audience, list) else [audience]
    if (claims.get('iss') not in ISSUERS or client_id() not in audiences
            or not isinstance(claims.get('exp'), (int, float)) or claims['exp'] < time.time()
            or not secrets.compare_digest(str(claims.get('nonce', '')), nonce) or not claims.get('sub')):
        raise GoogleError('google_bad_token')
    if claims.get('email_verified') is not True or not claims.get('email'):
        raise GoogleError('google_unverified_email')
    return claims


def google_user(db: Session, claims: dict) -> User:
    """The user for these Google claims, linking or creating as described above."""
    subject = str(claims['sub'])
    identity = db.scalar(select(AuthIdentity).where(AuthIdentity.provider == 'google', AuthIdentity.provider_subject == subject))
    if identity:
        return identity.user
    email = normalize_email(claims['email'])
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, name=checked_name(str(claims.get('name') or ''))[:80], email_verified_at=utcnow())
        db.add(user)
        db.flush()
    elif user.email_verified_at is None:
        # Nobody proved they own this address until now: drop the unproven
        # password and sessions so only the Google account gets in.
        db.execute(delete(AuthIdentity).where(AuthIdentity.user_id == user.id, AuthIdentity.provider == 'password'))
        db.execute(delete(UserSession).where(UserSession.user_id == user.id))
        db.execute(delete(EmailCode).where(EmailCode.user_id == user.id, EmailCode.purpose == 'verify'))
        user.email_verified_at = utcnow()
    db.add(AuthIdentity(user_id=user.id, provider='google', provider_subject=subject))
    return user


def back_to_app(request: Request, query: str) -> RedirectResponse:
    response = RedirectResponse(f'/?{query}', status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie(FLOW_COOKIE, path='/api/auth/google', httponly=True, samesite='lax', secure=cookie_secure(request))
    return response


@router.get('')
def google_status():
    """Whether the sign-in page should offer Google."""
    return {'enabled': configured()}


@router.get('/start')
def start(request: Request):
    if not configured():
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Google sign-in is not set up.')
    state, nonce, verifier = (secrets.token_urlsafe(32) for _ in range(3))
    params = urllib.parse.urlencode({
        'client_id': client_id(),
        'redirect_uri': redirect_uri(request),
        'response_type': 'code',
        'scope': 'openid email profile',
        'state': state,
        'nonce': nonce,
        'code_challenge': b64url(hashlib.sha256(verifier.encode()).digest()),
        'code_challenge_method': 'S256',
        'prompt': 'select_account',
    })
    response = RedirectResponse(f'{AUTHORIZE_URL}?{params}', status_code=status.HTTP_303_SEE_OTHER)
    response.set_cookie(FLOW_COOKIE, f'{state}.{nonce}.{verifier}', max_age=FLOW_SECONDS, httponly=True,
                        samesite='lax', secure=cookie_secure(request), path='/api/auth/google')
    return response


@router.get('/callback')
def callback(request: Request, db: Session = Depends(get_session)):
    if not configured():
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Google sign-in is not set up.')
    params = request.query_params
    if params.get('error'):
        return back_to_app(request, 'auth_error=google_cancelled')
    try:
        state, nonce, verifier = request.cookies.get(FLOW_COOKIE, '').split('.')
    except ValueError:
        return back_to_app(request, 'auth_error=google_expired')
    if not params.get('code') or not secrets.compare_digest(params.get('state', ''), state):
        return back_to_app(request, 'auth_error=google_expired')
    try:
        tokens = exchange_code(params['code'], verifier, redirect_uri(request))
        if not tokens.get('id_token'):
            raise GoogleError('google_bad_token')
        user = google_user(db, id_token_claims(tokens['id_token'], nonce))
    except GoogleError as error:
        db.rollback()
        return back_to_app(request, f'auth_error={error.code}')
    response = back_to_app(request, 'signed_in=google')
    start_session(db, user, request, response)
    db.commit()
    return response
