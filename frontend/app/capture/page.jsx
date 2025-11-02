'use client';

import { useState } from 'react';
import { Loader2, Mail, Check, Copy, Calendar } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8010';
const CALENDLY = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/your-handle/intro-call';

// Helper: build a neat block for the extra fields
function buildExtrasBlock({ lifeStage, insurer, renewalDate, painPoints, source, company, title, location }) {
  const lines = [];
  if (lifeStage) lines.push(`• Life stage: ${lifeStage}`);
  if (insurer) lines.push(`• Current insurer: ${insurer}`);
  if (renewalDate) lines.push(`• Renewal date: ${renewalDate}`);
  if (painPoints) lines.push(`• Pain points: ${painPoints}`);
  if (source) lines.push(`• Lead source: ${source}`);
  if (company) lines.push(`• Company: ${company}`);
  if (title) lines.push(`• Title: ${title}`);
  if (location) lines.push(`• Location: ${location}`);
  return lines.length ? `\n---\nContext we considered:\n${lines.join('\n')}` : '';
}

export default function CapturePage() {
  // Required
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Optional / extra details
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [lifeStage, setLifeStage] = useState('');     // marriage / new home / new car / etc.
  const [insurer, setInsurer] = useState('');         // current insurer
  const [renewalDate, setRenewalDate] = useState(''); // yyyy-mm-dd is fine
  const [painPoints, setPainPoints] = useState('');   // free text
  const [source, setSource] = useState('');           // ad / referral / website

  const [submitting, setSubmitting] = useState(false);
  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

  const copy = (text, which) => {
    navigator.clipboard.writeText(text || '');
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  async function runPipeline(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    setMessages(null);
    setLead(null);

    const ok = window.confirm(
      `Capture and personalize outreach for:\n\n` +
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n` +
      (company ? `Company: ${company}\n` : '') +
      (title ? `Title: ${title}\n` : '') +
      (location ? `Location: ${location}\n` : '') +
      (lifeStage ? `Life stage: ${lifeStage}\n` : '') +
      (insurer ? `Insurer: ${insurer}\n` : '') +
      (renewalDate ? `Renewal: ${renewalDate}\n` : '') +
      (source ? `Source: ${source}\n` : '') +
      (painPoints ? `Pain points: ${painPoints}\n` : '') +
      `\nProceed?`
    );
    if (!ok) return;

    try {
      setSubmitting(true);
      setStatus('Capturing lead…');

      // 1) Capture (backend only requires name/email/phone)
      const r1 = await fetch(`${API}/api/leads/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      });
      if (!r1.ok) throw new Error(`Capture failed: ${r1.status} ${await r1.text()}`);
      const leadObj = await r1.json();
      setLead(leadObj);

      // 2) Personalize (GPT)
      setStatus('Generating personalized messages…');
      const r2 = await fetch(`${API}/api/leads/${leadObj.id}/personalize`, { method: 'POST' });
      if (!r2.ok) throw new Error(`Personalization failed: ${r2.status} ${await r2.text()}`);
      const pz = await r2.json();

      // 3) Inject Calendly + Extras into the email body (client-side)
      const subj = pz?.messages?.email?.subject || 'Regarding your insurance coverage';
      let body = pz?.messages?.email?.body || 'Hello,\n\nQuick chat?\n';
      if (!body.includes(CALENDLY)) {
        body += `\n\n${CALENDLY}\n`;
      }
      const extrasBlock = buildExtrasBlock({
        lifeStage, insurer, renewalDate, painPoints, source, company, title, location,
      });
      body += extrasBlock;

      const merged = {
        ...pz,
        messages: {
          ...pz.messages,
          email: { subject: subj, body },
          // also lightly tailor SMS/LinkedIn with company/title if user supplied
          sms: (pz?.messages?.sms || '').replace('your company', company || 'your company'),
          linkedin: pz?.messages?.linkedin || '',
          context_used:
            (pz?.messages?.context_used || '') +
            (extrasBlock ? ` ${extrasBlock.replace('\n---\n', ' | ')}` : ''),
        },
      };
      setMessages(merged.messages);

      // 4) Optionally save email to outbox for audit (backend template won’t include client extras)
      setStatus('Saving email preview to outbox…');
      try {
        await fetch(`${API}/api/leads/${leadObj.id}/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regenerate: false }),
        });
      } catch {
        /* non-blocking */
      }

      setStatus('All set! You can compose the email now.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  function openMailto() {
    if (!lead || !messages?.email) return;
    const subj = messages.email.subject || 'Regarding your insurance coverage';
    const body = messages.email.body || 'Hello,\n\nQuick chat?\n';
    const href = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    window.location.href = href; // user-action triggered => avoids popup blockers
  }

  async function composeViaBackend() {
    if (!lead) return;
    setStatus('Asking backend to open Apple Mail…');
    try {
      const res = await fetch(`${API}/api/leads/${lead.id}/email/compose`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      setStatus('If backend runs on your Mac GUI session, Apple Mail should open.');
    } catch (e) {
      setError(`Compose failed: ${e.message}. Use the mailto button instead.`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Lead Capture & AI Outreach
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Enter a prospect, then we’ll enrich, personalize, and prepare a ready-to-send email (with your Calendly link).
        </p>

        {/* Form */}
        <form onSubmit={runPipeline} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          {/* Required fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full name</label>
            <input
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              placeholder="e.g., Alice Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                placeholder="e.g., alice@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (for SMS mock)</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                placeholder="+15551112222"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Optional company/profile */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                placeholder="Acme Inc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                placeholder="VP Sales"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                placeholder="Austin, TX"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Additional Details (the “extra data”) */}
          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Life stage</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                placeholder="marriage / new home / new car"
                value={lifeStage}
                onChange={(e) => setLifeStage(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current insurer</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                placeholder="e.g., State Farm"
                value={insurer}
                onChange={(e) => setInsurer(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Renewal date</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lead source</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                placeholder="website / ad / referral"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pain points</label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
                placeholder="What are they struggling with? (from reviews, social, forums)"
                value={painPoints}
                onChange={(e) => setPainPoints(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            {submitting ? 'Processing…' : 'Capture & Personalize'}
          </button>

          {status && <p className="text-sm text-gray-600 dark:text-gray-400">{status}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        {/* Preview & Actions */}
        {lead && messages && (
          <div className="mt-8 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Email Preview</h2>

              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                  <button
                    onClick={() => copy(messages.email.subject, 'subject')}
                    className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    <Copy className="h-4 w-4" /> {copied === 'subject' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium">{messages.email.subject}</p>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Body</label>
                  <button
                    onClick={() => copy(messages.email.body, 'body')}
                    className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    <Copy className="h-4 w-4" /> {copied === 'body' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="mt-1 whitespace-pre-wrap text-gray-900 dark:text-gray-100 text-sm">{messages.email.body}</pre>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  onClick={openMailto}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-3"
                  title="Opens your default email app"
                >
                  <Mail className="h-5 w-5" />
                  Compose in your Mail app
                </button>

                <a
                  href={CALENDLY}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold px-4 py-3"
                >
                  <Calendar className="h-5 w-5" />
                  Open Calendly
                </a>

                <button
                  onClick={composeViaBackend}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold px-4 py-3"
                  title="Backend tries to open Apple Mail on the server Mac"
                >
                  <Mail className="h-5 w-5" />
                  Compose via Backend (macOS)
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Tip: “Compose via Backend” opens Apple Mail only if your backend runs on a Mac with a GUI session and has Automation permissions.
              </p>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p><span className="font-semibold">Lead:</span> {lead.name} &lt;{lead.email}&gt; • {lead.phone}</p>
              {messages?.context_used && (
                <p className="mt-1"><span className="font-semibold">Context used:</span> {messages.context_used}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
