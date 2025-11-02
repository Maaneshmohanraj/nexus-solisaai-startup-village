'use client';

export default function EmailPreviewModal({
  open,
  onClose,
  subject = '',
  body = '',
  calendly,
  onCompose, // optional callback to trigger backend /email/compose
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Card */}
      <div className="relative z-10 w-[min(90vw,800px)] rounded-xl border border-gray-200 dark:border-gray-700
                      bg-white dark:bg-neutral-900 shadow-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Preview</h3>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm border border-gray-300 dark:border-gray-700"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subject</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{subject || '(no subject)'}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Body</div>
            <pre className="whitespace-pre-wrap text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-neutral-800
                             p-3 rounded-md max-h-[45vh] overflow-auto">
{body || '(empty)'}
            </pre>
          </div>

          {calendly && (
            <div className="text-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Booking Link</div>
              <a
                href={calendly}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                {calendly}
              </a>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          {onCompose && (
            <button
              onClick={onCompose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              ✉️ Compose in Mail
            </button>
          )}
          <button
            onClick={() => {
              const full = `Subject: ${subject}\n\n${body}`;
              navigator.clipboard.writeText(full);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
