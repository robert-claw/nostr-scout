'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, User, Building2, BookOpen, Package, Calendar, MapPin,
  ExternalLink, Copy, Trash2, X, Filter, Download, Image, Globe,
  Mail, Twitter, Linkedin, ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { DirectoryEntity, EntityType, Project } from '@/lib/types';

const ENTITY_TYPES: { value: EntityType | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All Types', icon: Search },
  { value: 'person', label: 'People', icon: User },
  { value: 'organization', label: 'Organizations', icon: Building2 },
  { value: 'book', label: 'Books', icon: BookOpen },
  { value: 'product', label: 'Products', icon: Package },
  { value: 'event', label: 'Events', icon: Calendar },
  { value: 'place', label: 'Places', icon: MapPin },
];

const ITEMS_PER_PAGE = 20;

function EntityIcon({ type, className }: { type: EntityType; className?: string }) {
  const icons: Record<EntityType, React.ElementType> = {
    person: User,
    organization: Building2,
    book: BookOpen,
    product: Package,
    event: Calendar,
    place: MapPin,
  };
  const Icon = icons[type] || Building2;
  return <Icon className={className} />;
}

function getTypeColor(type: EntityType): string {
  const colors: Record<EntityType, string> = {
    person: 'bg-cyan-500/20 text-cyan-400',
    organization: 'bg-blue-500/20 text-blue-400',
    book: 'bg-amber-500/20 text-amber-400',
    product: 'bg-emerald-500/20 text-emerald-400',
    event: 'bg-violet-500/20 text-violet-400',
    place: 'bg-rose-500/20 text-rose-400',
  };
  return colors[type] || 'bg-slate-500/20 text-slate-400';
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <DirectoryContent />
    </Suspense>
  );
}

function DirectoryContent() {
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');
  
  const [entities, setEntities] = useState<DirectoryEntity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<EntityType | 'all'>('all');
  const [selectedProject, setSelectedProject] = useState<string>(projectIdFromUrl || '');
  const [filterType, setFilterType] = useState<EntityType | 'all'>('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<DirectoryEntity | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const { showToast } = useToast();

  // Sync project from URL
  useEffect(() => {
    if (projectIdFromUrl) {
      setSelectedProject(projectIdFromUrl);
    }
  }, [projectIdFromUrl]);

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  async function loadData() {
    try {
      // Build entities URL with optional project filter
      const entitiesUrl = selectedProject 
        ? `/api/directory/entities?projectId=${selectedProject}`
        : '/api/directory/entities';
        
      const [entitiesRes, projectsRes] = await Promise.all([
        fetch(entitiesUrl),
        fetch('/api/projects'),
      ]);

      const entitiesData = await entitiesRes.json();
      const projectsData = await projectsRes.json();

      setEntities(entitiesData.data || []);
      setProjects(projectsData.data || []);
      
      // Set default project if available and none selected
      if (projectsData.data?.length > 0 && !selectedProject && !projectIdFromUrl) {
        setSelectedProject(projectsData.data[0].id);
      }
    } catch (error) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchTerm.trim() || !selectedProject) {
      showToast('Enter a search term and select a project', 'error');
      return;
    }

    setSearching(true);
    try {
      const res = await fetch('/api/directory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          searchTerm: searchTerm.trim(),
          entityType: searchType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEntities(prev => [...data.data.entities, ...prev]);
        showToast(`Found ${data.data.entities.length} entities`, 'success');
        setSearchTerm('');
      } else {
        showToast(data.error || 'Search failed', 'error');
      }
    } catch (error) {
      showToast('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  }

  async function deleteEntity(id: string) {
    if (!confirm('Delete this entity?')) return;

    try {
      const res = await fetch(`/api/directory/entities/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        setEntities(prev => prev.filter(e => e.id !== id));
        setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
        if (selectedEntity?.id === id) setSelectedEntity(null);
        showToast('Entity deleted', 'success');
      }
    } catch (error) {
      showToast('Failed to delete', 'error');
    }
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selectedIds.size} entities?`)) return;
    
    for (const id of selectedIds) {
      await fetch(`/api/directory/entities/${id}`, { method: 'DELETE' });
    }
    
    setEntities(prev => prev.filter(e => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    showToast(`Deleted ${selectedIds.size} entities`, 'success');
  }

  async function enrichEntity(id: string) {
    setEnrichingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/directory/entities/${id}/enrich`, { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setEntities(prev => prev.map(e => e.id === id ? data.data : e));
        if (selectedEntity?.id === id) setSelectedEntity(data.data);
        showToast('Entity enriched with contact info', 'success');
      } else {
        showToast(data.error || 'Enrichment failed', 'error');
      }
    } catch (error) {
      showToast('Enrichment failed', 'error');
    } finally {
      setEnrichingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  async function enrichSelected() {
    showToast(`Enriching ${selectedIds.size} entities...`, 'info');
    let enriched = 0;
    
    for (const id of selectedIds) {
      setEnrichingIds(prev => new Set(prev).add(id));
      try {
        const res = await fetch(`/api/directory/entities/${id}/enrich`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setEntities(prev => prev.map(e => e.id === id ? data.data : e));
          enriched++;
        }
      } catch {}
      setEnrichingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
    
    showToast(`Enriched ${enriched}/${selectedIds.size} entities`, 'success');
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === paginatedEntities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedEntities.map(e => e.id)));
    }
  }

  function copyItem(item: string) {
    navigator.clipboard.writeText(item);
    showToast('Copied to clipboard', 'success');
  }

  function exportEntities() {
    const toExport = filteredEntities;
    const csv = [
      ['Type', 'Name', 'Description', 'Title/Role', 'Company/Industry', 'Website', 'Email', 'Twitter', 'LinkedIn', 'Tags'].join(','),
      ...toExport.map(e => [
        e.type,
        `"${e.name.replace(/"/g, '""')}"`,
        `"${(e.description || '').replace(/"/g, '""')}"`,
        `"${(e.title || e.role || '').replace(/"/g, '""')}"`,
        `"${(e.company || e.industry || '').replace(/"/g, '""')}"`,
        e.website || '',
        e.email || '',
        e.twitter || '',
        e.linkedin || '',
        (e.tags || []).join('; '),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `directory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${toExport.length} entities exported`, 'success');
  }

  // Filter entities
  const filteredEntities = useMemo(() => {
    let result = [...entities];

    if (filterType !== 'all') {
      result = result.filter(e => e.type === filterType);
    }

    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.company?.toLowerCase().includes(q) ||
        e.industry?.toLowerCase().includes(q) ||
        e.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [entities, filterType, filterQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredEntities.length / ITEMS_PER_PAGE);
  const paginatedEntities = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEntities.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEntities, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white">Directory</h1>
        <p className="text-slate-400 mt-1">
          Search and organize entities: people, organizations, books, and more
        </p>
      </header>

      {/* Search Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-400" />
          AI-Powered Search
        </h2>
        
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Select Project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={searchType}
            onChange={e => setSearchType(e.target.value as EntityType | 'all')}
            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
          >
            {ENTITY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[300px]">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g., Bitcoin influencers, AI startups, climate scientists..."
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={searching || !searchTerm.trim() || !selectedProject}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searching ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Filter results..."
              className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none w-64"
            />
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as EntityType | 'all')}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
          >
            {ENTITY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={enrichSelected}
                disabled={enrichingIds.size > 0}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                Enrich ({selectedIds.size})
              </button>
              <button
                onClick={deleteSelected}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedIds.size})
              </button>
            </>
          )}
          <span className="text-sm text-slate-400">{filteredEntities.length} entities</span>
          {filteredEntities.length > 0 && (
            <button
              onClick={exportEntities}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </div>

      {filteredEntities.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 rounded-xl border border-slate-800">
          <Search className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No entities yet</h2>
          <p className="text-slate-400">Search for people, organizations, books, and more</p>
        </div>
      ) : (
        <>
          {/* Select All */}
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              checked={selectedIds.size === paginatedEntities.length && paginatedEntities.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-400">Select all on page</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedEntities.map(entity => (
              <motion.div
                key={entity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-slate-900 border rounded-xl p-4 hover:border-slate-700 transition-colors ${
                  selectedIds.has(entity.id) ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-slate-800'
                }`}
              >
                {/* Checkbox + Header */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(entity.id)}
                    onChange={() => toggleSelect(entity.id)}
                    onClick={e => e.stopPropagation()}
                    className="mt-1 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <div 
                    className="flex items-start gap-3 flex-1 cursor-pointer"
                    onClick={() => setSelectedEntity(entity)}
                  >
                    {entity.image ? (
                      <img
                        src={entity.image}
                        alt={entity.name}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-800"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(entity.type)}`}>
                        <EntityIcon type={entity.type} className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{entity.name}</h3>
                      <p className="text-xs text-slate-500 truncate">
                        {entity.title || entity.role || entity.industry || entity.type}
                      </p>
                    </div>
                  </div>
                </div>

                {entity.description && (
                  <p className="text-sm text-slate-400 mt-3 line-clamp-2 cursor-pointer" onClick={() => setSelectedEntity(entity)}>{entity.description}</p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(entity.type)}`}>
                      {entity.type}
                    </span>
                    {entity.tags?.includes('enriched') && (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">enriched</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {entity.email && <Mail className="h-3.5 w-3.5 text-cyan-400" />}
                    {entity.website && <Globe className="h-3.5 w-3.5 text-slate-500" />}
                    {entity.twitter && <Twitter className="h-3.5 w-3.5 text-sky-400" />}
                    {entity.linkedin && <Linkedin className="h-3.5 w-3.5 text-blue-400" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); enrichEntity(entity.id); }}
                      disabled={enrichingIds.has(entity.id)}
                      className="ml-1 p-1 text-slate-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
                      title="Enrich with contact info"
                    >
                      {enrichingIds.has(entity.id) ? (
                        <div className="h-3.5 w-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-500">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredEntities.length)} of {filteredEntities.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
                <span className="text-sm text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
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

      {/* Entity Detail Modal */}
      <AnimatePresence>
        {selectedEntity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedEntity(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-start gap-4">
                  {selectedEntity.image ? (
                    <img
                      src={selectedEntity.image}
                      alt={selectedEntity.name}
                      className="w-16 h-16 rounded-xl object-cover bg-slate-800"
                    />
                  ) : (
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${getTypeColor(selectedEntity.type)}`}>
                      <EntityIcon type={selectedEntity.type} className="h-8 w-8" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-white">{selectedEntity.name}</h2>
                    <p className="text-sm text-slate-400">
                      {selectedEntity.title || selectedEntity.role || selectedEntity.company || selectedEntity.industry}
                    </p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded mt-2 ${getTypeColor(selectedEntity.type)}`}>
                      {selectedEntity.type}
                    </span>
                  </div>
                  <button onClick={() => setSelectedEntity(null)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedEntity.description && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-slate-400 mb-1">Description</h3>
                    <p className="text-slate-300">{selectedEntity.description}</p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {selectedEntity.company && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-1">Company</h3>
                      <p className="text-white">{selectedEntity.company}</p>
                    </div>
                  )}
                  {selectedEntity.industry && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-1">Industry</h3>
                      <p className="text-white">{selectedEntity.industry}</p>
                    </div>
                  )}
                  {selectedEntity.size && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-1">Size</h3>
                      <p className="text-white">{selectedEntity.size}</p>
                    </div>
                  )}
                  {selectedEntity.founded && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-1">Founded</h3>
                      <p className="text-white">{selectedEntity.founded}</p>
                    </div>
                  )}
                  {selectedEntity.headquarters && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-1">Headquarters</h3>
                      <p className="text-white">{selectedEntity.headquarters}</p>
                    </div>
                  )}
                  {selectedEntity.author && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-1">Author</h3>
                      <p className="text-white">{selectedEntity.author}</p>
                    </div>
                  )}
                  {selectedEntity.publisher && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-1">Publisher</h3>
                      <p className="text-white">{selectedEntity.publisher}</p>
                    </div>
                  )}
                  {selectedEntity.year && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-1">Year</h3>
                      <p className="text-white">{selectedEntity.year}</p>
                    </div>
                  )}
                </div>

                {/* Contact Links */}
                <div className="space-y-2">
                  {selectedEntity.website && (
                    <button
                      onClick={() => copyItem(selectedEntity.website!)}
                      className="flex items-center gap-2 w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors group"
                    >
                      <Globe className="h-4 w-4 text-blue-400" />
                      <span className="text-white flex-1 truncate">{selectedEntity.website}</span>
                      <Copy className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
                    </button>
                  )}
                  {selectedEntity.email && (
                    <button
                      onClick={() => copyItem(selectedEntity.email!)}
                      className="flex items-center gap-2 w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors group"
                    >
                      <Mail className="h-4 w-4 text-cyan-400" />
                      <span className="text-white flex-1 truncate">{selectedEntity.email}</span>
                      <Copy className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
                    </button>
                  )}
                  {selectedEntity.twitter && (
                    <button
                      onClick={() => copyItem(`https://twitter.com/${selectedEntity.twitter}`)}
                      className="flex items-center gap-2 w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors group"
                    >
                      <Twitter className="h-4 w-4 text-sky-400" />
                      <span className="text-white flex-1">@{selectedEntity.twitter}</span>
                      <Copy className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
                    </button>
                  )}
                  {selectedEntity.linkedin && (
                    <button
                      onClick={() => copyItem(`https://linkedin.com/in/${selectedEntity.linkedin}`)}
                      className="flex items-center gap-2 w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors group"
                    >
                      <Linkedin className="h-4 w-4 text-blue-400" />
                      <span className="text-white flex-1">{selectedEntity.linkedin}</span>
                      <Copy className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
                    </button>
                  )}
                </div>

                {/* Tags */}
                {selectedEntity.tags && selectedEntity.tags.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs font-medium text-slate-500 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedEntity.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Added {new Date(selectedEntity.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => { deleteEntity(selectedEntity.id); setSelectedEntity(null); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
