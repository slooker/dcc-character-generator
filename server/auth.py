"""Email/password accounts, email verification and cookie sessions.

- Passwords are hashed with Argon2id (argon2-cffi defaults).
- The session cookie holds a random token; the database stores only its
  SHA-256, so a leaked database can't be replayed as cookies.
- The cookie is HttpOnly and SameSite=Lax. It is Secure when the visitor used
  HTTPS, directly or as reported by a trusted proxy's X-Forwarded-Proto
  (COOKIE_SECURE=auto, the default), so plain-HTTP LAN access still works.
- Mutating /api requests must carry an X-Requested-With header (main.py),
  which a cross-site form post can't add.
- Failed logins are rate-limited per email and per client address (the real
  visitor's address behind Cloudflare and Caddy; see proxy.py).
- A new account is signed in but unverified until the emailed 6-digit code is
  entered; saving crawlers and editing the profile need a verified address
  (`verified_user`). Changing the email sends a code to the new address, and
  the change only happens once that code is entered.

Google sign-in will add `google` rows to auth_identities next to `password`.
"""
import hashlib
import hmac
import os
import re
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from server.database import get_session
from server.mailer import MailError, send_email
from server.models import AuthIdentity, Character, EmailCode, User, UserSession, utcnow
from server.proxy import client_ip, request_scheme

COOKIE_NAME = 'crawler_session'
SESSION_DAYS = 30
PASSWORD_MIN = 8
PASSWORD_MAX = 1024
NAME_MAX = 80
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
CODE_MINUTES = 15
CODE_ATTEMPTS = 5
CODE_COOLDOWN = timedelta(seconds=60)

hasher = PasswordHasher()
# Verified against when the email is unknown, so a miss takes as long as a wrong password.
DUMMY_HASH = hasher.hash(secrets.token_urlsafe(16))

router = APIRouter(prefix='/api/auth', tags=['auth'])


class LoginLimiter:
    """In-memory sliding window of failed logins (one container, so memory is enough)."""

    def __init__(self, limit: int = 10, window: float = 15 * 60):
        self.limit = limit
        self.window = window
        self.failures: dict[str, deque] = defaultdict(deque)
        self.lock = threading.Lock()

    def _recent(self, key: str, now: float) -> deque:
        hits = self.failures[key]
        while hits and hits[0] <= now - self.window:
            hits.popleft()
        return hits

    def blocked(self, *keys: str) -> bool:
        now = time.monotonic()
        with self.lock:
            return any(len(self._recent(key, now)) >= self.limit for key in keys)

    def fail(self, *keys: str) -> None:
        now = time.monotonic()
        with self.lock:
            for key in keys:
                self._recent(key, now).append(now)

    def clear(self, *keys: str) -> None:
        with self.lock:
            for key in keys:
                self.failures.pop(key, None)

    def reset(self) -> None:
        with self.lock:
            self.failures.clear()


login_limiter = LoginLimiter()


class Credentials(BaseModel):
    email: str
    password: str


class Registration(Credentials):
    name: str = ''


class CodeBody(BaseModel):
    code: str


class ProfileBody(BaseModel):
    name: str


class EmailChange(BaseModel):
    email: str
    password: str


def normalize_email(email: str) -> str:
    return email.strip().lower()


def checked_email(email: str) -> str:
    email = normalize_email(email)
    if len(email) > 320 or not EMAIL_RE.match(email):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, 'Enter a valid email address.')
    return email


def checked_name(name: str) -> str:
    name = ' '.join(name.split())
    if len(name) > NAME_MAX:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f'Names can be at most {NAME_MAX} characters.')
    return name


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def pending_email(db: Session, user: User) -> str | None:
    row = db.scalar(select(EmailCode).where(EmailCode.user_id == user.id, EmailCode.purpose == 'change'))
    return row.email if row and row.expires_at > utcnow() else None


def user_json(db: Session, user: User) -> dict:
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'emailVerified': user.email_verified_at is not None,
        # A verification code is out and still usable (the verify screen offers "Send code" otherwise).
        'verifyCodeSent': user.email_verified_at is None and live_code(db, user, 'verify') is not None,
        'pendingEmail': pending_email(db, user),
    }


def cookie_secure(request: Request) -> bool:
    setting = os.environ.get('COOKIE_SECURE', 'auto').lower()
    if setting == 'auto':
        return request_scheme(request) == 'https'
    return setting in {'1', 'true', 'yes'}


def start_session(db: Session, user: User, request: Request, response: Response) -> None:
    token = secrets.token_urlsafe(32)
    now = utcnow()
    db.execute(delete(UserSession).where(UserSession.expires_at <= now))
    db.add(UserSession(token_hash=token_hash(token), user_id=user.id, expires_at=now + timedelta(days=SESSION_DAYS)))
    response.set_cookie(
        COOKIE_NAME, token, max_age=SESSION_DAYS * 86400, httponly=True, samesite='lax',
        secure=cookie_secure(request), path='/',
    )


def password_ok(identity: AuthIdentity | None, password: str) -> bool:
    try:
        hasher.verify(identity.password_hash if identity else DUMMY_HASH, password[:PASSWORD_MAX])
        return identity is not None
    except (VerificationError, InvalidHashError):
        return False


def password_identity(db: Session, user: User) -> AuthIdentity | None:
    return db.scalar(select(AuthIdentity).where(AuthIdentity.user_id == user.id, AuthIdentity.provider == 'password'))


# --- Emailed codes -----------------------------------------------------------

def code_hash(user_id: int, purpose: str, code: str) -> str:
    return hashlib.sha256(f'{user_id}:{purpose}:{code}'.encode()).hexdigest()


def live_code(db: Session, user: User, purpose: str) -> EmailCode | None:
    row = db.scalar(select(EmailCode).where(EmailCode.user_id == user.id, EmailCode.purpose == purpose))
    return row if row and row.expires_at > utcnow() and row.attempts < CODE_ATTEMPTS else None


def send_code(db: Session, user: User, purpose: str, email: str) -> None:
    """Email a fresh code (replacing any earlier one). Raises 429 within a minute
    of the last code and MailError if sending fails (nothing is stored then)."""
    old = db.scalar(select(EmailCode).where(EmailCode.user_id == user.id, EmailCode.purpose == purpose))
    if old and old.created_at > utcnow() - CODE_COOLDOWN:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, 'A code was just sent. Wait a minute before asking for another.')
    code = f'{secrets.randbelow(10**6):06d}'
    if purpose == 'verify':
        subject = 'Your Crawler Intake verification code'
        body = f'Your verification code is {code}\n\nEnter it in Crawler Intake to confirm this email address. It expires in {CODE_MINUTES} minutes.\n\nIf you didn\'t create an account, you can ignore this email.'
    else:
        subject = 'Confirm your new Crawler Intake email'
        body = f'Your code is {code}\n\nEnter it in Crawler Intake to change your account email to this address. It expires in {CODE_MINUTES} minutes.\n\nIf you didn\'t ask for this, you can ignore this email; nothing changes.'
    send_email(email, subject, body)
    if old:
        db.delete(old)
        db.flush()
    now = utcnow()
    db.add(EmailCode(user_id=user.id, purpose=purpose, email=email, code_hash=code_hash(user.id, purpose, code),
                     created_at=now, expires_at=now + timedelta(minutes=CODE_MINUTES)))


def try_send_code(db: Session, user: User, purpose: str, email: str) -> bool:
    """send_code for sign-up and sign-in, where a failed send shouldn't fail the request."""
    try:
        send_code(db, user, purpose, email)
        return True
    except (MailError, HTTPException):
        return False


def resend(db: Session, user: User, purpose: str, email: str) -> None:
    try:
        send_code(db, user, purpose, email)
    except MailError:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "The email couldn't be sent. Try again in a minute.")


def use_code(db: Session, user: User, purpose: str, code: str) -> EmailCode:
    """Check a code; a right one is deleted and returned. Wrong guesses count
    against the code, which stops working after CODE_ATTEMPTS."""
    row = live_code(db, user, purpose)
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, 'That code has expired. Send a new one.')
    code = re.sub(r'\D', '', code)
    if not hmac.compare_digest(row.code_hash, code_hash(user.id, purpose, code)):
        row.attempts += 1
        left = CODE_ATTEMPTS - row.attempts
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            f"That code isn't right. {left} {'try' if left == 1 else 'tries'} left." if left else 'Too many wrong codes. Send a new one.')
    db.delete(row)
    return row


# --- Dependencies ------------------------------------------------------------

def current_session(request: Request, db: Session = Depends(get_session)) -> UserSession | None:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    row = db.scalar(select(UserSession).where(UserSession.token_hash == token_hash(token)))
    if row is None or row.expires_at <= utcnow():
        return None
    return row


def current_user(row: UserSession | None = Depends(current_session), db: Session = Depends(get_session)) -> User:
    """Dependency for routes that need a signed-in user; 401 otherwise."""
    user = db.get(User, row.user_id) if row else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Sign in first.')
    return user


def verified_user(user: User = Depends(current_user)) -> User:
    """Signed in and the email address confirmed; 403 otherwise."""
    if user.email_verified_at is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'Verify your email address first.')
    return user


# --- Routes ------------------------------------------------------------------

@router.post('/register', status_code=status.HTTP_201_CREATED)
def register(body: Registration, request: Request, response: Response, db: Session = Depends(get_session)):
    email = checked_email(body.email)
    name = checked_name(body.name)
    if not PASSWORD_MIN <= len(body.password) <= PASSWORD_MAX:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f'Passwords must be at least {PASSWORD_MIN} characters.')
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        # An address nobody has verified can be claimed again, so a typo or a
        # stranger can't lock the owner out. Accounts with saved crawlers are kept.
        has_characters = db.scalar(select(Character.id).where(Character.user_id == existing.id).limit(1)) is not None
        if existing.email_verified_at is not None or has_characters:
            raise HTTPException(status.HTTP_409_CONFLICT, 'An account with that email already exists. Sign in instead.')
        db.delete(existing)
        db.flush()
    user = User(email=email, name=name)
    db.add(user)
    db.flush()
    db.add(AuthIdentity(user_id=user.id, provider='password', provider_subject=str(user.id), password_hash=hasher.hash(body.password)))
    start_session(db, user, request, response)
    sent = try_send_code(db, user, 'verify', email)
    db.commit()
    return {'user': user_json(db, user), 'codeSent': sent}


@router.post('/login')
def login(body: Credentials, request: Request, response: Response, db: Session = Depends(get_session)):
    email = normalize_email(body.email)
    keys = (f'email:{email}', f'ip:{client_ip(request)}')
    if login_limiter.blocked(*keys):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, 'Too many failed sign-ins. Try again in 15 minutes.')
    identity = db.scalar(
        select(AuthIdentity).join(User).where(User.email == email, AuthIdentity.provider == 'password')
    )
    if not password_ok(identity, body.password):
        login_limiter.fail(*keys)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Wrong email or password.')
    login_limiter.clear(keys[0])
    user = identity.user
    if hasher.check_needs_rehash(identity.password_hash):
        identity.password_hash = hasher.hash(body.password)
    start_session(db, user, request, response)
    sent = False
    if user.email_verified_at is None and live_code(db, user, 'verify') is None:
        sent = try_send_code(db, user, 'verify', user.email)
    db.commit()
    return {'user': user_json(db, user), 'codeSent': sent}


@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, row: UserSession | None = Depends(current_session), db: Session = Depends(get_session)):
    if row is not None:
        db.delete(row)
        db.commit()
    response.delete_cookie(COOKIE_NAME, path='/', httponly=True, samesite='lax', secure=cookie_secure(request))


@router.get('/me')
def me(user: User = Depends(current_user), db: Session = Depends(get_session)):
    return {'user': user_json(db, user)}


@router.post('/verify')
def verify_email(body: CodeBody, user: User = Depends(current_user), db: Session = Depends(get_session)):
    if user.email_verified_at is None:
        use_code(db, user, 'verify', body.code)
        user.email_verified_at = utcnow()
        db.commit()
    return {'user': user_json(db, user)}


@router.post('/verify/resend')
def resend_verification(user: User = Depends(current_user), db: Session = Depends(get_session)):
    if user.email_verified_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, 'Your email address is already verified.')
    resend(db, user, 'verify', user.email)
    db.commit()
    return {'user': user_json(db, user)}


@router.patch('/profile')
def update_profile(body: ProfileBody, user: User = Depends(verified_user), db: Session = Depends(get_session)):
    user.name = checked_name(body.name)
    db.commit()
    return {'user': user_json(db, user)}


@router.post('/email')
def change_email(body: EmailChange, user: User = Depends(verified_user), db: Session = Depends(get_session)):
    """Start an email change: needs the current password, then a code sent to the new address."""
    email = checked_email(body.email)
    if not password_ok(password_identity(db, user), body.password):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your current password isn't right.")
    if email == user.email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "That's already your email address.")
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, 'Another account already uses that email address.')
    resend(db, user, 'change', email)
    db.commit()
    return {'user': user_json(db, user)}


@router.post('/email/resend', status_code=status.HTTP_204_NO_CONTENT)
def resend_email_change(user: User = Depends(verified_user), db: Session = Depends(get_session)):
    email = pending_email(db, user)
    if email is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, 'There is no email change waiting. Start again.')
    resend(db, user, 'change', email)
    db.commit()


@router.post('/email/verify')
def confirm_email_change(body: CodeBody, user: User = Depends(verified_user), db: Session = Depends(get_session)):
    row = use_code(db, user, 'change', body.code)
    if db.scalar(select(User.id).where(User.email == row.email, User.id != user.id)) is not None:
        db.commit()
        raise HTTPException(status.HTTP_409_CONFLICT, 'Another account now uses that email address.')
    old_email = user.email
    user.email = row.email
    user.email_verified_at = utcnow()
    db.commit()
    try:
        send_email(old_email, 'Your Crawler Intake email was changed',
                   f'The email address for your Crawler Intake account was changed to {user.email}.\n\nIf you didn\'t do this, sign in and change it back, or contact the site owner.')
    except MailError:
        pass
    return {'user': user_json(db, user)}


@router.delete('/email', status_code=status.HTTP_204_NO_CONTENT)
def cancel_email_change(user: User = Depends(current_user), db: Session = Depends(get_session)):
    db.execute(delete(EmailCode).where(EmailCode.user_id == user.id, EmailCode.purpose == 'change'))
    db.commit()
