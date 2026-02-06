'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Search, Play, Loader2, Trash2, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import type { Project, Query, Lead } from '@/lib/types';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [queries, setQueries] = useState<Query[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newSearch, setNewSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [runningQuery, setRunningQuery] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [projectRes, queriesRes, leadsRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/queries?projectId=${id}`),
        fetch(`/api/leads?projectId=${id}`),
      ]);

      const projectData = await projectRes.json();
      const queriesData = await queriesRes.json();
      const leadsData = await leadsRes.json();

      if (projectData.success) setProject(projectData.data);
      setQueries(queriesData.data || []);
      setLeads(leadsData.data || []);
    } catch (error) {
      showToast('Failed to load project', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function createQuery() {
    if (!newSearch.trim()) return;
    
    setCreating(true);
    try {
      const res = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, searchTerm: newSearch }),
      });
      
      const data = await res.json();
      if (data.success) {
        setQueries(prev => [...prev, data.data]);
        setShowModal(false);
        setNewSearch('');
        showToast('Query created', 'success');
      } else {
        showToast(data.error || 'Failed to create query', 'error');
      }
    } catch (error) {
      showToast('Failed to create query', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function runQuery(queryId: string) {
    setRunningQuery(queryId);
    try {
      const res = await fetch(`/api/queries/${queryId}/run`, { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        // Update query in list
        setQueries(prev => prev.map(q => q.id === queryId ? data.data.query : q));
        // Reload leads
        const leadsRes = await fetch(`/api/leads?projectId=${id}`);
        const leadsData = await leadsRes.json();
        setLeads(leadsData.data || []);
        showToast(`Found ${data.data.leadsCreated} leads with emails`, 'success');
      } else {
        showToast(data.error || 'Search failed', 'error');
      }
    } catch (error) {
      showToast('Search failed', 'error');
    } finally {
      setRunningQuery(null);
    }
  }

  async function deleteQuery(queryId: string) {
    if (!confirm('Delete this query?')) return;
    
    try {
      const res = await fetch(`/api/queries/${queryId}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        setQueries(prev => prev.filter(q => q.id !== queryId));
        showToast('Query deleted', 'success');
      } else {
        showToast(data.error || 'Failed to delete query', 'error');
      }
    } catch (error) {
      showToast('Failed to delete query', 'error');
    }
  }

  const getStatusIcon = (status: Query['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-400" />;
      case 'running': return <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-white mb-2">Project not found</h2>
          <Link href="/projects" className="text-cyan-400 hover:text-cyan-300">
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <Link href="/projects" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{project.name}</h1>
            {project.description && <p className="text-slate-400 mt-1">{project.description}</p>}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>{queries.length} queries</span>
            <span>{leads.length} leads</span>
          </div>
        </div>
      </header>

      {/* Queries Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Search Queries</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Query
          </button>
        </div>

        {queries.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <Search className="h-12 w-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No queries yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
            >
              Add your first search query
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {queries.map(query => (
              <motion.div
                key={query.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(query.status)}
                    <div>
                      <p className="text-white font-medium">{query.searchTerm}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                        <span>{query.resultCount} results</span>
                        {query.lastRun && (
                          <span>Last run: {new Date(query.lastRun).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => runQuery(query.id)}
                      disabled={runningQuery === query.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                    >
                      {runningQuery === query.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : query.lastRun ? (
                        <RefreshCw className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {runningQuery === query.id ? 'Running...' : query.lastRun ? 'Re-run' : 'Run'}
                    </button>
                    <button
                      onClick={() => deleteQuery(query.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Leads Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Leads</h2>
          {leads.length > 0 && (
            <Link href={`/leads?projectId=${id}`} className="text-sm text-cyan-400 hover:text-cyan-300">
              View all
            </Link>
          )}
        </div>

        {leads.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-400">No leads discovered yet</p>
            <p className="text-sm text-slate-500 mt-1">Run a query to find leads</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Title</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Emails</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 10).map(lead => (
                  <tr key={lead.id} className="border-b border-slate-800 last:border-0">
                    <td className="p-4">
                      <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-cyan-400 transition-colors">
                        {lead.title.length > 60 ? lead.title.slice(0, 60) + '...' : lead.title}
                      </a>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {lead.emails.slice(0, 2).map(email => (
                          <span key={email} className="text-xs bg-slate-800 text-cyan-400 px-2 py-1 rounded">
                            {email}
                          </span>
                        ))}
                        {lead.emails.length > 2 && (
                          <span className="text-xs text-slate-500">+{lead.emails.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        lead.status === 'new' ? 'bg-cyan-500/20 text-cyan-400' :
                        lead.status === 'contacted' ? 'bg-amber-500/20 text-amber-400' :
                        lead.status === 'replied' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create Query Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-white mb-4">Add Search Query</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Search Term</label>
                <input
                  type="text"
                  value={newSearch}
                  onChange={e => setNewSearch(e.target.value)}
                  placeholder='e.g. "nostr relay" contact email'
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && createQuery()}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Tip: Include terms like &ldquo;contact&rdquo;, &ldquo;email&rdquo;, or &ldquo;@&rdquo; to find pages with email addresses
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createQuery}
                  disabled={!newSearch.trim() || creating}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
