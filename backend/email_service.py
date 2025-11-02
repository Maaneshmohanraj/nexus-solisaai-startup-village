# backend/email_service.py
import os, pathlib, time, smtplib
from email.message import EmailMessage
from typing import Dict, Optional
from dotenv import load_dotenv

load_dotenv()

EMAIL_TRANSPORT = os.getenv("EMAIL_TRANSPORT", "console").lower()  # console | smtp
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@solisa.ai")

OUTBOX_DIR = pathlib.Path("./outbox/emails")
OUTBOX_DIR.mkdir(parents=True, exist_ok=True)

class EmailService:
    def __init__(self):
        self.transport = EMAIL_TRANSPORT
        print(f"📧 Email transport: {self.transport.upper()}")

    def send_email(self, to_email: str, subject: str, body: str) -> Dict:
        if self.transport == "smtp":
            return self._send_smtp(to_email, subject, body)
        else:
            return self._send_console(to_email, subject, body)

    def _send_console(self, to_email: str, subject: str, body: str) -> Dict:
        ts = int(time.time())
        safe_to = to_email.replace("@", "_at_").replace("/", "_")
        fname = OUTBOX_DIR / f"{ts}-{safe_to}.eml"
        content = f"From: {EMAIL_FROM}\nTo: {to_email}\nSubject: {subject}\n\n{body}\n"
        fname.write_text(content, encoding="utf-8")
        return {
            "sid": "dry_run",
            "status": "queued",
            "to": to_email,
            "path": str(fname),
        }

    def _send_smtp(self, to_email: str, subject: str, body: str) -> Dict:
        msg = EmailMessage()
        msg["From"] = EMAIL_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            if SMTP_USER and SMTP_PASS:
                s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)

        # We don’t get a provider SID from bare SMTP; return a synthetic one
        return {
            "sid": f"smtp_{int(time.time())}",
            "status": "sent",
            "to": to_email,
        }

email_service = EmailService()
