'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Baby, Home, Car, Briefcase, CalendarDays, Gift, TrendingUp,
  Mail, MessageSquare, Copy, Check, Wand2, ShieldCheck
} from 'lucide-react';

const CALENDLY = process.env.NEXT_PUBLIC_CALENDLY_URL || '';

const PRESETS = {
  new_baby: {
    label: '👶 New Baby',
    blurb: 'Congratulate and suggest umbrella + life adjustments.',
    scoreDelta: +12,
    propose: 'Add $1M umbrella + update dependents',
  },
  home_reno: {
    label: '🏗️ Home Renovation',
    blurb: 'Recommend dwelling limit / scheduled property updates.',
    scoreDelta: -8,
    propose: 'Increase dwelling coverage; schedule high-value items',
  },
  teen_driver: {
    label: '🚗 Teen Driver',
    blurb: 'Coach on telematics + safe-driver discounts.',
    scoreDelta: -15,
    propose: 'Add teen driver + enroll in telematics to save',
  },
  job_change: {
    label: '💼 Job Change',
    blurb: 'Review benefits overlap; adjust coverage + discounts.',
    scoreDelta: -5,
    propose: 'Rebalance coverages; check employer benefits',
  },
  anniversary: {
    label: '📅 Policy Anniversary',
    blurb: 'Delight + renew with perk/discount.',
    scoreDelta: +6,
    propose: 'Renewal perk: $50 off next bill',
  },
  birthday: {
    label: '🎂 Birthday',
    blurb: 'Warm touch with a small gift.',
    scoreDelta: +4,
    propose: 'Gift: free roadside assist this month',
  },
  low_mileage: {
    label: '📉 Low Mileage',
    blurb: 'Upsell pay-per-mile to save $$$.',
    scoreDelta: +9,
    propose: 'Switch to pay-per-mile, save ~$340/yr',
  },
};

const DEMO_CUSTOMER = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  phone: '+15550000000',
  policies: ['Auto', 'Home'],
  location: 'Austin, TX',
  currentCarrier: 'Solisa',
};

export default function RetentionDemo() {
  const [customer, setCustomer] = useState(DEMO_CUSTOMER);
  const [eventKey, setEventKey] = useState('new_baby');
  const [healthScore, setHealthScore] = useState(72);
  const [copied, setCopied] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [running, setRunning] = useState(false);

  const preset = PRESETS[eventKey];

  // Derived, “agent-y” suggestions (client-only)
  const suggestedScore = useMemo(() => {
    // Clamp 0..100
    const next = Math.max(0, Math.min(100, healthScore + (preset?.scoreDelta || 0)));
    return next;
  }, [healthScore, preset]);

  const smsText = useMemo(() => {
    const first = (customer.name || 'there').split(' ')[0];
    let line = `Hi ${first}! Congrats on the news 🎉`;
    if (eventKey === 'new_baby') {
      line += ` — quick win: add umbrella + update dependents.`;
    } else if (eventKey === 'home_reno') {
      line += ` — let’s bump dwelling coverage + schedule new valuables.`;
    } else if (eventKey === 'teen_driver') {
      line += ` — we can add your teen + enroll telematics to lower rates.`;
    } else if (eventKey === 'job_change') {
      line += ` — let’s rebalance coverage and check new benefits overlap.`;
    } else if (eventKey === 'anniversary') {
      line += ` — thanks for ${customer.currentCarrier || 'Solisa'} loyalty! Perk inside.`;
    } else if (eventKey === 'birthday') {
      line += ` — 🎁 gift inside: free roadside assist this month.`;
    } else if (eventKey === 'low_mileage') {
      line += ` — driving less? Pay-per-mile could save you ~$340/yr.`;
    }
    if (CALENDLY) line += `\n\nBook: ${CALENDLY}`;
    return line;
  }, [customer, eventKey]);

  const emailObj = useMemo(() => {
    const first = (customer.name || 'there').split(' ')[0];
    const subjByEvent = {
      new_baby: `Congrats, ${first}! Quick coverage win`,
      home_reno: `Your renovation → quick coverage tune-up`,
      teen_driver: `Adding a teen driver (and keeping costs sane)`,
      job_change: `Job change? Fast benefits & coverage check`,
      anniversary: `2 years with ${customer.currentCarrier || 'Solisa'} — perk inside`,
      birthday: `Happy Birthday, ${first}! 🎁`,
      low_mileage: `You drive less — want to save more?`,
    };
    const subject = subjByEvent[eventKey] || `Quick coverage improvement`;

    const benefitLine =
      eventKey === 'new_baby'
        ? `We’ll add a $1M umbrella, update dependents, and ensure life cover matches your new milestone.`
        : eventKey === 'home_reno'
        ? `We’ll update dwelling limits and schedule new high-value items so every upgrade is protected.`
        : eventKey === 'teen_driver'
        ? `We’ll add your teen and enable telematics + safe-driver discounts to soften the premium jump.`
        : eventKey === 'job_change'
        ? `We’ll rebalance coverages, check employer benefits overlap, and keep you fully protected.`
        : eventKey === 'anniversary'
        ? `Thanks for being with ${customer.currentCarrier || 'Solisa'} — enjoy $50 off your next bill.`
        : eventKey === 'birthday'
        ? `As a small thank-you, enjoy free roadside assistance this month—on us.`
        : `Based on your low mileage, pay-per-mile could save you about $340/yr.`;

    const cta = CALENDLY
      ? `\n\nBook a quick tune-up:\n${CALENDLY}`
      : `\n\nReply to this email and I’ll set everything up in a few minutes.`;

    const signature = `\n\nBest,\nMaanesh\nSolisa AI\n`;

    const body = `Hi ${first},\n\n` +
      `Catching a quick moment to keep your coverage perfectly matched to your life right now. ${benefitLine}\n` +
      `\n${preset?.propose ? `Recommended next step: ${preset.propose}.` : ''}` +
      `${cta}${signature}`;

    return { subject, body };
  }, [customer, eventKey, preset]);

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    } catch { /* ignore */ }
  };

  const runAutopilot = () => {
    if (running) return;
    setTimeline([]);
    setRunning(true);
    const steps = [
      `Detect event: ${preset?.label}`,
      `Update Policy Health Score → ${suggestedScore}`,
      `Decide upsell: ${preset?.propose}`,
      `Queue SMS (1st touch)`,
      `Queue Email (with booking link)`,
      `Await reply → escalate if objection`,
    ];
    let i = 0;
    const tick = () => {
      setTimeline((prev) => [...prev, steps[i]]);
      i += 1;
      if (i < steps.length) {
        setTimeout(tick, 600);
      } else {
        setRunning(false);
      }
    };
    tick();
  };

  const oneClickDemo = () => {
    setCustomer(DEMO_CUSTOMER);
    setEventKey('new_baby');
    setHealthScore(72);
    setTimeline([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Lifeline Retention Agent — Phase 3 (Preview)
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Frontend-only demo: inject a life event → see proactive touchpoints (SMS + Email) with booking.
            </p>
          </div>
          <button
            onClick={oneClickDemo}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Wand2 className="h-4 w-4" />
            One-click Demo
          </button>
        </header>

        {/* Control Panel */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Customer</h3>
            <div className="space-y-3">
              <Input label="Name" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} />
              <Input label="Email" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} />
              <Input label="Phone" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} />
              <Input label="Location" value={customer.location} onChange={(v) => setCustomer({ ...customer, location: v })} />
              <Input label="Policies (comma)" value={customer.policies.join(', ')}
                     onChange={(v) => setCustomer({ ...customer, policies: v.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Policy Health Score</label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="range" min={0} max={100} value={healthScore}
                  onChange={(e) => setHealthScore(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300 w-10 text-right">
                  {healthScore}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Suggested after event: <span className="font-medium">{suggestedScore}</span></p>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Life / Occasion Event</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(PRESETS).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setEventKey(key)}
                  className={`border rounded-lg p-3 text-left hover:border-blue-500 ${
                    eventKey === key
                      ? 'border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900/40'
                      : 'border-gray-200 dark:border-neutral-800'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white">{cfg.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{cfg.blurb}</div>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <button
                onClick={runAutopilot}
                disabled={running}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" />
                {running ? 'Autopilot running…' : 'Run Autopilot'}
              </button>
              <ul className="mt-3 space-y-2">
                {timeline.map((t, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Output */}
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Generated Outreach</h3>

            <section className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">SMS</span>
                </div>
                <CopyBtn onCopy={() => copy(smsText, 'sms')} copied={copied === 'sms'} />
              </div>
              <pre className="mt-2 text-sm bg-gray-50 dark:bg-neutral-950/60 border border-gray-200 dark:border-neutral-800 rounded-lg p-3 whitespace-pre-wrap">
{smsText}
              </pre>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">Email</span>
                </div>
                <CopyBtn onCopy={() => copy(`Subject: ${emailObj.subject}\n\n${emailObj.body}`, 'email')}
                         copied={copied === 'email'} />
              </div>
              <div className="mt-2">
                <div className="text-xs uppercase tracking-wide text-gray-500">Subject</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{emailObj.subject}</div>
              </div>
              <pre className="mt-2 text-sm bg-gray-50 dark:bg-neutral-950/60 border border-gray-200 dark:border-neutral-800 rounded-lg p-3 whitespace-pre-wrap">
{emailObj.body}
              </pre>
              {CALENDLY ? (
                <p className="mt-2 text-xs text-gray-500">Includes booking link: <span className="underline">{CALENDLY}</span></p>
              ) : (
                <p className="mt-2 text-xs text-amber-600">Tip: set <code>NEXT_PUBLIC_CALENDLY_URL</code> in <code>.env.local</code> for a live booking link.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function CopyBtn({ onCopy, copied }) {
  return (
    <button
      onClick={onCopy}
      className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded border border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
