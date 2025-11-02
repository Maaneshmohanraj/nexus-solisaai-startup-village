'use client';

import { useRouter } from 'next/navigation';
import { Users, Zap, TrendingUp } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            🎯 Solisa AI Platform
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            AI-Powered Insurance Lead Management
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-12">
            Automatically enrich leads with company data, job titles, and more.
            Built with FastAPI, Next.js, and Clay.com.
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/leads')}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              View Leads Dashboard
            </button>
            <button
              onClick={() => window.open('http://localhost:8010/docs', '_blank')}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg border-2 border-blue-600"
            >
              API Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
