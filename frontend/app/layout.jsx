// app/layout.jsx
import './globals.css';
import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';

export const metadata = {
  title: 'Solisa AI - Insurance Platform',
  description: 'AI-powered insurance lead management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 dark:bg-neutral-950 dark:text-gray-100">
        {/* Top Nav */}
        <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/70">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="text-lg">Solisa AI</span>
              <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">Beta</span>
            </Link>

            {/* Nav links */}
            <nav className="flex items-center gap-6 text-sm">
              <Link
                href="/leads"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Leads
              </Link>
              <Link
                href="/capture"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Capture
              </Link>
              <Link
                href="/retention"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Retention
              </Link>
            </nav>

            {/* Theme toggle */}
            <div className="flex items-center">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
