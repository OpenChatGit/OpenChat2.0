/**
 * WebSearchProviderSettings - Premium Provider UI
 * 
 * Simplified UI that only shows the Supabase/SearXNG provider.
 */

import { useState, useEffect } from 'react';
import { 
  Search, 
  CheckCircle, 
  XCircle,
  Loader2,
  Clock,
  Shield,
  Zap,
  Globe
} from 'lucide-react';
import { 
  providerSettingsManager,
  searchProviderRegistry
} from '../lib/web-search';

export function WebSearchProviderSettings() {
  const providerId = 'supabase';
  const provider = searchProviderRegistry.getProvider(providerId);
  const metadata = provider.getMetadata();
  const stats = provider.getStats();

  // Potential refresh logic could go here if needed in the future
  useEffect(() => {
    // Current stats are live via registry
  }, []);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const success = await provider.testConnection();
      setTestResult(success ? 'success' : 'error');
    } catch (e) {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Globe className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold">Premium Web Search</h3>
          <p className="text-sm text-muted-foreground">
            Powered by Tavily AI & Supabase Edge Functions
          </p>
        </div>
        <button
          onClick={handleTestConnection}
          disabled={isTesting}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            testResult === 'success' 
              ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
              : testResult === 'error'
              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
              : 'bg-primary text-primary-foreground hover:opacity-90'
          }`}
        >
          {isTesting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : testResult === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : testResult === 'error' ? (
            <XCircle className="w-4 h-4" />
          ) : (
            <Zap className="w-4 h-4 fill-current" />
          )}
          {isTesting ? 'Testing...' : testResult === 'success' ? 'Connected' : testResult === 'error' ? 'Failed' : 'Test Connection'}
        </button>
      </div>

      {/* Main Provider Card */}
      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{metadata.name}</span>
                <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full font-bold uppercase tracking-wider">
                  Active
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {metadata.description}
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {metadata.features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 mt-2">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-muted rounded-lg">
                  <Search className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Total Searches</div>
                  <div className="font-mono font-bold">{stats.totalSearches}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="p-2 bg-muted rounded-lg">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Latency</div>
                  <div className="font-mono font-bold">{stats.averageResponseTime > 0 ? `${Math.round(stats.averageResponseTime)}ms` : '---'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Status</div>
                  <div className="flex items-center gap-1 text-green-500 font-bold">
                    <Zap className="w-3 h-3 fill-current" />
                    Operational
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border border-border rounded-xl bg-muted/20 flex flex-col items-center text-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          <div className="text-sm font-bold">Private & Secure</div>
          <p className="text-xs text-muted-foreground">
            Your queries are never stored or shared with advertisers.
          </p>
        </div>
        <div className="p-4 border border-border rounded-xl bg-muted/20 flex flex-col items-center text-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <div className="text-sm font-bold">Token Billing</div>
          <p className="text-xs text-muted-foreground">
            Pay-as-you-go search using your OC-Token balance.
          </p>
        </div>
      </div>
    </div>
  );
}
