'use client';

import { useState, useEffect } from 'react';
import { Settings, Key, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const [apiKeyStatus, setApiKeyStatus] = useState<'loading' | 'configured' | 'missing'>('loading');
  const { showToast } = useToast();

  useEffect(() => {
    // Check if API is working by trying a test call
    checkApiStatus();
  }, []);

  async function checkApiStatus() {
    try {
      // Just check if we can reach the API - actual key validation happens server-side
      const res = await fetch('/api/projects');
      if (res.ok) {
        setApiKeyStatus('configured');
      } else {
        setApiKeyStatus('missing');
      }
    } catch {
      setApiKeyStatus('missing');
    }
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Configure your Nostr Scout instance</p>
      </header>

      <div className="max-w-2xl space-y-6">
        {/* API Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Key className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">API Configuration</h2>
              <p className="text-sm text-slate-400">Brave Search API credentials</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-slate-300">Brave Search API</span>
              </div>
              <div className="flex items-center gap-2">
                {apiKeyStatus === 'loading' ? (
                  <span className="text-slate-400 text-sm">Checking...</span>
                ) : apiKeyStatus === 'configured' ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-400 text-sm">Configured</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-400 text-sm">Not configured</span>
                  </>
                )}
              </div>
            </div>

            <p className="text-sm text-slate-500">
              The Brave Search API key is configured via the <code className="text-cyan-400 bg-slate-800 px-1 rounded">BRAVE_API_KEY</code> environment variable.
              To update it, modify your <code className="text-cyan-400 bg-slate-800 px-1 rounded">.env.local</code> file and restart the server.
            </p>
          </div>
        </div>

        {/* About */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Settings className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">About</h2>
              <p className="text-sm text-slate-400">Application information</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Application</span>
              <span className="text-white">Nostr Scout</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Version</span>
              <span className="text-white">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Framework</span>
              <span className="text-white">Next.js 15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Search Provider</span>
              <span className="text-white">Brave Search API</span>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">How It Works</h2>
          
          <div className="space-y-4 text-sm text-slate-400">
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 text-xs font-bold">1</span>
              </div>
              <p>Create a project to organize your lead discovery campaigns</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 text-xs font-bold">2</span>
              </div>
              <p>Add search queries with relevant keywords (include terms like &ldquo;contact&rdquo; or &ldquo;email&rdquo; for better results)</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 text-xs font-bold">3</span>
              </div>
              <p>Run the query to search using Brave and extract email addresses from results</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 text-xs font-bold">4</span>
              </div>
              <p>Review and manage discovered leads, update their status as you reach out</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
