# backend/followup_agent.py
import os, json, asyncio
from typing import Dict, List, Any
from openai import OpenAI
import httpx
from datetime import datetime, timedelta

OPENAI_MODEL = os.getenv("FOLLOWUP_MODEL", "gpt-4o-mini")
CALENDLY_URL = os.getenv("CALENDLY_URL", "https://calendly.com/mmohanr1-asu/new-meeting")
API_BASE = os.getenv("AGENT_SELF_API", "http://127.0.0.1:8010")  # self-calls to our API
AGENT_ENABLED = os.getenv("AGENT_AUTOPILOT", "on").lower() in ("1","true","on","yes")
AGENT_MIN_INTERVAL_SEC = int(os.getenv("AGENT_MIN_INTERVAL_SEC", "30"))  # throttle

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM = (
  "You are a follow-up copilot for insurance sales. "
  "Given messy multi-touch history (calls, texts, emails, notes), "
  "return a compact JSON plan with: summary, stage, intent_signal, objections[], "
  "recommended_actions[], and 3 messages (sms_1, sms_2, email) in the prospect’s tone. "
  "Prefer concise, human-sounding copy. Keep SMS < 300 chars; email 120–180 words."
)

def _prompt(lead: Dict[str, Any], events: List[Dict[str, Any]], calendly_url: str) -> str:
    who = f"{lead.get('name')} — {lead.get('job_title','')} @ {lead.get('company','')}".strip()
    ctx = []
    for e in events[-15:]:
        stamp = e.get("created_at","")
        line = f"[{stamp}] {e.get('channel','note').upper()} {e.get('direction','')}: {e.get('subject') or ''} {e.get('body') or ''}".strip()
        ctx.append(line)
    history = "\n".join(ctx) or "(no history)"
    return f"""
LEAD:
- {who}
- Location: {lead.get('location','')}
- Industry: {lead.get('industry','')}
- Company size: {lead.get('company_size','')}

HISTORY (most recent last):
{history}

TASK:
1) One-sentence situation summary.
2) Stage (one of: cold, curious, evaluating, ready_to_switch, closed_lost).
3) Intent signal (short phrase).
4) Objections: array of short strings.
5) Recommended_actions: array of objects: 
   - type: one of [sms, email, call_script, task, wait]
   - title: short
   - body: one-liner or script
   - when: now/after_2_days/etc
6) Messages:
   - sms_1 (concise, friendly, prospect tone)
   - sms_2 (value/ROI angle)
   - email (include booking link once on its own line): {calendly_url}

Return ONLY valid JSON with keys:
summary, stage, intent_signal, objections, recommended_actions, sms_1, sms_2, email
"""

def analyze(lead: Dict[str, Any], events: List[Dict[str, Any]], calendly_url: str) -> Dict[str, Any]:
    """LLM analysis -> JSON plan"""
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role":"system","content":SYSTEM},
            {"role":"user","content":_prompt(lead, events, calendly_url)}
        ],
        temperature=0.4,
        response_format={"type":"json_object"},
    )
    try:
        return json.loads(resp.choices[0].message.content)
    except Exception:
        # safe fallback
        return {
            "summary":"Light interest; pricing concern. Recommend quick nudge + ROI email.",
            "stage":"evaluating",
            "intent_signal":"asked pricing last call",
            "objections":["too expensive"],
            "recommended_actions":[
                {"type":"sms","title":"Nudge","body":"Can price a lighter plan for apples-to-apples. Want me to send it?","when":"now"},
                {"type":"email","title":"ROI example","body":"Send ROI proof + booking link","when":"now"}
            ],
            "sms_1":"Quick one — I can quote a lighter plan to compare apples-to-apples. Want me to send it?",
            "sms_2":"We just cut a similar team’s premium 14% without losing coverage. Want a side-by-side?",
            "email":f"Subject: Quick path to savings\n\nHi there…\n\nBook a time:\n{calendly_url}\n"
        }

async def _post_json(url: str, payload: Dict[str, Any]):
    async with httpx.AsyncClient(timeout=10) as ac:
        r = await ac.post(url, json=payload)
        r.raise_for_status()
        return r.json()

async def act(lead_id: int, plan: Dict[str, Any]):
    """Fire actions: 2 SMS + Email, plus add handoff note when needed."""
    # Send SMS 1
    if plan.get("sms_1"):
        await _post_json(f"{API_BASE}/api/leads/{lead_id}/sms/send",
                         {"regenerate": False, "override_text": plan["sms_1"]})
    # Send Email (parse subject if provided)
    email = plan.get("email","").strip()
    subject = "Follow-up on coverage & quick booking"
    body = email
    if email.lower().startswith("subject:"):
        lines = email.splitlines()
        subject = lines[0][8:].strip() or subject
        body = "\n".join(lines[2:]).strip() if len(lines) > 2 else ""

    if CALENDLY_URL not in body:
        body += f"\n\nBook a time:\n{CALENDLY_URL}\n"

    await _post_json(f"{API_BASE}/api/leads/{lead_id}/email/send",
                     {"regenerate": False, "override_subject": subject, "override_body": body})

    # Send SMS 2 (value/ROI)
    if plan.get("sms_2"):
        await _post_json(f"{API_BASE}/api/leads/{lead_id}/sms/send",
                         {"regenerate": False, "override_text": plan["sms_2"]})

    # Escalate condition: repeated budget objection
    objs = [o.lower() for o in plan.get("objections",[])]
    if sum("expensive" in o or "budget" in o or "price" in o for o in objs) >= 1:
        brief = (
          f"ESCALATE: Pricing resistance.\n\nSUMMARY: {plan.get('summary')}\n"
          f"STAGE: {plan.get('stage')} • SIGNAL: {plan.get('intent_signal')}\n"
          "SCRIPT:\n"
          "- Acknowledge cost.\n- Offer lighter plan quote.\n- Share 1-liner ROI: "
          "'Teams like yours saved ~12–18% keeping same coverage.'\n"
          f"- Close with booking link: {CALENDLY_URL}\n"
        )
        await _post_json(f"{API_BASE}/api/leads/{lead_id}/notes",
                         {"subject":"escalate_to_human", "body": brief})

# --- public entry point used by main.py ---
_last_run: Dict[int, datetime] = {}

async def run_autopilot(lead: Dict[str, Any], events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze + act (throttled). Returns the plan."""
    if not AGENT_ENABLED:
        return {"disabled": True}

    now = datetime.utcnow()
    last = _last_run.get(lead["id"])
    if last and (now - last) < timedelta(seconds=AGENT_MIN_INTERVAL_SEC):
        return {"throttled": True, "last_run": last.isoformat()}

    plan = analyze(lead, events, CALENDLY_URL)
    await act(lead["id"], plan)
    _last_run[lead["id"]] = now
    return {"executed": True, "plan": plan}
