'use client';

import {useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {
  ArrowLeft, Loader2, Copy, Check, Mail, MessageSquare, ClipboardList
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_BASE;

export default function FollowupsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [lead, setLead] = useState(null);
  const [thread, setThread] = useState([]);
  const [context, setContext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState('');

  // load lead + recent thread
  useEffect(() => {
    const go = async () => {
      try {
        const l = await fetch(`${API}/api/leads/${id}`).then(r => r.json());
        setLead(l);
        const t = await fetch(`${API}/api/leads/${id}/messages`).then(r => r.json());
        setThread(Array.isArray(t) ? t : []);
      } catch (e) {
        setError('Failed to load lead or messages');
      }
    };
    go();
  }, [id]);

  const copy = (text, tag) => {
    navigator.clipboard.writeText(text || '');
    setCopied(tag);
    setTimeout(() => setCopied(''), 1500);
  };

  const ingestContext = async () => {
    setBusy(true); setError(null); setMsg(null);
    try {
      const r = await fetch(`${API}/api/leads/${id}/followups/ingest`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ text: context })
      });
      if (!r.ok) throw new Error(await r.text());
      setMsg('Autopilot ready — context ingested.');
      // also show the note inside the thread
      const t = await fetch(`${API}/api/leads/${id}/messages`).then(r => r.json());
      setThread(Array.isArray(t) ? t : []);
    } catch (e) {
      setError(`Ingest failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const runAutopilot = async () => {
    setBusy(true); setError(null); setMsg(null);
    try {
      // either path works; you now have an alias on the backend
      const r = await fetch(`${API}/api/leads/${id}/followups/run`, { method: 'POST' });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      const data = await r.json();
      setResult(data);
      // refresh thread so the two “draft” messages appear
      const t = await fetch(`${API}/api/leads/${id}/messages`).then(r => r.json());
      setThread(Array.isArray(t) ? t : []);
      setMsg('✅ Autopilot planned next-best actions.');
    } catch (e) {
      setError(`Autopilot failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const composeEmail = async () => {
    try {
      const r = await fetch(`${API}/api/leads/${id}/email/compose`, { method: 'POST' });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setMsg(`Email saved: ${j.compose_path}`);
    } catch (e) {
      setError(`Compose failed: ${e.message}`);
    }
  };

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Autopilot — Next Best Action
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Agentic follow-ups powered by Solisa
        </p>

        {/* Alerts */}
        {msg && (
          <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 text-green-800 dark:text-green-200">
            {msg}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Context + actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Ingest context (calls, texts, CRM notes)</h3>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={8}
              placeholder={`prospect: i'm just browsing… also price is high.\nagent: we can tailor.\nprospect: maybe next month.\nrenewal in march; prefers tue after 2pm`}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm"
            />
            <div className="mt-3 flex gap-3">
              <button
                onClick={ingestContext}
                disabled={busy || !context.trim()}
                className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
              >
                {busy ? 'Working…' : 'Ingest Context'}
              </button>
              <button
                onClick={runAutopilot}
                disabled={busy}
                className="px-4 py-2 rounded-md bg-purple-600 text-white disabled:opacity-50"
              >
                {busy ? 'Planning…' : 'Run Autopilot'}
              </button>
            </div>
          </div>

          {/* Recent thread */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Recent thread</h3>
            <div className="space-y-3 max-h-64 overflow-auto">
              {thread.length === 0 && (
                <p className="text-sm text-gray-500">No messages yet.</p>
              )}
              {thread.map(m => (
                <div key={m.id} className="text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    {m.direction === 'inbound' ? <MessageSquare className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                    <span className="font-medium">{m.direction}</span>
                    <span>• {m.channel}</span>
                    <span>• {new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  {m.subject && <div className="text-gray-700 dark:text-gray-200 font-medium">Subject: {m.subject}</div>}
                  <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-100">{m.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Autopilot result */}
        {result && (
          <div className="mt-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Reasoning</h3>
              <p className="text-gray-700 dark:text-gray-200">{result.reasoning}</p>
              <div className="mt-2 text-xs text-gray-500">Intent: {result.state?.intent} • Objections: {(result.state?.objections || []).join(', ') || '—'}</div>
            </div>

            {/* SMS */}
            {result.plan.find(p => p.action === 'sms') && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" /> SMS draft
                  </h4>
                  <button
                    onClick={() => copy(result.plan.find(p => p.action === 'sms')?.body || '', 'sms')}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {copied === 'sms' ? <span className="inline-flex items-center gap-1"><Check className="h-4 w-4" /> Copied</span> : <span className="inline-flex items-center gap-1"><Copy className="h-4 w-4" /> Copy</span>}
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-100">
                  {result.plan.find(p => p.action === 'sms')?.body}
                </p>
              </div>
            )}

            {/* Email */}
            {result.plan.find(p => p.action === 'email') && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Mail className="h-5 w-5" /> Email draft
                  </h4>
                  <div className="flex gap-3">
                    <button
                      onClick={() => copy(
                        `Subject: ${result.plan.find(p => p.action === 'email')?.subject}\n\n${result.plan.find(p => p.action === 'email')?.body}`,
                        'email'
                      )}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {copied === 'email' ? <span className="inline-flex items-center gap-1"><Check className="h-4 w-4" /> Copied</span> : <span className="inline-flex items-center gap-1"><Copy className="h-4 w-4" /> Copy</span>}
                    </button>
                    <button
                      onClick={composeEmail}
                      className="text-sm text-purple-600 hover:underline"
                    >
                      Compose in Mail (.eml)
                    </button>
                  </div>
                </div>
                <div className="text-gray-700 dark:text-gray-200 font-medium">
                  Subject: {result.plan.find(p => p.action === 'email')?.subject}
                </div>
                <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-100 mt-2">
                  {result.plan.find(p => p.action === 'email')?.body}
                </p>
              </div>
            )}

            {/* Tasks */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                <ClipboardList className="h-5 w-5" /> Tasks
              </h4>
              <ul className="list-disc ml-5 space-y-2 text-gray-800 dark:text-gray-100">
                {result.plan.filter(p => p.action === 'task').map((p, idx) => (
                  <li key={idx}>
                    {p.body} <span className="text-xs text-gray-500">({p.when})</span>
                  </li>
                ))}
                {result.plan.filter(p => p.action === 'task').length === 0 && (
                  <li className="text-gray-500">No tasks.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
