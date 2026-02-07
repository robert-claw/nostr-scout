'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Mail, ExternalLink, Copy, Filter, Check, Trash2, Edit, X, Search,
  Phone, Globe, MessageCircle, Instagram, Github, Twitter, Linkedin, Send, MessageSquare,
  ChevronUp, ChevronDown, Sparkles, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { Lead, Project } from '@/lib/types';

const STATUS_OPTIONS = ['new', 'contacted', 'replied', 'converted', 'rejected'] as const;
type SortField = 'title' | 'status' | 'createdAt' | 'emails' | 'quality';
type SortDir = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

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

// Contact badge for the detail modal
function ContactBadge({ 
  icon: Icon, 
  items, 
  color, 
  prefix = '',
  onCopy 
}: { 
  icon: React.ElementType
  items: string[]
  color: string
  prefix?: string
  onCopy: (item: string) => void
}) {
  if (!items?.length) return null;
  
  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <button
          key={item}
          onClick={() => onCopy(prefix + item)}
          className={`flex items-center gap-2 px-3 py-2 ${color} rounded-lg text-sm transition-colors group w-full text-left`}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate flex-1">{prefix ? prefix + item : item}</span>
          <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

function LeadsContent() {
  const searchParams = useSearchParams();
  const projectIdFilter = searchParams.get('projectId');
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>(projectIdFilter || '');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [enrichingLead, setEnrichingLead] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { showToast } = useToast();

  // Sync project filter with URL
  useEffect(() => {
    if (projectIdFilter) {
      setProjectFilter(projectIdFilter);
    }
  }, [projectIdFilter]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [leadsRes, projectsRes] = await Promise.all([
        fetch('/api/leads'),
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

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.title.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.emails?.some(e => e.toLowerCase().includes(q)) ||
        l.notes?.toLowerCase().includes(q)
      );
    }
    
    // Status filter
    if (statusFilter) {
      result = result.filter(l => l.status === statusFilter);
    }
    
    // Project filter
    if (projectFilter) {
      result = result.filter(l => l.projectId === projectFilter);
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      
      switch (sortField) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'emails':
          aVal = a.emails?.length || 0;
          bVal = b.emails?.length || 0;
          break;
        case 'quality':
          aVal = a.quality === 'high' ? 3 : a.quality === 'medium' ? 2 : 1;
          bVal = b.quality === 'high' ? 3 : b.quality === 'medium' ? 2 : 1;
          break;
      }
      
      if (sortDir === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });
    
    return result;
  }, [leads, searchQuery, statusFilter, projectFilter, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLeads.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLeads, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, projectFilter]);

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
        if (selectedLead?.id === leadId) setSelectedLead(data.data);
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
        setSelectedLeads(prev => {
          const next = new Set(prev);
          next.delete(leadId);
          return next;
        });
        if (selectedLead?.id === leadId) setSelectedLead(null);
        showToast('Lead deleted', 'success');
      }
    } catch (error) {
      showToast('Failed to delete lead', 'error');
    }
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selectedLeads.size} leads?`)) return;
    
    for (const id of selectedLeads) {
      await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    }
    
    setLeads(prev => prev.filter(l => !selectedLeads.has(l.id)));
    setSelectedLeads(new Set());
    showToast(`${selectedLeads.size} leads deleted`, 'success');
  }

  async function enrichLead(leadId: string) {
    setEnrichingLead(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/enrich`, { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setLeads(prev => prev.map(l => l.id === leadId ? data.data : l));
        if (selectedLead?.id === leadId) setSelectedLead(data.data);
        showToast('Lead enriched with more data', 'success');
      } else {
        showToast(data.error || 'Failed to enrich', 'error');
      }
    } catch (error) {
      showToast('Failed to enrich lead', 'error');
    } finally {
      setEnrichingLead(null);
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
        if (selectedLead?.id === leadId) setSelectedLead(data.data);
        setEditingNotes(false);
        showToast('Notes saved', 'success');
      }
    } catch (error) {
      showToast('Failed to save notes', 'error');
    }
  }

  function copyItem(item: string) {
    navigator.clipboard.writeText(item);
    showToast('Copied to clipboard', 'success');
  }

  function copyAllEmails() {
    const allEmails = [...new Set(filteredLeads.flatMap(l => l.emails || []))];
    navigator.clipboard.writeText(allEmails.join('\n'));
    showToast(`${allEmails.length} emails copied`, 'success');
  }

  function exportLeads() {
    const toExport = selectedLeads.size > 0 
      ? filteredLeads.filter(l => selectedLeads.has(l.id))
      : filteredLeads;
      
    const csv = [
      ['Title', 'URL', 'Emails', 'Phones', 'WhatsApp', 'Instagram', 'GitHub', 'Twitter', 'LinkedIn', 'Telegram', 'Discord', 'Websites', 'Status', 'Quality', 'Notes'].join(','),
      ...toExport.map(l => [
        `"${l.title.replace(/"/g, '""')}"`,
        l.url,
        (l.emails || []).join('; '),
        (l.phones || []).join('; '),
        (l.whatsapp || []).join('; '),
        (l.instagram || []).join('; '),
        (l.github || []).join('; '),
        (l.twitter || []).join('; '),
        (l.linkedin || []).join('; '),
        (l.telegram || []).join('; '),
        (l.discord || []).join('; '),
        (l.websites || []).join('; '),
        l.status,
        l.quality || '',
        `"${(l.notes || '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${toExport.length} leads exported`, 'success');
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function toggleSelectAll() {
    if (selectedLeads.size === paginatedLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(paginatedLeads.map(l => l.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-cyan-500/20 text-cyan-400';
      case 'contacted': return 'bg-amber-500/20 text-amber-400';
      case 'replied': return 'bg-emerald-500/20 text-emerald-400';
      case 'converted': return 'bg-violet-500/20 text-violet-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getQualityColor = (quality?: string) => {
    switch (quality) {
      case 'high': return 'text-emerald-400';
      case 'medium': return 'text-amber-400';
      case 'low': return 'text-slate-500';
      default: return 'text-slate-600';
    }
  };

  // Count contacts for a lead
  const getContactCount = (lead: Lead) => {
    return (lead.emails?.length || 0) + (lead.phones?.length || 0) + 
           (lead.linkedin?.length || 0) + (lead.twitter?.length || 0) +
           (lead.instagram?.length || 0) + (lead.github?.length || 0) +
           (lead.telegram?.length || 0) + (lead.discord?.length || 0) +
           (lead.whatsapp?.length || 0) + (lead.websites?.length || 0);
  };

  // Stats
  const totalEmails = [...new Set(filteredLeads.flatMap(l => l.emails || []))].length;
  const totalContacts = filteredLeads.reduce((acc, l) => acc + getContactCount(l), 0);

  if (loading) {
    return <LeadsLoading />;
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Leads</h1>
            <p className="text-slate-400 mt-1">
              {filteredLeads.length} leads • {totalEmails} emails • {totalContacts} contacts
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedLeads.size > 0 && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedLeads.size})
              </button>
            )}
            {filteredLeads.length > 0 && (
              <>
                <button
                  onClick={exportLeads}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Export {selectedLeads.size > 0 ? `(${selectedLeads.size})` : 'All'}
                </button>
                <button
                  onClick={copyAllEmails}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Copy Emails
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search leads by title, email, URL, notes..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {(searchQuery || statusFilter || projectFilter) && (
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter(''); setProjectFilter(''); }}
            className="px-3 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {filteredLeads.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 rounded-xl border border-slate-800">
          <Users className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {leads.length === 0 ? 'No leads found' : 'No matching leads'}
          </h2>
          <p className="text-slate-400">
            {leads.length === 0 ? 'Run search queries to discover leads' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="w-10 p-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.size === paginatedLeads.length && paginatedLeads.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                      />
                    </th>
                    <th 
                      className="text-left p-4 text-sm font-medium text-slate-400 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('title')}
                    >
                      <span className="flex items-center gap-1">Lead <SortIcon field="title" /></span>
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">Contacts</th>
                    <th 
                      className="text-left p-4 text-sm font-medium text-slate-400 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('quality')}
                    >
                      <span className="flex items-center gap-1">Quality <SortIcon field="quality" /></span>
                    </th>
                    <th 
                      className="text-left p-4 text-sm font-medium text-slate-400 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('status')}
                    >
                      <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
                    </th>
                    <th 
                      className="text-left p-4 text-sm font-medium text-slate-400 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('createdAt')}
                    >
                      <span className="flex items-center gap-1">Added <SortIcon field="createdAt" /></span>
                    </th>
                    <th className="w-28 p-4 text-sm font-medium text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {paginatedLeads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${selectedLeads.has(lead.id) ? 'bg-cyan-500/5' : ''}`}
                      onClick={() => { setSelectedLead(lead); setNotesValue(lead.notes || ''); }}
                    >
                      <td className="p-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                        />
                      </td>
                      <td className="p-4 max-w-[300px]">
                        <div>
                          <span className="font-medium text-white flex items-center gap-1.5">
                            <span className="truncate">{lead.title}</span>
                          </span>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{lead.url}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {(lead.emails?.length || 0) > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-xs">
                              <Mail className="h-3 w-3" />
                              {lead.emails?.length}
                            </span>
                          )}
                          {(lead.phones?.length || 0) > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs">
                              <Phone className="h-3 w-3" />
                              {lead.phones?.length}
                            </span>
                          )}
                          {(lead.linkedin?.length || 0) > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
                              <Linkedin className="h-3 w-3" />
                              {lead.linkedin?.length}
                            </span>
                          )}
                          {getContactCount(lead) > (lead.emails?.length || 0) + (lead.phones?.length || 0) + (lead.linkedin?.length || 0) && (
                            <span className="text-xs text-slate-500">+{getContactCount(lead) - (lead.emails?.length || 0) - (lead.phones?.length || 0) - (lead.linkedin?.length || 0)}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-sm font-medium ${getQualityColor(lead.quality)}`}>
                          {lead.quality ? lead.quality.charAt(0).toUpperCase() + lead.quality.slice(1) : '—'}
                        </span>
                      </td>
                      <td className="p-4" onClick={e => e.stopPropagation()}>
                        <select
                          value={lead.status}
                          onChange={e => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${getStatusColor(lead.status)}`}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setSelectedLead(lead); setNotesValue(lead.notes || ''); }}
                            className="p-1.5 text-slate-500 hover:text-white transition-colors"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => enrichLead(lead.id)}
                            disabled={enrichingLead === lead.id}
                            className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
                            title="Enrich with AI"
                          >
                            {enrichingLead === lead.id ? (
                              <div className="h-4 w-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteLead(lead.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)} of {filteredLeads.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          currentPage === pageNum
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Lead Detail Modal */}
      <AnimatePresence>
        {selectedLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setSelectedLead(null); setEditingNotes(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-white truncate">{selectedLead.title}</h2>
                    <a 
                      href={selectedLead.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-1"
                    >
                      {selectedLead.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <button onClick={() => { setSelectedLead(null); setEditingNotes(false); }} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-3 mt-4">
                  <select
                    value={selectedLead.status}
                    onChange={e => updateLeadStatus(selectedLead.id, e.target.value as Lead['status'])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${getStatusColor(selectedLead.status)}`}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  
                  <span className={`text-sm font-medium ${getQualityColor(selectedLead.quality)}`}>
                    {selectedLead.quality ? `${selectedLead.quality.charAt(0).toUpperCase() + selectedLead.quality.slice(1)} Quality` : 'Not scored'}
                  </span>
                  
                  <span className="text-sm text-slate-500">
                    {getProjectName(selectedLead.projectId)}
                  </span>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedLead.description && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-400 mb-2">Description</h3>
                    <p className="text-slate-300 text-sm">{selectedLead.description}</p>
                  </div>
                )}

                {/* Contact Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Emails */}
                  {(selectedLead.emails?.length || 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                        <Mail className="h-4 w-4" /> Emails ({selectedLead.emails?.length})
                      </h3>
                      <ContactBadge 
                        icon={Mail} 
                        items={selectedLead.emails || []}
                        color="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400"
                        onCopy={copyItem}
                      />
                    </div>
                  )}

                  {/* Phones */}
                  {(selectedLead.phones?.length || 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                        <Phone className="h-4 w-4" /> Phones ({selectedLead.phones?.length})
                      </h3>
                      <ContactBadge 
                        icon={Phone} 
                        items={selectedLead.phones || []}
                        color="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                        onCopy={copyItem}
                      />
                    </div>
                  )}

                  {/* LinkedIn */}
                  {(selectedLead.linkedin?.length || 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                        <Linkedin className="h-4 w-4" /> LinkedIn ({selectedLead.linkedin?.length})
                      </h3>
                      <ContactBadge 
                        icon={Linkedin} 
                        items={selectedLead.linkedin || []}
                        color="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                        prefix="https://linkedin.com/in/"
                        onCopy={copyItem}
                      />
                    </div>
                  )}

                  {/* Twitter */}
                  {(selectedLead.twitter?.length || 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                        <Twitter className="h-4 w-4" /> Twitter ({selectedLead.twitter?.length})
                      </h3>
                      <ContactBadge 
                        icon={Twitter} 
                        items={selectedLead.twitter || []}
                        color="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400"
                        prefix="https://twitter.com/"
                        onCopy={copyItem}
                      />
                    </div>
                  )}

                  {/* Instagram */}
                  {(selectedLead.instagram?.length || 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                        <Instagram className="h-4 w-4" /> Instagram ({selectedLead.instagram?.length})
                      </h3>
                      <ContactBadge 
                        icon={Instagram} 
                        items={selectedLead.instagram || []}
                        color="bg-pink-500/10 hover:bg-pink-500/20 text-pink-400"
                        prefix="https://instagram.com/"
                        onCopy={copyItem}
                      />
                    </div>
                  )}

                  {/* GitHub */}
                  {(selectedLead.github?.length || 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                        <Github className="h-4 w-4" /> GitHub ({selectedLead.github?.length})
                      </h3>
                      <ContactBadge 
                        icon={Github} 
                        items={selectedLead.github || []}
                        color="bg-slate-500/10 hover:bg-slate-500/20 text-slate-300"
                        prefix="https://github.com/"
                        onCopy={copyItem}
                      />
                    </div>
                  )}

                  {/* WhatsApp */}
                  {(selectedLead.whatsapp?.length || 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                        <MessageCircle className="h-4 w-4" /> WhatsApp ({selectedLead.whatsapp?.length})
                      </h3>
                      <ContactBadge 
                        icon={MessageCircle} 
                        items={selectedLead.whatsapp || []}
                        color="bg-green-500/10 hover:bg-green-500/20 text-green-400"
                        prefix="https://wa.me/"
                        onCopy={copyItem}
                      />
                    </div>
                  )}

                  {/* Telegram */}
                  {(selectedLead.telegram?.length || 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                        <Send className="h-4 w-4" /> Telegram ({selectedLead.telegram?.length})
                      </h3>
                      <ContactBadge 
                        icon={Send} 
                        items={selectedLead.telegram || []}
                        color="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400"
                        prefix="https://t.me/"
                        onCopy={copyItem}
                      />
                    </div>
                  )}

                  {/* Discord */}
                  {(selectedLead.discord?.length || 0) > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4" /> Discord ({selectedLead.discord?.length})
                      </h3>
                      <ContactBadge 
                        icon={MessageSquare} 
                        items={selectedLead.discord || []}
                        color="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400"
                        prefix="https://discord.gg/"
                        onCopy={copyItem}
                      />
                    </div>
                  )}

                  {/* Websites */}
                  {(selectedLead.websites?.length || 0) > 0 && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                        <Globe className="h-4 w-4" /> Websites ({selectedLead.websites?.length})
                      </h3>
                      <ContactBadge 
                        icon={Globe} 
                        items={selectedLead.websites || []}
                        color="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                        onCopy={copyItem}
                      />
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-slate-400">Notes</h3>
                    {!editingNotes && (
                      <button 
                        onClick={() => setEditingNotes(true)}
                        className="text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div>
                      <textarea
                        value={notesValue}
                        onChange={e => setNotesValue(e.target.value)}
                        placeholder="Add notes about this lead..."
                        rows={4}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => { setEditingNotes(false); setNotesValue(selectedLead.notes || ''); }}
                          className="px-3 py-1.5 text-slate-400 hover:text-white text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => updateLeadNotes(selectedLead.id, notesValue)}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-300 text-sm">
                      {selectedLead.notes || <span className="text-slate-500 italic">No notes yet</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Added {new Date(selectedLead.createdAt).toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => enrichLead(selectedLead.id)}
                    disabled={enrichingLead === selectedLead.id}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {enrichingLead === selectedLead.id ? (
                      <div className="h-4 w-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Enrich with AI
                  </button>
                  <button
                    onClick={() => { deleteLead(selectedLead.id); setSelectedLead(null); }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
