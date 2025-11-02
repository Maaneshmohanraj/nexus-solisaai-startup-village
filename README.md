# Solisa AI — Lead→Meeting in Minutes (Phase 1 + Agentic Follow-ups)

Solisa AI turns raw insurance leads into **booked meetings in under two minutes**.
It **auto-enriches** every form fill, generates **hyper-personalized** outreach (SMS, Email, LinkedIn), logs inbound replies, and proposes **agentic next-best actions**—so agents sell more and chase less.

---

## ✨ What’s in this repo

* **Backend (FastAPI)**

  * Lead capture + DB (SQLAlchemy)
  * **Clay** async enrichment via secure callback
  * **AI personalization** (OpenAI) → SMS, Email, LinkedIn copy
  * **Email**: preview/console send, optional “Compose in Apple Mail”
  * **SMS (mock)**: send + inbound webhook (Twilio-shaped)
  * **Agentic Autopilot**: ingest transcripts/notes → next best action
  * Message timeline (inbound/outbound) per lead

* **Frontend (Next.js 16 + Tailwind)**

  * **/capture**: beautiful lead form (confirmation modal)
  * **/leads**: dashboard, search, status, action buttons
  * **/leads/[id]/personalize**: AI messages + Email preview modal + “Compose in Mail”
  * **/leads/[id]/followups**: Autopilot (ingest context & propose next steps)
  * **/retention (Phase 3 preview)**: UI skeleton to demo roadmap

---

## 🧱 Tech

* **Backend:** Python 3.11, FastAPI, SQLAlchemy, httpx, pydantic
* **AI:** OpenAI SDK (Chat Completions; default model set to `gpt-4o-mini`)
* **DB:** Postgres (recommended) or SQLite fallback
* **Frontend:** Next.js 16 (Turbopack), Tailwind, @tailwindcss/postcss
* **Enrichment:** Clay webhooks (secure token)
* **Email:** Console/EML outbox + Apple Mail compose (macOS)
* **SMS:** Twilio-shaped endpoints (dry-run by default)

---

## ⚙️ Prerequisites

* **Python 3.11+**
* **Node 18+** (or 20+)
* **Postgres 14+** (or Docker) — optional; otherwise SQLite is used
* macOS (only required for the Apple Mail compose feature)

---

## 🔑 Environment variables

### Backend (`backend/.env`)

```env
# DB (Postgres recommended). If absent, SQLite fallback is used.
DATABASE_URL=postgresql+psycopg2://aegis:password@localhost:5432/aegis_db

# OpenAI (required for live personalization; mock if absent)
OPENAI_API_KEY=sk-...

# Clay enrichment (real mode)
CLAY_API_KEY=clay_xxx               # if your enrichment service uses it
CLAY_CALLBACK_TOKEN=supersecrettoken
# Your public callback URL when testing Clay webhooks (e.g. via localtunnel)
CLAY_CALLBACK_URL=https://your-tunnel.example.com/integrations/clay/callback
```

> **Note:** If `OPENAI_API_KEY` is not set, backend will still run in **MOCK** personalization mode.

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8010
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/your-handle/new-meeting
```

---

## 🚀 Quick start

### 1) Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# run API
uvicorn main:app --reload --port 8010
```

You should see:

```
🎉 Solisa AI API running
✅ Database ready!
```

**Optional: Postgres via Docker**

```bash
docker run -d --name aegis-postgres -e POSTGRES_USER=aegis -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=aegis_db -p 5432:5432 postgres:14
# set DATABASE_URL to postgresql+psycopg2://aegis:password@localhost:5432/aegis_db
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev -p 3000
```

Open: **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 End-to-end demo script (50 seconds)

1. **Capture:** Go to **/capture**, enter name/email/phone → **Submit**.
   Backend saves the lead, enriches (mock or Clay), returns instantly.
2. **Leads:** Go to **/leads**, open the card → click **Generate AI Messages**.
   See SMS, Email (subject+body with **Calendly link**), LinkedIn.
3. **Email:** Click **Compose in Mail** (on macOS) → Apple Mail popup with pre-filled email.
   Or use **Send (Console)** to generate `.eml` preview and log to timeline.
4. **Replies:** Use the **inbound SMS/email webhooks** (mock) to show two-way thread on the lead’s **Messages** tab.
5. **Autopilot:** Click **Run Autopilot**, paste a messy call note/transcript → get **Next Best Action** (nudge SMS, call script, wait, escalate).

---

## 🔌 Key API endpoints

* `POST /api/leads/capture` – create + enrich (async callback supported)
* `GET  /api/leads` – list leads
* `GET  /api/leads/{id}` – lead detail
* `POST /api/leads/{id}/personalize` – generate SMS/Email/LinkedIn
* `POST /api/leads/{id}/email/send` – console/EML “send” + timeline log
* `POST /api/leads/{id}/email/compose` – **Apple Mail** compose popup (macOS)
* `POST /api/leads/{id}/sms/send` – mock SMS send + timeline log
* `GET  /api/leads/{id}/messages` – thread (inbound/outbound)
* `POST /integrations/twilio/inbound` – mock inbound SMS (x-www-form-urlencoded)
* `POST /integrations/email/inbound` – mock inbound email (x-www-form-urlencoded)
* `POST /api/leads/{id}/followups/ingest` – add transcript/notes
* `POST /api/leads/{id}/followups/autopilot` – propose next-best action(s)
* `POST /integrations/clay/callback` – Clay webhook (requires `x-callback-token`)

---

## 🖥️ Frontend routes

* **/** – Home
* **/capture** – Lead intake form (with confirmation modal)
* **/leads** – Dashboard (stats, search, cards)
* **/leads/[id]/personalize** – AI messages + Email preview modal + “Compose”
* **/leads/[id]/followups** – Autopilot (ingest + actions)
* **/retention** – Phase 3 UI preview (non-blocking demo page)

---

## 🧵 CLI / curl cookbook

Create a lead:

```bash
EMAIL="demo$(date +%s)@example.com"
curl -s -X POST http://127.0.0.1:8010/api/leads/capture \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo","email":"'"$EMAIL"'","phone":"+15550000000"}' | jq
```

Personalize:

```bash
LEAD_ID=1
curl -s -X POST http://127.0.0.1:8010/api/leads/$LEAD_ID/personalize | jq
```

Mock SMS send + inbound:

```bash
curl -s -X POST http://127.0.0.1:8010/api/leads/$LEAD_ID/sms/send \
  -H 'Content-Type: application/json' \
  -d '{"regenerate": false}' | jq

curl -s -X POST http://127.0.0.1:8010/integrations/twilio/inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=+15550000000" \
  --data-urlencode "To=+15550009999" \
  --data-urlencode "Body=Yes, tomorrow 2pm works" | jq
```

Email send (console outbox):

```bash
curl -s -X POST http://127.0.0.1:8010/api/leads/$LEAD_ID/email/send \
  -H 'Content-Type: application/json' \
  -d '{"regenerate": true}' | jq
# Preview last email (macOS):
LATEST=$(ls -t outbox/emails/*.eml | head -n1); open "$LATEST"
```

Apple Mail compose (macOS):

```bash
curl -s -X POST http://127.0.0.1:8010/api/leads/$LEAD_ID/email/compose | jq
```

Agentic follow-ups:

```bash
curl -s -X POST "http://127.0.0.1:8010/api/leads/$LEAD_ID/followups/ingest" \
  -F "text=prospect: i'm just browsing… price high. agent: can tailor. renewal in march." | jq

curl -s -X POST "http://127.0.0.1:8010/api/leads/$LEAD_ID/followups/autopilot" | jq
```

---

## 🧰 Troubleshooting

**Port in use (8010/3000):**

```bash
lsof -tiTCP:8010 -sTCP:LISTEN | xargs -r kill -9
lsof -tiTCP:3000 -sTCP:LISTEN | xargs -r kill -9
```

**`python-multipart` required (for form endpoints):**

```bash
pip install python-multipart
```

**Tailwind PostCSS error (`install @tailwindcss/postcss`):**

```bash
npm i -D @tailwindcss/postcss postcss autoprefixer
```

**NEXT_PUBLIC vars not loading:** put them in `frontend/.env.local`, then **restart** `npm run dev`.

**Clay callback 403/404:**
Use the exact route `/integrations/clay/callback` and pass header `x-callback-token: $CLAY_CALLBACK_TOKEN`.

**Apple Mail compose doesn’t pop:** macOS only, requires Apple Mail installed and allowed to be scripted.

---

## 🗺️ Roadmap

* **Phase 2 – Agentic Follow-up Brain**

  * Multi-turn memory across SMS/email/call notes
  * Intent shift detection, human-perfect tone
  * Escalation briefs incl. ROI snippets & scripts

* **Phase 3 – Lifeline Retention Agent (UI preview included)**

  * Life Event Engine (new baby, home, job)
  * Policy Health Score (0–100), proactive offers
  * Occasion Engine (anniversary, birthday) + upsells

---

## 📜 License

MIT — feel free to fork, extend, and ship.

---

## ⚡ Pitch (use in your repo description)

**“Solisa AI turns raw insurance leads into booked meetings in under two minutes—auto-enriching every form fill, drafting hyper-personalized outreach, and running agentic follow-ups that remember context across channels.”**
