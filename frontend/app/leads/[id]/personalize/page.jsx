'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check, Loader2, Mail } from 'lucide-react';
import EmailPreviewModal from '../../../components/EmailPreviewModal';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8010';
const CALENDLY = process.env.NEXT_PUBLIC_CALENDLY_URL;

export default function PersonalizePage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id;

  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  async function fetchLead() {
    try {
      const res = await fetch(`${API}/api/leads/${leadId}`);
      const data = await res.json();
      setLead(data);
    } catch (e) {
      console.error('Error fetching lead:', e);
    }
  }

  async function generateMessages() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/leads/${leadId}/personalize`, { method: 'POST' });
      const data = await res.json();
      setMessages(data.messages);
    } catch (e) {
      console.error('Error generating messages:', e);
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  async function sendEmailNow() {
    // Uses backend console transport; shows a JSON ok with eml path
    const res = await fetch(`${API}/api/leads/${leadId}/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regenerate: false }),
    });
    if (!res.ok) {
      const err = await res.text();
      alert(`Email send failed: ${err}`);
      return;
    }
    const data = await res.json();
    alert(`Email sent (console transport).\nSubject: ${data.subject}\nTo: ${data.to}`);
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Leads
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            AI Personalization
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Generate personalized messages for <span className="font-semibold">{lead.name}</span>
          </p>
          {lead.company && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>🏢 {lead.company}</span>
              {lead.job_title && <span>• {lead.job_title}</span>}
              {lead.location && <span>• 📍 {lead.location}</span>}
            </div>
          )}
        </div>

        {!messages ? (
          <button
            onClick={generateMessages}
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating with GPT-4…
              </>
            ) : (
              <>🤖 Generate Personalized Messages</>
            )}
          </button>
        ) : (
          <div className="space-y-6">
            {/* SMS */}
            <MessageCard
              title="📱 SMS Message"
              content={messages.sms}
              copied={copied === 'sms'}
              onCopy={() => copyToClipboard(messages.sms, 'sms')}
            />

            {/* Email */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  📧 Email
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(`Subject: ${messages.email.subject}\n\n${messages.email.body}`, 'email')}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    {copied === 'email' ? <><Check className="h-4 w-4" />Copied</> : <> <Copy className="h-4 w-4" /> Copy </>}
                  </button>
                  <button
                    onClick={() => setShowEmailPreview(true)}
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    <Mail className="h-4 w-4" />
                    Preview & Book
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">Subject:</label>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{messages.email.subject}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">Body:</label>
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{messages.email.body}</p>
                </div>
              </div>
            </div>

            {/* LinkedIn */}
            <MessageCard
              title="💼 LinkedIn Connection Request"
              content={messages.linkedin}
              copied={copied === 'linkedin'}
              onCopy={() => copyToClipboard(messages.linkedin, 'linkedin')}
            />

            <button
              onClick={generateMessages}
              disabled={loading}
              className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              🔄 Generate New Messages
            </button>
          </div>
        )}
      </div>

      {/* The modal that "pops" the email + Calendly */}
      <EmailPreviewModal
        open={showEmailPreview}
        onClose={() => setShowEmailPreview(false)}
        lead={lead}
        email={messages?.email}
        calendlyUrl={CALENDLY}
        onSend={sendEmailNow}
      />
    </div>
  );
}

function MessageCard({ title, content, copied, onCopy }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onCopy} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
          {copied ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy</>}
        </button>
      </div>
      <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{content}</p>
    </div>
  );
}
