'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Search, Play, Loader2, Trash2, CheckCircle2, 
  XCircle, Clock, RefreshCw, Mail, Phone, Globe, MessageCircle,
  Instagram, Github, Twitter, Linkedin, Send, MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import type { Project, Query, Lead, SearchTarget, SearchSource } from '@/lib/types';
import { ALL_TARGETS, TARGET_CONFIG } from '@/lib/types';

const SEARCH_SOURCES: { id: SearchSource; name: string; description: string }[] = [
  { id: 'brave', name: 'Brave Search', description: 'Web search + page crawling' },
  { id: 'perplexity', name: 'Perplexity AI', description: 'AI-powered research' },
  { id: 'all', name: 'All Sources', description: 'Search everywhere' },
];

const TARGET_ICONS: Record<SearchTarget, React.ReactNode> = {
  emails: <Mail className="h-4 w-4" />,
  phones: <Phone className="h-4 w-4" />,
  websites: <Globe className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  github: <Github className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
  telegram: <Send className="h-4 w-4" />,
  discord: <MessageSquare className="h-4 w-4" />,
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [queries, setQueries] = useState<Query[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newSearch, setNewSearch] = useState('');
  const [improvedQuery, setImprovedQuery] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<SearchTarget[]>(['emails']);
  const [selectedSources, setSelectedSources] = useState<SearchSource[]>(['all']);
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

  function toggleTarget(target: SearchTarget) {
    setSelectedTargets(prev => 
      prev.includes(target) 
        ? prev.filter(t => t !== target)
        : [...prev, target]
    );
  }

  function toggleSource(source: SearchSource) {
    if (source === 'all') {
      setSelectedSources(['all']);
    } else {
      setSelectedSources(prev => {
        const filtered = prev.filter(s => s !== 'all');
        if (filtered.includes(source)) {
          return filtered.filter(s => s !== source);
        }
        return [...filtered, source];
      });
    }
  }

  async function handleImproveQuery() {
    if (!newSearch.trim()) return;
    setImproving(true);
    try {
      const res = await fetch('/api/queries/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: newSearch,
          projectId: id,
          targets: selectedTargets,
        }),
      });
      const data = await res.json();
      if (data.success && data.data.improved !== newSearch) {
        setImprovedQuery(data.data.improved);
        showToast('Query improved', 'success');
      } else {
        showToast('Query looks good as is', 'info');
      }
    } catch {
      showToast('Failed to improve query', 'error');
    } finally {
      setImproving(false);
    }
  }

  async function createQuery() {
    if (!newSearch.trim() || selectedTargets.length === 0 || selectedSources.length === 0) return;
    
    setCreating(true);
    try {
      const res = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: id, 
          searchTerm: newSearch,
          improvedQuery: improvedQuery || undefined,
          targets: selectedTargets,
          sources: selectedSources,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setQueries(prev => [...prev, data.data]);
        setShowModal(false);
        setNewSearch('');
        setImprovedQuery(null);
        setSelectedTargets(['emails']);
        setSelectedSources(['all']);
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
        setQueries(prev => prev.map(q => q.id === queryId ? data.data.query : q));
        const leadsRes = await fetch(`/api/leads?projectId=${id}`);
        const leadsData = await leadsRes.json();
        setLeads(leadsData.data || []);
        showToast(`Found ${data.data.leadsCreated} leads with contact info`, 'success');
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

  // Count total contacts
  const countContacts = (lead: Lead) => {
    return (lead.emails?.length || 0) + (lead.phones?.length || 0) + 
           (lead.whatsapp?.length || 0) + (lead.instagram?.length || 0) +
           (lead.github?.length || 0) + (lead.twitter?.length || 0) +
           (lead.linkedin?.length || 0) + (lead.telegram?.length || 0) +
           (lead.discord?.length || 0) + (lead.websites?.length || 0);
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
                        {query.targets && (
                          <span className="flex items-center gap-1">
                            Looking for: {query.targets.map(t => TARGET_CONFIG[t]?.label || t).join(', ')}
                          </span>
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
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Contacts</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 10).map(lead => (
                  <tr key={lead.id} className="border-b border-slate-800 last:border-0">
                    <td className="p-4">
                      <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-cyan-400 transition-colors">
                        {lead.title.length > 50 ? lead.title.slice(0, 50) + '...' : lead.title}
                      </a>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {lead.emails?.length > 0 && (
                          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {lead.emails.length}
                          </span>
                        )}
                        {lead.phones?.length > 0 && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {lead.phones.length}
                          </span>
                        )}
                        {lead.whatsapp?.length > 0 && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" /> {lead.whatsapp.length}
                          </span>
                        )}
                        {lead.instagram?.length > 0 && (
                          <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-1 rounded flex items-center gap-1">
                            <Instagram className="h-3 w-3" /> {lead.instagram.length}
                          </span>
                        )}
                        {lead.github?.length > 0 && (
                          <span className="text-xs bg-slate-500/20 text-slate-300 px-2 py-1 rounded flex items-center gap-1">
                            <Github className="h-3 w-3" /> {lead.github.length}
                          </span>
                        )}
                        {countContacts(lead) === 0 && (
                          <span className="text-xs text-slate-500">No contacts</span>
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
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-white mb-4">Add Search Query</h2>
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Search Term</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSearch}
                      onChange={e => { setNewSearch(e.target.value); setImprovedQuery(null); }}
                      placeholder='e.g. "AI startup" founders contact'
                      className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleImproveQuery}
                      disabled={!newSearch.trim() || improving}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                      title="Improve query with AI"
                    >
                      {improving ? <Loader2 className="h-4 w-4 animate-spin" /> : '✨'}
                      Improve
                    </button>
                  </div>
                  {improvedQuery && (
                    <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-purple-400 mb-1">Improved query:</p>
                          <p className="text-sm text-white">{improvedQuery}</p>
                        </div>
                        <button
                          onClick={() => { setNewSearch(improvedQuery); setImprovedQuery(null); }}
                          className="text-xs text-purple-400 hover:text-purple-300 whitespace-nowrap"
                        >
                          Use this
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Tip: Click &ldquo;Improve&rdquo; to enhance your query with AI
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Search Sources</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SEARCH_SOURCES.map(source => {
                      const isSelected = selectedSources.includes(source.id);
                      return (
                        <button
                          key={source.id}
                          onClick={() => toggleSource(source.id)}
                          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isSelected
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <span className="font-medium">{source.name}</span>
                          <span className="text-xs opacity-70">{source.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">What to Look For</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_TARGETS.map(target => {
                      const config = TARGET_CONFIG[target];
                      const isSelected = selectedTargets.includes(target);
                      return (
                        <button
                          key={target}
                          onClick={() => toggleTarget(target)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isSelected
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          {TARGET_ICONS[target]}
                          <span>{config.label}</span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createQuery}
                  disabled={!newSearch.trim() || selectedTargets.length === 0 || selectedSources.length === 0 || creating}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Query
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
