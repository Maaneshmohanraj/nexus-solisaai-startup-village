'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, Building2, MapPin, Briefcase, CheckCircle2, 
  Search, ExternalLink
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_BASE;

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch(`${API}/api/leads`);
        const data = await res.json();
        setLeads(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to fetch leads', e);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  const filteredLeads = leads.filter((lead) =>
    (lead.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (lead.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (lead.company || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: leads.length,
    enriched: leads.filter((l) => l.enriched === 'success').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur border-b border-gray-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Leads Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            Manage and track your enriched leads
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-400">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</p>
              </div>
              <Users className="h-12 w-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-400">Enriched</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.enriched}</p>
              </div>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-400">Success Rate</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {stats.total > 0 ? Math.round((stats.enriched / stats.total) * 100) : 0}%
                </p>
              </div>
              <Building2 className="h-12 w-12 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-neutral-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-600 dark:text-neutral-400">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No leads found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
              {searchQuery ? 'Try a different search term' : 'Get started by creating a new lead'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LeadCard({ lead }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{lead.name}</h3>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{lead.email}</p>
          </div>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              lead.enriched === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
            }`}
          >
            {lead.enriched === 'success' ? '✓ Enriched' : '⏳ Pending'}
          </span>
        </div>

        {/* Enriched fields */}
        <div className="space-y-3">
          {lead.company && (
            <div className="flex items-center text-sm">
              <Building2 className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <span className="text-gray-700 dark:text-neutral-300 font-medium">{lead.company}</span>
            </div>
          )}
          {lead.job_title && (
            <div className="flex items-center text-sm">
              <Briefcase className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <span className="text-gray-600 dark:text-neutral-400">{lead.job_title}</span>
            </div>
          )}
          {lead.location && (
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <span className="text-gray-600 dark:text-neutral-400">{lead.location}</span>
            </div>
          )}
          {lead.linkedin_url && (
            <a
              href={lead.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>View LinkedIn</span>
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-neutral-400">
            <span>{lead.company_size || 'Size unknown'}</span>
            <span className="px-2 py-1 bg-gray-100 dark:bg-neutral-800 rounded">
              {lead.industry || 'Industry unknown'}
            </span>
          </div>

          {/* Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href={`/leads/${lead.id}/personalize`}
              className="w-full text-center py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              🤖 Generate AI
            </Link>
            <Link
              href={`/leads/${lead.id}/followups`}
              className="w-full text-center py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Run Autopilot
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
