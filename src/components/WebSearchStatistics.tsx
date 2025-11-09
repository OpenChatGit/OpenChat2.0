/**
 * WebSearchStatistics - Usage statistics and cost tracking dashboard
 * 
 * Displays:
 * - Total searches and costs
 * - Per-provider statistics
 * - Search history
 * - Cost breakdown
 */

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Search,
  BarChart3,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { Button } from './ui/Button';
import { 
  smartSearchManager,
  searchProviderRegistry,
  type ProviderType 
} from '../lib/web-search';

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
}

function StatCard({ label, value, icon, trend, color = 'text-primary' }: StatCard) {
  return (
    <div className="p-4 border border-border rounded-lg bg-muted/30">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {trend && (
            <p className="text-xs text-muted-foreground mt-1">{trend}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-background ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function WebSearchStatistics() {
  const [stats, setStats] = useState(smartSearchManager.getAggregatedStats());
  const [providerStats, setProviderStats] = useState<Map<ProviderType, any>>(new Map());

  const refreshStats = () => {
    setStats(smartSearchManager.getAggregatedStats());
    
    // Get per-provider stats
    const providers: ProviderType[] = ['free', 'serper', 'google', 'brave'];
    const newProviderStats = new Map();
    
    providers.forEach(id => {
      const provider = searchProviderRegistry.getProvider(id);
      newProviderStats.set(id, provider.getStats());
    });
    
    setProviderStats(newProviderStats);
  };

  useEffect(() => {
    refreshStats();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(refreshStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResetStats = () => {
    if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
      smartSearchManager.clearHistory();
      searchProviderRegistry.resetAllStats();
      refreshStats();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Search Statistics</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor your search usage and costs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={refreshStats}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleResetStats}
          >
            Reset Stats
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Searches"
          value={stats.totalSearches}
          icon={<Search className="w-5 h-5" />}
          color="text-blue-500"
        />
        
        <StatCard
          label="Total Cost"
          value={`$${stats.totalCost.toFixed(4)}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="text-green-500"
        />
        
        <StatCard
          label="Avg Response Time"
          value={`${Math.round(stats.averageSearchTime)}ms`}
          icon={<Clock className="w-5 h-5" />}
          color="text-purple-500"
        />
        
        <StatCard
          label="Fallback Usage"
          value={stats.fallbackSearches}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={`${((stats.fallbackSearches / Math.max(stats.totalSearches, 1)) * 100).toFixed(1)}% of searches`}
          color="text-orange-500"
        />
      </div>

      {/* Provider Usage Chart */}
      <div className="p-4 border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-primary" />
          <h4 className="font-semibold">Provider Usage</h4>
        </div>
        
        <div className="space-y-3">
          {Object.entries(stats.providerUsage).map(([provider, count]) => {
            const percentage = (count / Math.max(stats.totalSearches, 1)) * 100;
            
            return (
              <div key={provider}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{provider}</span>
                  <span className="text-muted-foreground">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          
          {Object.keys(stats.providerUsage).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No searches yet. Start searching to see statistics.
            </p>
          )}
        </div>
      </div>

      {/* Per-Provider Details */}
      <div className="p-4 border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h4 className="font-semibold">Provider Details</h4>
        </div>
        
        <div className="space-y-4">
          {Array.from(providerStats.entries()).map(([id, pStats]) => {
            const provider = searchProviderRegistry.getProvider(id);
            const metadata = provider.getMetadata();
            
            if (pStats.totalSearches === 0) return null;
            
            const successRate = pStats.totalSearches > 0
              ? (pStats.successfulSearches / pStats.totalSearches) * 100
              : 0;
            
            return (
              <div key={id} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{metadata.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    metadata.type === 'free' 
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}>
                    {metadata.type}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Searches</p>
                    <p className="font-medium">{pStats.totalSearches}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-xs">Success Rate</p>
                    <p className="font-medium">{successRate.toFixed(1)}%</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-xs">Avg Time</p>
                    <p className="font-medium">{Math.round(pStats.averageResponseTime)}ms</p>
                  </div>
                  
                  {metadata.type === 'paid' && (
                    <div>
                      <p className="text-muted-foreground text-xs">Cost</p>
                      <p className="font-medium">${pStats.estimatedCost.toFixed(4)}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost Breakdown */}
      {stats.totalCost > 0 && (
        <div className="p-4 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Cost Breakdown</h4>
          </div>
          
          <div className="space-y-2">
            {Array.from(providerStats.entries()).map(([id, pStats]) => {
              const provider = searchProviderRegistry.getProvider(id);
              const metadata = provider.getMetadata();
              
              if (metadata.type === 'free' || pStats.estimatedCost === 0) return null;
              
              const costPercentage = (pStats.estimatedCost / stats.totalCost) * 100;
              
              return (
                <div key={id} className="flex items-center justify-between text-sm">
                  <span>{metadata.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      ${pStats.estimatedCost.toFixed(4)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({costPercentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>${stats.totalCost.toFixed(4)}</span>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 border border-primary/30 rounded-lg bg-primary/5">
        <h4 className="text-sm font-semibold mb-2">💡 Tips</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Statistics are stored locally and reset when you clear browser data</li>
          <li>• Enable Smart Selection to optimize costs automatically</li>
          <li>• Monitor fallback usage to identify provider reliability issues</li>
          <li>• Use the free provider for unlimited searches at no cost</li>
        </ul>
      </div>
    </div>
  );
}
