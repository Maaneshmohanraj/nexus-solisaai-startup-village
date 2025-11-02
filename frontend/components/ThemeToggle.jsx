'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-700
                 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800"
      aria-label="Toggle theme"
    >
      {dark ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
