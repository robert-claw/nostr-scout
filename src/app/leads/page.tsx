'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Mail, ExternalLink, Copy, Filter, Check, Trash2, Edit, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { Lead, Project } from '@/lib/types';

const STATUS_OPTIONS = ['new', 'contacted', 'replied', 'converted', 'rejected'] as const;

export default function LeadsPage() {
  return (
    <Suspense fallback={<LeadsLoading />}>
      <LeadsContent />
    </Suspense>
  );
}

function LeadsLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function LeadsContent() {
  const searchParams = useSearchParams();
  const projectIdFilter = searchParams.get('projectId');
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>(projectIdFilter || '');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, [statusFilter, projectFilter]);

  async function loadData() {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (projectFilter) params.set('projectId', projectFilter);
      
      const [leadsRes, projectsRes] = await Promise.all([
        fetch(`/api/leads?${params}`),
        fetch('/api/projects'),
      ]);

      const leadsData = await leadsRes.json();
      const projectsData = await projectsRes.json();

      setLeads(leadsData.data || []);
      setProjects(projectsData.data || []);
    } catch (error) {
      showToast('Failed to load leads', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function updateLeadStatus(leadId: string, status: Lead['status']) {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      const data = await res.json();
      if (data.success) {
        setLeads(prev => prev.map(l => l.id === leadId ? data.data : l));
        showToast('Status updated', 'success');
      }
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  }

  async function deleteLead(leadId: string) {
    if (!confirm('Delete this lead?')) return;
    
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        setLeads(prev => prev.filter(l => l.id !== leadId));
        showToast('Lead deleted', 'success');
      }
    } catch (error) {
      showToast('Failed to delete lead', 'error');
    }
  }

  async function updateLeadNotes(leadId: string, notes: string) {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      
      const data = await res.json();
      if (data.success) {
        setLeads(prev => prev.map(l => l.id === leadId ? data.data : l));
        setEditingLead(null);
        showToast('Notes saved', 'success');
      }
    } catch (error) {
      showToast('Failed to save notes', 'error');
    }
  }

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
    showToast('Email copied', 'success');
  }

  function copyAllEmails() {
    const allEmails = [...new Set(leads.flatMap(l => l.emails))];
    navigator.clipboard.writeText(allEmails.join('\n'));
    showToast(`${allEmails.length} emails copied`, 'success');
  }

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalEmails = [...new Set(leads.flatMap(l => l.emails))].length;

  return (
    <div className="p-8">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Leads</h1>
            <p className="text-slate-400 mt-1">{leads.length} leads with {totalEmails} unique emails</p>
          </div>
          {leads.length > 0 && (
            <button
              onClick={copyAllEmails}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <Copy className="h-4 w-4" />
              Copy All Emails
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-400">Filters:</span>
        </div>
        
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {(statusFilter || projectFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setProjectFilter(''); }}
            className="text-sm text-slate-400 hover:text-white"
          >
            Clear filters
          </button>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No leads found</h2>
          <p className="text-slate-400">Run search queries to discover leads</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead, i) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-white hover:text-cyan-400 transition-colors truncate flex items-center gap-2"
                    >
                      {lead.title}
                      <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    </a>
                  </div>
                  
                  <p className="text-sm text-slate-500 truncate mb-3">{lead.url}</p>
                  
                  {lead.description && (
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">{lead.description}</p>
                  )}
                  
                  {/* Emails */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {lead.emails.map(email => (
                      <button
                        key={email}
                        onClick={() => copyEmail(email)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors group"
                      >
                        <Mail className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-slate-200">{email}</span>
                        {copiedEmail === email ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Project: {getProjectName(lead.projectId)}</span>
                    <span>Added: {new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  {/* Status dropdown */}
                  <select
                    value={lead.status}
                    onChange={e => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      lead.status === 'new' ? 'bg-cyan-500/20 text-cyan-400' :
                      lead.status === 'contacted' ? 'bg-amber-500/20 text-amber-400' :
                      lead.status === 'replied' ? 'bg-emerald-500/20 text-emerald-400' :
                      lead.status === 'converted' ? 'bg-violet-500/20 text-violet-400' :
                      'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingLead(lead)}
                      className="p-1.5 text-slate-500 hover:text-white transition-colors"
                      title="Edit notes"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete lead"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              {lead.notes && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-sm text-slate-400">{lead.notes}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Notes Modal */}
      <AnimatePresence>
        {editingLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setEditingLead(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Edit Notes</h2>
                <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-sm text-slate-400 mb-4 truncate">{editingLead.title}</p>
              
              <textarea
                defaultValue={editingLead.notes || ''}
                placeholder="Add notes about this lead..."
                rows={5}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                id="lead-notes"
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const textarea = document.getElementById('lead-notes') as HTMLTextAreaElement;
                    updateLeadNotes(editingLead.id, textarea.value);
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
