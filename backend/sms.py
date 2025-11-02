import os
from dotenv import load_dotenv

load_dotenv()

try:
    from twilio.rest import Client  # type: ignore
except Exception:
    Client = None  # handled below

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")
DRY_RUN = os.getenv("DRY_RUN_SMS", "true").lower() == "true"

_twilio_client = Client(ACCOUNT_SID, AUTH_TOKEN) if (ACCOUNT_SID and AUTH_TOKEN and Client) else None


def send_sms(to: str, body: str) -> dict:
    """
    Sends an SMS via Twilio (or logs if DRY_RUN=true or no client configured).
    Returns a dict with sid/status/to.
    """
    if DRY_RUN or not _twilio_client:
        print(f"📤 [DRY RUN] Would send SMS to {to}: {body}")
        return {"sid": "dry_run", "status": "queued", "to": to}

    msg = _twilio_client.messages.create(
        to=to,
        from_=FROM_NUMBER,
        body=body,
    )
    return {"sid": msg.sid, "status": msg.status, "to": msg.to}
