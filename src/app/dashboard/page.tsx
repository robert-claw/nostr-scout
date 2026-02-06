'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderKanban, Users, Search, Mail, ArrowUpRight, Clock } from 'lucide-react';
import Link from 'next/link';
import type { Project, Query, Lead } from '@/lib/types';

interface Stats {
  projects: number;
  queries: number;
  leads: number;
  emails: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ projects: 0, queries: 0, leads: 0, emails: 0 });
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [projectsRes, queriesRes, leadsRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/queries'),
          fetch('/api/leads'),
        ]);

        const projectsData = await projectsRes.json();
        const queriesData = await queriesRes.json();
        const leadsData = await leadsRes.json();

        const projects: Project[] = projectsData.data || [];
        const queries: Query[] = queriesData.data || [];
        const leads: Lead[] = leadsData.data || [];

        const totalEmails = leads.reduce((sum, l) => sum + l.emails.length, 0);

        setStats({
          projects: projects.length,
          queries: queries.length,
          leads: leads.length,
          emails: totalEmails,
        });

        setRecentLeads(leads.slice(-5).reverse());
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const statCards = [
    { label: 'Projects', value: stats.projects, icon: FolderKanban, color: 'from-cyan-500 to-cyan-600', href: '/projects' },
    { label: 'Queries', value: stats.queries, icon: Search, color: 'from-violet-500 to-violet-600', href: '/projects' },
    { label: 'Leads', value: stats.leads, icon: Users, color: 'from-emerald-500 to-emerald-600', href: '/leads' },
    { label: 'Emails Found', value: stats.emails, icon: Mail, color: 'from-amber-500 to-amber-600', href: '/leads' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of your lead discovery activity</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={card.href}>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors group">
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
                <p className="text-3xl font-bold text-white">{card.value}</p>
                <p className="text-slate-400 text-sm">{card.label}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Leads</h2>
            <Link href="/leads" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              View all
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No leads yet</p>
              <p className="text-sm text-slate-500">Run a query to discover leads</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentLeads.map(lead => (
                <div key={lead.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{lead.title}</p>
                    <p className="text-xs text-slate-400 truncate">{lead.url}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-3 w-3 text-cyan-400" />
                      <span className="text-xs text-cyan-400">{lead.emails.length} email{lead.emails.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-6">Quick Actions</h2>
          
          <div className="space-y-3">
            <Link href="/projects">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <FolderKanban className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Create New Project</p>
                  <p className="text-xs text-slate-400">Organize your lead discovery campaigns</p>
                </div>
              </div>
            </Link>

            <Link href="/projects">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
                <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Search className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Add Search Query</p>
                  <p className="text-xs text-slate-400">Define search terms to find leads</p>
                </div>
              </div>
            </Link>

            <Link href="/leads">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Browse Leads</p>
                  <p className="text-xs text-slate-400">View and manage discovered leads</p>
                </div>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Globe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  );
}
