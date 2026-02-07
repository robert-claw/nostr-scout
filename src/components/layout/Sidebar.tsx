'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderKanban, Users, Settings, Zap, BookOpen, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  description?: string;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/directory', label: 'Directory', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  selectedProject?: string | null;
  onProjectChange?: (projectId: string | null) => void;
}

export function Sidebar({ selectedProject: externalSelectedProject, onProjectChange }: SidebarProps) {
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(externalSelectedProject || null);
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // Sync with external prop
  useEffect(() => {
    if (externalSelectedProject !== undefined) {
      setSelectedProject(externalSelectedProject);
    }
  }, [externalSelectedProject]);

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        setProjects(data.data || []);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Save selected project to localStorage
  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('scout-selected-project', selectedProject);
    }
  }, [selectedProject]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('scout-selected-project');
    if (saved && !externalSelectedProject) {
      setSelectedProject(saved);
    }
  }, [externalSelectedProject]);

  const handleProjectSelect = (projectId: string | null) => {
    setSelectedProject(projectId);
    if (onProjectChange) {
      onProjectChange(projectId);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Scout</h1>
            <p className="text-xs text-slate-400">Lead Discovery</p>
          </div>
        </Link>
      </div>

      {/* Project Selector */}
      <div className="p-4 border-b border-slate-800">
        <button
          onClick={() => setIsProjectsOpen(!isProjectsOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Project</span>
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isProjectsOpen ? 'rotate-180' : ''}`} />
        </button>
        
        <AnimatePresence>
          {isProjectsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-1">
                <button
                  onClick={() => handleProjectSelect(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !selectedProject
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  All Projects
                </button>
                
                {loading ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Loading...</div>
                ) : (
                  projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                        selectedProject === project.id
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                      title={project.name}
                    >
                      {project.name}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            
            // Add project filter to links
            const href = selectedProject && ['leads', 'directory'].some(p => item.href.includes(p))
              ? `${item.href}?projectId=${selectedProject}`
              : item.href;
            
            return (
              <li key={item.href}>
                <Link
                  href={href}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-slate-800 rounded-lg"
                      transition={{ type: 'spring', duration: 0.3 }}
                    />
                  )}
                  <Icon className="h-5 w-5 relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="rounded-lg bg-slate-800/50 p-4">
          <p className="text-xs text-slate-400">Powered by</p>
          <p className="text-sm text-slate-200">Brave + Perplexity AI</p>
        </div>
      </div>
    </aside>
  );
}
