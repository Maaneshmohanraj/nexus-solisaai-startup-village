"""
AI Personalization Service
- Generates personalized SMS, Email, and LinkedIn messages from enriched lead data
- Inserts your Calendly link and Solisa signature automatically
"""

from __future__ import annotations

import os
import asyncio
from typing import Dict, Optional

from dotenv import load_dotenv

# ── Load env early ────────────────────────────────────────────────────────────
load_dotenv()

# OpenAI (async)
try:
    from openai import AsyncOpenAI  # openai >= 1.0
except Exception:  # pragma: no cover
    AsyncOpenAI = None  # handled below


# ── Config / Branding ─────────────────────────────────────────────────────────
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

CALENDLY_URL = os.getenv("CALENDLY_URL", "").strip() or \
               "https://calendly.com/mmohanr1-asu/new-meeting"

SENDER_NAME = os.getenv("SENDER_NAME", "XYZ")
SENDER_TITLE = os.getenv("SENDER_TITLE", "Founder")
SENDER_COMPANY = os.getenv("SENDER_COMPANY", "Solisa AI")
SENDER_PHONE = os.getenv("SENDER_PHONE", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "mxxnesh@solisa.ai")

SIGNATURE_BLOCK = (
    "\n\nBest regards,\n"
    f"{SENDER_NAME}\n"
    f"{SENDER_TITLE}\n"
    f"{SENDER_COMPANY}\n"
    f"{SENDER_PHONE}\n"
    f"{SENDER_EMAIL}"
).rstrip()


# ── Helpers ───────────────────────────────────────────────────────────────────
def _first_name(full: Optional[str]) -> str:
    if not full:
        return "there"
    return full.split()[0]


def _ensure_link_and_signature(body: str) -> str:
    b = body.strip()
    if CALENDLY_URL not in b:
        b += f"\n\n{CALENDLY_URL}\n"
    # make sure the signature (at least name & company) is present
    if SENDER_NAME not in b or SENDER_COMPANY not in b:
        b += f"{SIGNATURE_BLOCK}\n"
    return b


def _build_context(lead: Dict) -> str:
    parts = []
    if lead.get("name"):
        parts.append(f"Name: {lead['name']}")
    if lead.get("company"):
        parts.append(f"Company: {lead['company']}")
    if lead.get("job_title"):
        parts.append(f"Title: {lead['job_title']}")
    if lead.get("location"):
        parts.append(f"Location: {lead['location']}")
    if lead.get("industry"):
        parts.append(f"Industry: {lead['industry']}")
    if lead.get("company_size"):
        parts.append(f"Company Size: {lead['company_size']}")
    return " | ".join(parts)


def _parse_subject_body(raw: str) -> Dict[str, str]:
    """
    Expect:
      SUBJECT: <line>
      
      BODY:
      <multi-line body>
    """
    subject = ""
    body_lines = []
    in_body = False
    for line in raw.splitlines():
        if line.strip().startswith("SUBJECT:"):
            subject = line.split("SUBJECT:", 1)[1].strip()
        elif line.strip().startswith("BODY:"):
            in_body = True
        elif in_body:
            body_lines.append(line)
    return {"subject": subject.strip(), "body": "\n".join(body_lines).strip()}


# ── Service ───────────────────────────────────────────────────────────────────
class PersonalizationService:
    def __init__(self):
        self.has_api_key = bool(OPENAI_KEY and AsyncOpenAI)
        self.client: Optional[AsyncOpenAI] = AsyncOpenAI(api_key=OPENAI_KEY) if self.has_api_key else None
        mode = f"GPT-4x (model={MODEL})" if self.has_api_key else "MOCK"
        print(f"🤖 Personalization mode: {mode}")

    # Public API
    async def generate_messages(self, lead: Dict, force_model: Optional[str] = None) -> Dict:
        """
        Returns dict with: sms, email{subject,body}, linkedin, context_used
        """
        if not self.has_api_key or not self.client:
            return self._mock_messages(lead)

        ctx = _build_context(lead)

        try:
            sms_task = self._generate_sms(lead, ctx, force_model or MODEL)
            email_task = self._generate_email(lead, ctx, force_model or MODEL)
            li_task = self._generate_linkedin(lead, ctx, force_model or MODEL)
            sms, email, linkedin = await asyncio.gather(sms_task, email_task, li_task)
            return {
                "sms": sms,
                "email": email,
                "linkedin": linkedin,
                "context_used": ctx,
            }
        except Exception as e:
            print(f"❌ GPT error: {e}")
            return self._mock_messages(lead)

    # GPT calls
    async def _generate_sms(self, lead: Dict, context: str, model: str) -> str:
        prompt = f"""You are an expert insurance SDR writing a personalized SMS.

Lead Info:
{context}

Write one SHORT, friendly SMS (<= 160 chars) that:
- Uses the lead's first name
- Naturally references their role or company
- Offers a clear, specific value (coverage review / savings)
- Has a simple CTA to book a quick call

Return ONLY the SMS text."""
        resp = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=120,
        )
        return (resp.choices[0].message.content or "").strip()

    async def _generate_email(self, lead: Dict, context: str, model: str) -> Dict[str, str]:
        prompt = f"""You are an expert insurance sales representative writing a personalized email.

Lead Information:
{context}

Write a professional email that:
1. Has a compelling subject line (max 50 chars)
2. Opens with their name and company
3. Shows you researched them (reference their role/company)
4. Explains specific value for their situation
5. Includes a clear call-to-action
6. **Include this booking link exactly once on its own line**:
   {CALENDLY_URL}
7. Is concise (150-200 words)
8. Sounds natural and human
9. End with this exact signature block (do not modify content or order):

Best regards,
{SENDER_NAME}
{SENDER_TITLE}
{SENDER_COMPANY}
{SENDER_PHONE}
{SENDER_EMAIL}

Format your response EXACTLY like this:
SUBJECT: [subject line]

BODY:
[email body]"""
        resp = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500,
        )
        raw = (resp.choices[0].message.content or "").strip()
        parsed = _parse_subject_body(raw)

        # Safety nets
        subject = parsed.get("subject") or "Regarding your insurance coverage"
        body = _ensure_link_and_signature(parsed.get("body", ""))

        return {"subject": subject, "body": body}

    async def _generate_linkedin(self, lead: Dict, context: str, model: str) -> str:
        prompt = f"""Write a SHORT LinkedIn connection note (<= 200 chars).

Lead Info:
{context}

Rules:
- Reference their company or role naturally
- Friendly, professional, value-oriented
- Single sentence is okay
- Return ONLY the note text"""
        resp = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=120,
        )
        return (resp.choices[0].message.content or "").strip()

    # Mock fallback (no API key)
    def _mock_messages(self, lead: Dict) -> Dict:
        name = _first_name(lead.get("name"))
        company = lead.get("company") or "your company"
        title = lead.get("job_title") or "your role"
        ctx = _build_context(lead)

        sms = f"Hi {name}! Quick question about {company}'s coverage—worth a quick chat this week?"

        email_body = (
            f"Hi {name},\n\n"
            f"I noticed you're {title} at {company}. I specialize in helping teams like yours "
            f"optimize insurance coverage and reduce costs.\n\n"
            f"{CALENDLY_URL}\n"
            f"{SIGNATURE_BLOCK}\n"
        )

        linkedin = f"Hi {name} — impressed by the work at {company}. I help {title}s optimize insurance. Would love to connect!"

        return {
            "sms": sms,
            "email": {"subject": f"Insurance review for {company}", "body": email_body},
            "linkedin": linkedin,
            "context_used": ctx,
        }


# Global instance
personalization_service = PersonalizationService()
