'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, MessageSquare, Mail, Phone, Clock, PlayCircle,
  Inbox, Send, FileText, Check, AlertTriangle, RefreshCw
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8010';

export default function FollowupsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [running, setRunning] = useState(false);
  const [plan, setPlan] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  // small helper to safely JSON-parse any response
  const parseJSON = async (res) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`HTTP ${res.status} — Non-JSON response:\n${text.slice(0, 400)}`);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const leadRes = await fetch(`${API}/api/leads/${id}`);
        if (!leadRes.ok) throw new Error(`Lead fetch failed: ${leadRes.status}`);
        const leadData = await parseJSON(leadRes);

        const msgsRes = await fetch(`${API}/api/leads/${id}/messages`);
        if (!msgsRes.ok) throw new Error(`Messages fetch failed: ${msgsRes.status}`);
        const msgsData = await parseJSON(msgsRes);

        setLead(leadData);
        setMessages(Array.isArray(msgsData) ? msgsData : []);
      } catch (e) {
        console.error(e);
        setError(e.message || 'Failed to load followups page');
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const showToast = (msg, kind = 'info') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2500);
  };

  const ingestContext = async () => {
    if (!transcript.trim()) return showToast('Paste some context first', 'warn');
    try {
      setIngesting(true);
      const fd = new FormData();
      fd.append('text', transcript);
      const res = await fetch(`${API}/api/leads/${id}/followups/ingest`, { method: 'POST', body: fd });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Ingest failed: ${res.status} ${t}`);
      }
      showToast('Context ingested ✅', 'ok');
      await refreshMessages();
    } catch (e) {
      console.error(e);
      showToast('Ingest error', 'error');
    } finally {
      setIngesting(false);
    }
  };

  const runAutopilot = async () => {
    try {
      setRunning(true);
      setError(null);
      let res = await fetch(`${API}/api/leads/${id}/followups/run`, { method: 'POST' });
      if (res.status === 404) {
        // fallback if your backend hasn’t got /run and only supports /next
        res = await fetch(`${API}/api/leads/${id}/followups/next`, { method: 'POST' });
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Autopilot failed: ${res.status} ${t}`);
      }
      const data = await parseJSON(res);
      setPlan(normalizePlan(data));
      showToast('Autopilot ready ✅', 'ok');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Autopilot error');
    } finally {
      setRunning(false);
    }
  };

  const sendSMS = async (body) => {
    try {
      const res = await fetch(`${API}/api/leads/${id}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: !body, body }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast('SMS sent (mock) ✅', 'ok');
      await refreshMessages();
    } catch (e) {
      console.error(e);
      showToast('SMS send failed', 'error');
    }
  };

  const sendEmail = async (subject, body) => {
    try {
      const res = await fetch(`${API}/api/leads/${id}/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: !(subject && body), subject, body }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast('Email queued ✅', 'ok');
      await refreshMessages();
    } catch (e) {
      console.error(e);
      showToast('Email send failed', 'error');
    }
  };

  const composeInMail = async (subject, body) => {
    try {
      const res = await fetch(`${API}/api/leads/${id}/email/compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast('Opening Mail… ✉️', 'ok');
    } catch (e) {
      console.error(e);
      showToast('Compose failed', 'error');
    }
  };

  const refreshMessages = async () => {
    try {
      const msgsRes = await fetch(`${API}/api/leads/${id}/messages`);
      if (!msgsRes.ok) throw new Error('Failed to refresh messages');
      setMessages(await parseJSON(msgsRes));
    } catch (e) {
      console.error(e);
      showToast('Refresh failed', 'error');
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <ErrorBox message={error} />
      </Shell>
    );
  }

  if (!lead) {
    return (
      <Shell>
        <EmptyState icon={<AlertTriangle className="h-10 w-10 text-amber-500" />} title="Lead not found" />
      </Shell>
    );
  }

  return (
    <Shell>
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2 text-sm shadow ${
            toast.kind === 'ok'
              ? 'bg-green-600 text-white'
              : toast.kind === 'error'
              ? 'bg-red-600 text-white'
              : toast.kind === 'warn'
              ? 'bg-amber-500 text-white'
              : 'bg-neutral-800 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <Link href="/leads" className="text-sm text-blue-600 hover:text-blue-700">
            All Leads
          </Link>
        </div>

        {/* Lead Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{lead.name}</h1>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                {lead.email} • {lead.phone || 'no phone'}
              </p>
              <p className="text-sm text-gray-600 dark:text-neutral-300 mt-2">
                {lead.job_title || '—'} @ {lead.company || '—'} • {lead.location || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={lead.enriched === 'success' ? 'green' : 'amber'}>
                {lead.enriched === 'success' ? 'Enriched' : 'Pending'}
              </Badge>
            </div>
          </div>
        </div>

        {/* 2-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Context + Autopilot */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transcript box */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text白 mb-2">Ingest context (calls, emails, notes)</h2>
              <p className="text-sm text-gray-500 dark:text-neutral-400 mb-3">
                Paste any transcript or notes. The agent will detect objections, intent shifts, and propose the next actions.
              </p>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={8}
                placeholder={`e.g.\nProspect: we’re just browsing… price seems high.\nAgent: we can tailor coverage.\nProspect: maybe next month; renewal in March.`}
                className="w-full rounded-lg border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-gray-900 dark:text-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={ingestContext}
                  disabled={ingesting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-gray-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50"
                >
                  {ingesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
                  Ingest
                </button>
                <button
                  onClick={runAutopilot}
                  disabled={running}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  Run Autopilot
                </button>
                {plan && (
                  <button
                    onClick={() => setPlan(null)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </button>
                )}
                {/* Demo transcript (optional) */}
                <button
                  onClick={() =>
                    setTranscript(
                      `Prospect: honestly just browsing.\nAgent: totally fine, can tailor coverage.\nProspect: price seems high.\nAgent: can show ROI and a phased plan.\nProspect: renewal in March, maybe next month.\nAgent: great, can we pencil a 15-min next week?`
                    )
                  }
                  className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200"
                >
                  Fill demo
                </button>
              </div>
            </div>

            {/* Plan / Next actions */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Next Best Actions</h2>
              {!plan ? (
                <EmptyState
                  icon={<FileText className="h-10 w-10 text-gray-400" />}
                  title="No plan yet"
                  subtitle="Ingest some context and click Run Autopilot to generate a plan."
                />
              ) : (
                <div className="space-y-4">
                  {plan.actions.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-neutral-400">No actions suggested.</p>
                  )}
                  {plan.actions.map((a, idx) => (
                    <ActionCard
                      key={idx}
                      action={a}
                      onSendSMS={() => sendSMS(a.body)}
                      onSendEmail={() => sendEmail(a.subject, a.body)}
                      onCompose={() => composeInMail(a.subject, a.body)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Message history */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timeline</h2>
              {messages.length === 0 ? (
                <EmptyState
                  icon={<MessageSquare className="h-10 w-10 text-gray-400" />}
                  title="No messages yet"
                  subtitle="Outbound and inbound messages will appear here."
                />
              ) : (
                <ul className="space-y-3">
                  {messages
                    .slice()
                    .reverse()
                    .map((m) => (
                      <li key={m.id} className="rounded-lg border border-gray-200 dark:border-neutral-800 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge color={m.direction === 'outbound' ? 'blue' : 'slate'}>{m.direction}</Badge>
                            <Badge color={m.channel === 'email' ? 'purple' : 'cyan'}>{m.channel}</Badge>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-neutral-400">
                            {new Date(m.created_at).toLocaleString()}
                          </span>
                        </div>
                        {m.subject && (
                          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{m.subject}</p>
                        )}
                        <p className="mt-1 text-sm text-gray-700 dark:text-neutral-300 whitespace-pre-wrap">{m.body}</p>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ---------- helpers & small components ---------- */

function normalizePlan(data) {
  if (!data) return { actions: [] };
  if (Array.isArray(data.actions)) return { actions: data.actions };
  if (data.plan && Array.isArray(data.plan.actions)) return { actions: data.plan.actions };
  if (data.next_action) return { actions: [data.next_action] };
  const g = [];
  if (data.sms) g.push({ type: 'sms', body: data.sms });
  if (data.email) g.push({ type: 'email', subject: data.email.subject, body: data.email.body });
  return { actions: g };
}

function ActionCard({ action, onSendSMS, onSendEmail, onCompose }) {
  const t = (action.type || '').toLowerCase();
  return (
    <div className="rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {t === 'sms' && <MessageSquare className="h-5 w-5 text-cyan-600" />}
          {t === 'email' && <Mail className="h-5 w-5 text-purple-600" />}
          {t === 'call' && <Phone className="h-5 w-5 text-emerald-600" />}
          {t === 'wait' && <Clock className="h-5 w-5 text-amber-600" />}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{titleForType(t)}</h3>
        </div>
        <Badge color="slate">{t || 'action'}</Badge>
      </div>

      {action.subject && <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{action.subject}</p>}
      {action.body && <p className="text-sm text-gray-700 dark:text-neutral-300 whitespace-pre-wrap">{action.body}</p>}
      {action.script && (
        <pre className="mt-2 text-sm bg-neutral-50 dark:bg-neutral-900/50 text-gray-800 dark:text-neutral-200 p-3 rounded">{action.script}</pre>
      )}
      {action.duration && <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">Wait duration: {action.duration}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {t === 'sms' && (
          <button onClick={onSendSMS} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700">
            <Send className="h-4 w-4" />
            Send SMS
          </button>
        )}
        {t === 'email' && (
          <>
            <button onClick={onSendEmail} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
              <Send className="h-4 w-4" />
              Send Email
            </button>
            <button onClick={onCompose} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-gray-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700">
              <Mail className="h-4 w-4" />
              Compose in Mail
            </button>
          </>
        )}
        {t === 'call' && (
          <span className="inline-flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <Check className="h-4 w-4" /> Script ready
          </span>
        )}
      </div>
    </div>
  );
}

function titleForType(t) {
  if (t === 'sms') return 'SMS Message';
  if (t === 'email') return 'Email';
  if (t === 'call') return 'Call Script';
  if (t === 'wait') return 'Wait';
  return 'Action';
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur border-b border-gray-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Autopilot — Next Best Action</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">Agentic follow-ups powered by Solisa</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="text-center py-12 border border-dashed rounded-lg border-gray-200 dark:border-neutral-800">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      {subtitle && <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="max-w-3xl mx-auto mt-10 bg-red-50 text-red-800 border border-red-200 rounded-lg p-4 whitespace-pre-wrap">
      <div className="font-semibold mb-1">Something went wrong</div>
      <div className="text-sm">{message}</div>
    </div>
  );
}

function Badge({ children, color = 'slate' }) {
  const colors = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    slate: 'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-neutral-300',
  }[color] || 'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-neutral-300';

  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors}`}>{children}</span>;
}
