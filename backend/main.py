# main.py  — Solisa AI demo API (Phase 1 + Agentic Follow-ups)

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# --- your local modules ---
from database import SessionLocal, engine, Base, Lead as LeadModel, Message as MessageModel
from personalization import personalization_service  # async service you already created

load_dotenv()

# -----------------------------------------------------------------------------
# App + CORS
# -----------------------------------------------------------------------------
app = FastAPI(title="Solisa AI API", version="5.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# DB Dependency
# -----------------------------------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -----------------------------------------------------------------------------
# Helpers (serialize SQLAlchemy -> dict with ISO datetimes)
# -----------------------------------------------------------------------------
def iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if isinstance(dt, datetime) else None

def lead_to_dict(lead: LeadModel) -> Dict[str, Any]:
    return {
        "id": lead.id,
        "name": getattr(lead, "name", None),
        "email": getattr(lead, "email", None),
        "phone": getattr(lead, "phone", None),
        "status": getattr(lead, "status", None),
        "created_at": iso(getattr(lead, "created_at", None)),
        "company": getattr(lead, "company", None),
        "job_title": getattr(lead, "job_title", None),
        "location": getattr(lead, "location", None),
        "linkedin_url": getattr(lead, "linkedin_url", None),
        "company_size": getattr(lead, "company_size", None),
        "industry": getattr(lead, "industry", None),
        "enriched": getattr(lead, "enriched", None),
        "enriched_at": iso(getattr(lead, "enriched_at", None)),
    }

def msg_to_dict(m: MessageModel) -> Dict[str, Any]:
    return {
        "id": m.id,
        "lead_id": m.lead_id,
        "direction": m.direction,
        "channel": m.channel,
        "subject": getattr(m, "subject", None),
        "body": m.body,
        "provider_sid": getattr(m, "provider_sid", None),
        "status": m.status,
        "created_at": iso(m.created_at),
    }

# -----------------------------------------------------------------------------
# Health
# -----------------------------------------------------------------------------
@app.get("/")
def root():
    return {
        "message": "🎉 Solisa AI API running",
        "version": app.version,
        "timestamp": datetime.utcnow().isoformat(),
    }

# -----------------------------------------------------------------------------
# Leads (list, get)
# -----------------------------------------------------------------------------
@app.get("/api/leads")
def list_leads(db: Session = Depends(get_db)):
    leads = db.query(LeadModel).order_by(LeadModel.id.desc()).all()
    return [lead_to_dict(l) for l in leads]

@app.get("/api/leads/{lead_id}")
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(LeadModel).filter(LeadModel.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    return lead_to_dict(lead)

# -----------------------------------------------------------------------------
# Capture (simple: create + mock enrichment)
# -----------------------------------------------------------------------------
class CaptureIn(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None

@app.post("/api/leads/capture")
def capture(lead: CaptureIn, db: Session = Depends(get_db)):
    exists = db.query(LeadModel).filter(LeadModel.email == lead.email).first()
    if exists:
        raise HTTPException(status_code=400, detail=f"Lead with email {lead.email} already exists")

    now = datetime.utcnow()
    l = LeadModel(
        name=lead.name,
        email=lead.email,
        phone=lead.phone or "+15550000000",
        status="new",
        created_at=now,
        # very light mock enrichment for demo
        company="Example Inc.",
        job_title="Data Analyst",
        location="Austin, TX",
        linkedin_url="https://linkedin.com/in/demo",
        company_size="50-200 employees",
        industry="Business Services",
        enriched="success",
        enriched_at=now,
    )
    db.add(l)
    db.commit()
    db.refresh(l)
    return lead_to_dict(l)

# -----------------------------------------------------------------------------
# Personalization (single + batch)
# -----------------------------------------------------------------------------
@app.post("/api/leads/{lead_id}/personalize")
async def personalize_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(LeadModel).filter(LeadModel.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    lead_data = {
        "name": lead.name,
        "company": lead.company,
        "job_title": lead.job_title,
        "location": lead.location,
        "industry": lead.industry,
        "company_size": lead.company_size,
    }
    messages = await personalization_service.generate_messages(lead_data)
    return {
        "lead_id": lead_id,
        "lead_name": lead.name,
        "messages": messages,
        "generated_at": datetime.utcnow().isoformat(),
    }

@app.post("/api/leads/personalize/batch")
async def personalize_batch(lead_ids: List[int], db: Session = Depends(get_db)):
    out = []
    for lid in lead_ids[:10]:
        lead = db.query(LeadModel).filter(LeadModel.id == lid).first()
        if not lead:
            continue
        data = {
            "name": lead.name,
            "company": lead.company,
            "job_title": lead.job_title,
            "location": lead.location,
            "industry": lead.industry,
            "company_size": lead.company_size,
        }
        messages = await personalization_service.generate_messages(data)
        out.append({"lead_id": lid, "lead_name": lead.name, "messages": messages})
    return {"total": len(out), "results": out}

# -----------------------------------------------------------------------------
# SMS (mock out)
# -----------------------------------------------------------------------------
class SmsSendIn(BaseModel):
    regenerate: bool = False

@app.post("/api/leads/{lead_id}/sms/send")
async def send_sms(lead_id: int, body: SmsSendIn, db: Session = Depends(get_db)):
    lead = db.query(LeadModel).filter(LeadModel.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    sms_text = None
    if body.regenerate:
        messages = await personalization_service.generate_messages({
            "name": lead.name,
            "company": lead.company,
            "job_title": lead.job_title,
            "location": lead.location,
            "industry": lead.industry,
            "company_size": lead.company_size,
        })
        sms_text = messages["sms"]
    else:
        # simple fallback if not regenerating
        messages = await personalization_service.generate_messages({
            "name": lead.name,
            "company": lead.company,
            "job_title": lead.job_title,
            "location": lead.location,
            "industry": lead.industry,
            "company_size": lead.company_size,
        })
        sms_text = messages["sms"]

    msg = MessageModel(
        lead_id=lead_id,
        direction="outbound",
        channel="sms",
        body=sms_text,
        provider_sid="dry_run",
        status="queued",
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    to_num = lead.phone or "+15550000000"
    return {
        "sent": True,
        "provider": {"sid": "dry_run", "status": "queued", "to": to_num},
        "message_id": msg.id,
        "sms": sms_text,
    }

# Twilio-style inbound (form-encoded)
@app.post("/integrations/twilio/inbound")
async def twilio_inbound(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    from_num = (form.get("From") or "").strip()
    body = form.get("Body") or ""
    if not from_num:
        raise HTTPException(400, "From required")

    lead = db.query(LeadModel).filter(LeadModel.phone == from_num).first()
    if not lead:
        raise HTTPException(404, detail="No lead matched by phone")

    msg = MessageModel(
        lead_id=lead.id,
        direction="inbound",
        channel="sms",
        body=body,
        status="received",
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"ok": True, "stored_message_id": msg.id, "matched_lead_id": lead.id}

# -----------------------------------------------------------------------------
# Email (console .eml)
# -----------------------------------------------------------------------------
OUTBOX = os.path.join(os.getcwd(), "outbox", "emails")
os.makedirs(OUTBOX, exist_ok=True)
FROM_ADDR = os.getenv("EMAIL_FROM", "noreply@solisa.ai")
CALENDLY_URL = os.getenv("CALENDLY_URL") or os.getenv("NEXT_PUBLIC_CALENDLY_URL") or ""

class EmailSendIn(BaseModel):
    regenerate: bool = True

@app.post("/api/leads/{lead_id}/email/send")
async def send_email(lead_id: int, data: EmailSendIn, db: Session = Depends(get_db)):
    lead = db.query(LeadModel).filter(LeadModel.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    msgs = await personalization_service.generate_messages({
        "name": lead.name,
        "company": lead.company,
        "job_title": lead.job_title,
        "location": lead.location,
        "industry": lead.industry,
        "company_size": lead.company_size,
    })

    subject = msgs["email"]["subject"]
    body = msgs["email"]["body"]

    # ensure Calendly appears exactly once at the end
    if CALENDLY_URL and CALENDLY_URL not in body:
        body = body.rstrip() + f"\n\nBook a time: {CALENDLY_URL}\n"

    eml_name = f"{datetime.utcnow():%Y%m%d-%H%M%S}__{lead.email.replace('@','_at_')}.eml"
    eml_path = os.path.join(OUTBOX, eml_name)
    with open(eml_path, "w", encoding="utf-8") as f:
        f.write(f"From: Solisa AI <{FROM_ADDR}>\n")
        f.write(f"To: {lead.name} <{lead.email}>\n")
        f.write(f"Subject: {subject}\n")
        f.write("Content-Type: text/plain; charset=utf-8\n")
        f.write("\n")
        f.write(body)

    msg = MessageModel(
        lead_id=lead_id,
        direction="outbound",
        channel="email",
        subject=subject,
        body=body,
        provider_sid="console",
        status="queued",
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "sent": True,
        "provider": {"transport": "console", "eml_path": eml_path},
        "message_id": msg.id,
        "subject": subject,
        "to": lead.email,
    }

# Email inbound (for demo; form-encoded)
@app.post("/integrations/email/inbound")
async def email_inbound(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    sender = (form.get("From") or form.get("from") or "").strip()
    to = form.get("To") or form.get("to") or ""
    subject = form.get("Subject") or form.get("subject") or ""
    text = form.get("Text") or form.get("text") or ""

    if not sender:
        raise HTTPException(400, "From required")

    lead = db.query(LeadModel).filter(LeadModel.email == sender).first()
    if not lead:
        raise HTTPException(404, "No lead matched by email")

    msg = MessageModel(
        lead_id=lead.id,
        direction="inbound",
        channel="email",
        subject=subject,
        body=text,
        status="received",
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"ok": True, "stored_message_id": msg.id, "matched_lead_id": lead.id}

# Optional: create .eml and just return the path (UI can “Open in Mail”)
@app.post("/api/leads/{lead_id}/email/compose")
async def compose_email(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(LeadModel).filter(LeadModel.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    msgs = await personalization_service.generate_messages({
        "name": lead.name,
        "company": lead.company,
        "job_title": lead.job_title,
        "location": lead.location,
        "industry": lead.industry,
        "company_size": lead.company_size,
    })
    subject = msgs["email"]["subject"]
    body = msgs["email"]["body"]
    if CALENDLY_URL and CALENDLY_URL not in body:
        body = body.rstrip() + f"\n\nBook a time: {CALENDLY_URL}\n"

    eml_name = f"{datetime.utcnow():%Y%m%d-%H%M%S}__{lead.email.replace('@','_at_')}.eml"
    eml_path = os.path.join(OUTBOX, eml_name)
    with open(eml_path, "w", encoding="utf-8") as f:
        f.write(f"From: Solisa AI <{FROM_ADDR}>\n")
        f.write(f"To: {lead.name} <{lead.email}>\n")
        f.write(f"Subject: {subject}\n")
        f.write("Content-Type: text/plain; charset=utf-8\n\n")
        f.write(body)

    return {"ok": True, "compose_path": eml_path, "subject": subject}

# -----------------------------------------------------------------------------
# Messages thread
# -----------------------------------------------------------------------------
@app.get("/api/leads/{lead_id}/messages")
def thread(lead_id: int, db: Session = Depends(get_db)):
    msgs = (
        db.query(MessageModel)
        .filter(MessageModel.lead_id == lead_id)
        .order_by(MessageModel.created_at.asc())
        .all()
    )
    return [msg_to_dict(m) for m in msgs]

# -----------------------------------------------------------------------------
# Agentic follow-ups (Phase 2 demo)
# -----------------------------------------------------------------------------
FOLLOWUP_CTX: Dict[int, str] = {}  # simple in-memory store for demo

class AutopilotPlan(BaseModel):
    action: str                   # "sms" | "email" | "call_script" | "task" | "wait"
    when: str                     # e.g., "now", "in_2h", "tomorrow_2pm"
    body: Optional[str] = None
    subject: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

class AutopilotResult(BaseModel):
    lead_id: int
    reasoning: str
    state: Dict[str, Any]
    plan: List[AutopilotPlan]
    used_context: str

def _recent_thread_as_text(db: Session, lead_id: int, limit: int = 12) -> str:
    msgs = (
        db.query(MessageModel)
        .filter(MessageModel.lead_id == lead_id)
        .order_by(MessageModel.created_at.desc())
        .limit(limit)
        .all()
    )
    lines = []
    for m in reversed(msgs):
        who = "Prospect" if m.direction == "inbound" else "Agent"
        ch  = m.channel.upper()
        subj = f" subj={m.subject}" if getattr(m, "subject", None) else ""
        lines.append(f"[{who} {ch}{subj}] {m.body}")
    return "\n".join(lines) if lines else ""

@app.post("/api/leads/{lead_id}/followups/ingest")
async def ingest_followups(lead_id: int, request: Request, db: Session = Depends(get_db)):
    ctype = request.headers.get("content-type", "")
    text: Optional[str] = None
    try:
        if "application/json" in ctype:
            data = await request.json()
            text = (data or {}).get("text")
        else:
            form = await request.form()
            text = form.get("text")
    except Exception:
        text = None

    if not text or not text.strip():
        raise HTTPException(400, "text_required")

    lead = db.query(LeadModel).filter(LeadModel.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    FOLLOWUP_CTX[lead_id] = text.strip()

    note = MessageModel(
        lead_id=lead_id,
        direction="inbound",
        channel="note",
        body=f"[INGESTED CONTEXT]\n{text.strip()}",
        status="received",
        created_at=datetime.utcnow(),
    )
    db.add(note)
    db.commit()
    return {"ok": True, "lead_id": lead_id, "stored_bytes": len(text.strip())}

async def _run_autopilot_internal(lead_id: int, db: Session) -> AutopilotResult:
    lead = db.query(LeadModel).filter(LeadModel.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    context = FOLLOWUP_CTX.get(lead_id) or _recent_thread_as_text(db, lead_id) or "(no prior context)"

    lead_dict = {
        "name": lead.name,
        "company": lead.company,
        "job_title": lead.job_title,
        "location": lead.location,
        "industry": lead.industry,
        "company_size": lead.company_size,
    }
    drafts = await personalization_service.generate_messages(lead_dict)

    calendly = CALENDLY_URL
    email_body = drafts["email"]["body"]
    if calendly and calendly not in email_body:
        email_body = email_body.rstrip() + f"\n\nBook a time: {calendly}\n"

    lower_ctx = context.lower()
    intent = "unknown"
    if "ready" in lower_ctx or "let’s switch" in lower_ctx or "let's switch" in lower_ctx:
        intent = "ready_to_switch"
    elif "next month" in lower_ctx or "maybe" in lower_ctx:
        intent = "considering"
    elif "just browsing" in lower_ctx:
        intent = "just_browsing"

    objections = []
    if "price" in lower_ctx or "too expensive" in lower_ctx:
        objections.append("price")
    if "claim" in lower_ctx:
        objections.append("claims")

    reasoning = f"Detected intent='{intent}' with objections={objections}. Drafting next-best actions."

    plan: List[AutopilotPlan] = [
        AutopilotPlan(action="sms", when="now", body=drafts["sms"], meta={"channel": "sms"}),
        AutopilotPlan(
            action="email", when="now",
            subject=drafts["email"]["subject"], body=email_body,
            meta={"channel": "email", "calendly": calendly} if calendly else {"channel": "email"}
        ),
        AutopilotPlan(action="task", when="in_2h",
                      body="Prep ROI one-pager and claims SLA, tailored to objections.",
                      meta={"assignee": "agent", "priority": "high"}),
    ]

    # persist drafts as 'draft' messages so they appear in the timeline
    now = datetime.utcnow()
    db.add_all([
        MessageModel(lead_id=lead_id, direction="outbound", channel="sms",
                     body=drafts["sms"], status="draft", created_at=now),
        MessageModel(lead_id=lead_id, direction="outbound", channel="email",
                     subject=drafts["email"]["subject"], body=email_body,
                     status="draft", created_at=now),
    ])
    db.commit()

    return AutopilotResult(
        lead_id=lead_id,
        reasoning=reasoning,
        state={"intent": intent, "objections": objections},
        plan=plan,
        used_context=context,
    )

# canonical path your OpenAPI showed
@app.post("/api/leads/{lead_id}/followups/autopilot", response_model=AutopilotResult)
async def followups_autopilot(lead_id: int, db: Session = Depends(get_db)):
    return await _run_autopilot_internal(lead_id, db)

# alias to match the UI calling /run
@app.post("/api/leads/{lead_id}/followups/run", response_model=AutopilotResult)
async def followups_run(lead_id: int, db: Session = Depends(get_db)):
    return await _run_autopilot_internal(lead_id, db)
