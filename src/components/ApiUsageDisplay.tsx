/**
 * ApiUsageDisplay - Real-time API usage display component
 * 
 * Shows current API usage with live data from provider APIs
 */

import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import type { ProviderType } from '../lib/web-search/providers/SearchProviderFactory';
import { searchProviderRegistry } from '../lib/web-search';

interface ApiUsageDisplayProps {
  providerId: ProviderType;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

export function ApiUsageDisplay({ 
  providerId, 
  autoRefresh = false,
  refreshInterval = 60 
}: ApiUsageDisplayProps) {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`[ApiUsageDisplay] Fetching usage for provider: ${providerId}`);
      const provider = searchProviderRegistry.getProvider(providerId);
      
      if (!provider.getApiUsage) {
        console.warn(`[ApiUsageDisplay] Provider ${providerId} does not support usage tracking`);
        setError('Provider does not support usage tracking');
        setLoading(false);
        return;
      }
      
      console.log(`[ApiUsageDisplay] Calling getApiUsage() for ${providerId}`);
      const usageData = await provider.getApiUsage();
      console.log(`[ApiUsageDisplay] Usage data received:`, usageData);
      
      if (usageData) {
        setUsage(usageData);
        setLastUpdate(new Date());
      } else {
        console.warn(`[ApiUsageDisplay] No usage data returned for ${providerId}`);
        setError('No usage data available - API key may not be configured');
      }
    } catch (err) {
      console.error(`[ApiUsageDisplay] Error fetching usage for ${providerId}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();

    if (autoRefresh) {
      const interval = setInterval(fetchUsage, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [providerId, autoRefresh, refreshInterval]);

  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4 text-yellow-500" />
          <span>Usage data unavailable</span>
        </div>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button
          size="sm"
          variant="secondary"
          onClick={fetchUsage}
          disabled={loading}
        >
          <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Loading usage...</span>
      </div>
    );
  }

  const usagePercent = (usage.used / usage.limit) * 100;
  const isNearLimit = usagePercent > 80;
  const isAtLimit = usagePercent >= 100;

  return (
    <div className="space-y-3">
      {/* Usage Bar */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium">API Usage</span>
          <span className="text-muted-foreground">
            {usage.used.toLocaleString()} / {usage.limit.toLocaleString()}
          </span>
        </div>
        
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isAtLimit
                ? 'bg-red-500'
                : isNearLimit
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="font-medium">{usage.remaining.toLocaleString()}</p>
          </div>
        </div>

        {usage.resetDate && (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Resets</p>
              <p className="font-medium">
                {new Date(usage.resetDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Additional Info */}
      {usage.note && (
        <div className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs">
          <AlertCircle className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{usage.note}</span>
        </div>
      )}

      {/* Status & Refresh */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isAtLimit ? (
            <>
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span>Limit reached</span>
            </>
          ) : isNearLimit ? (
            <>
              <AlertCircle className="w-3 h-3 text-yellow-500" />
              <span>Near limit</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Available</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={fetchUsage}
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
