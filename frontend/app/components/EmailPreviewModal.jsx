'use client';

import { useState } from 'react';
import { Copy, Check, X, Mail } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_BASE;

export default function EmailPreviewModal({
  open,
  onClose,
  leadId,
  to,
  subject,
  body,
}) {
  const [copied, setCopied] = useState(null);
  if (!open) return null;

  const mailtoHref = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject || ''
  )}&body=${encodeURIComponent(body || '')}`;

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const composeViaBackend = async () => {
    try {
      const res = await fetch(`${API}/api/leads/${leadId}/email/compose`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      // Nothing else required; backend triggers Apple Mail (macOS) if supported.
      // You can optionally surface a toast here with `data`.
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Email Preview</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            <div><span className="font-medium">To:</span> {to || '—'}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-medium">Subject:</span>
              <span className="truncate">{subject || '—'}</span>
              <button
                onClick={() => copy(subject || '', 'subject')}
                className="ml-auto text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {copied === 'subject' ? (
                  <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> Copied</span>
                ) : (
                  <span className="inline-flex items-center gap-1"><Copy className="h-3 w-3" /> Copy</span>
                )}
              </button>
            </div>
          </div>

          <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            <div className="px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-800">
              Body
            </div>
            <pre className="whitespace-pre-wrap p-4 text-sm">
{body || '—'}
            </pre>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copy(body || '', 'body')}
              className="text-sm px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {copied === 'body' ? (
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4" /> Body copied</span>
              ) : (
                <span className="inline-flex items-center gap-2"><Copy className="h-4 w-4" /> Copy body</span>
              )}
            </button>

            <a
              href={mailtoHref}
              className="text-sm px-3 py-2 rounded border border-blue-600 text-white bg-blue-600 hover:bg-blue-700"
            >
              Open in Mail
            </a>

            {leadId && (
              <button
                onClick={composeViaBackend}
                className="text-sm px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Compose via Backend (macOS)
              </button>
            )}

            <button
              onClick={onClose}
              className="ml-auto text-sm px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

