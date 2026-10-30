"""Outgoing email (verification codes).

Configure one of these with environment variables (docker-compose.yaml passes
them through from `.env`):

- Bird (bird.com email API): BIRD_API_KEY. Used first when set.
- SMTP: SMTP_HOST, SMTP_PORT (587), SMTP_USERNAME, SMTP_PASSWORD,
  SMTP_SECURITY (starttls | ssl | none; default starttls).

MAIL_FROM sets the sender, e.g. `Crawler Intake <noreply@mail.example.com>`.
With Bird it defaults to Bird's shared onboarding sender, which needs no domain
setup but only delivers to verified members of your Bird workspace; verify a
sending domain in Bird (Email > Domains) to email anyone else. With SMTP it
defaults to SMTP_USERNAME.

With neither configured, emails are written to the server log instead, so codes
can be read with `docker compose logs` while developing. Every message is also
kept in `sent` (the last 50) for tests.
"""
import logging
import os
import smtplib
import ssl
from collections import deque
from email.message import EmailMessage
from email.utils import parseaddr

log = logging.getLogger('uvicorn.error')
sent: deque = deque(maxlen=50)

BIRD_ONBOARDING_SENDER = 'Crawler Intake <onboarding@messagebird.dev>'


class MailError(Exception):
    pass


def send_email(to: str, subject: str, body: str) -> None:
    bird_key = os.environ.get('BIRD_API_KEY')
    host = os.environ.get('SMTP_HOST')
    message = EmailMessage()
    message['To'] = to
    message['Subject'] = subject
    message['From'] = (os.environ.get('MAIL_FROM')
                       or (BIRD_ONBOARDING_SENDER if bird_key else os.environ.get('SMTP_USERNAME'))
                       or 'crawler-intake@localhost')
    message.set_content(body)
    sent.append(message)

    if bird_key:
        send_bird(bird_key, message)
    elif host:
        send_smtp(host, message)
    else:
        log.warning('No email service is configured (BIRD_API_KEY or SMTP_HOST); email to %s not sent.\nSubject: %s\n%s', to, subject, body)


def send_bird(api_key: str, message: EmailMessage) -> None:
    from bird import APIError, Bird  # messagebird-sdk; only needed when Bird is configured

    name, email = parseaddr(message['From'])
    sender = {'email': email, 'name': name} if name else {'email': email}
    try:
        with Bird(api_key=api_key, timeout=15) as client:
            result = client.email.send(from_=sender, to=[message['To']], subject=message['Subject'], text=message.get_content())
    except APIError as error:
        log.error('Bird could not send email to %s: %s', message['To'], error)
        raise MailError(str(error)) from error
    # Bird accepts the message (202) and delivers it afterwards; the id finds it in the Bird dashboard.
    log.info('Bird accepted email to %s: %s %s', message['To'], result.id, result.status)


def send_smtp(host: str, message: EmailMessage) -> None:
    port = int(os.environ.get('SMTP_PORT', '587'))
    security = os.environ.get('SMTP_SECURITY', 'starttls').lower()
    username = os.environ.get('SMTP_USERNAME')
    password = os.environ.get('SMTP_PASSWORD')
    context = ssl.create_default_context()
    try:
        if security == 'ssl':
            server = smtplib.SMTP_SSL(host, port, timeout=15, context=context)
        else:
            server = smtplib.SMTP(host, port, timeout=15)
        with server:
            if security == 'starttls':
                server.starttls(context=context)
            if username:
                server.login(username, password or '')
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as error:
        log.error('Could not send email to %s: %s', message['To'], error)
        raise MailError(str(error)) from error
