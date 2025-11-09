/**
 * WebSearchProviderComparison - Side-by-side provider comparison
 * 
 * Features:
 * - Compare all providers
 * - Performance metrics
 * - Cost comparison
 * - Feature matrix
 * - Recommendations
 */

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  DollarSign, 
  Clock, 
  CheckCircle,
  XCircle,
  Award,
  Zap
} from 'lucide-react';
import { 
  searchProviderRegistry,
  type ProviderType 
} from '../lib/web-search';

interface ProviderComparison {
  id: ProviderType;
  name: string;
  type: 'free' | 'paid';
  stats: {
    totalSearches: number;
    successRate: number;
    avgResponseTime: number;
    estimatedCost: number;
  };
  pricing: {
    model: string;
    freeTier?: string;
    paidTier?: string;
    costPerSearch?: number;
  };
  features: string[];
  limitations: string[];
  score: number;
}

export function WebSearchProviderComparison() {
  const [providers, setProviders] = useState<ProviderComparison[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'cost' | 'speed' | 'searches'>('score');

  useEffect(() => {
    loadProviders();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadProviders, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadProviders = () => {
    const providerIds: ProviderType[] = ['free', 'shared-serper', 'google', 'brave'];
    const comparisons: ProviderComparison[] = [];

    providerIds.forEach(id => {
      const provider = searchProviderRegistry.getProvider(id);
      const metadata = provider.getMetadata();
      const stats = provider.getStats();

      const successRate = stats.totalSearches > 0
        ? (stats.successfulSearches / stats.totalSearches) * 100
        : 0;

      // Calculate score (0-100)
      const score = calculateScore(stats, metadata.type);

      comparisons.push({
        id,
        name: metadata.name,
        type: metadata.type,
        stats: {
          totalSearches: stats.totalSearches,
          successRate,
          avgResponseTime: stats.averageResponseTime,
          estimatedCost: stats.estimatedCost
        },
        pricing: {
          model: metadata.pricing?.model || 'free',
          freeTier: metadata.pricing?.freeTier 
            ? `${metadata.pricing.freeTier.limit === -1 ? 'Unlimited' : metadata.pricing.freeTier.limit}/${metadata.pricing.freeTier.period}`
            : undefined,
          paidTier: metadata.pricing?.paidTier
            ? `$${metadata.pricing.paidTier.price}/${metadata.pricing.paidTier.period}`
            : undefined,
          costPerSearch: metadata.pricing?.costPerSearch
        },
        features: metadata.features,
        limitations: metadata.limitations || [],
        score
      });
    });

    // Sort providers
    comparisons.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'cost':
          return (a.pricing.costPerSearch || 0) - (b.pricing.costPerSearch || 0);
        case 'speed':
          return a.stats.avgResponseTime - b.stats.avgResponseTime;
        case 'searches':
          return b.stats.totalSearches - a.stats.totalSearches;
        default:
          return 0;
      }
    });

    setProviders(comparisons);
  };

  const calculateScore = (stats: any, type: 'free' | 'paid'): number => {
    let score = 0;

    // Success rate (40 points)
    if (stats.totalSearches > 0) {
      const successRate = (stats.successfulSearches / stats.totalSearches) * 100;
      score += (successRate / 100) * 40;
    }

    // Speed (30 points)
    if (stats.averageResponseTime > 0) {
      const speedScore = Math.max(0, 30 - (stats.averageResponseTime / 1000) * 10);
      score += speedScore;
    }

    // Cost efficiency (30 points)
    if (type === 'free') {
      score += 30; // Free providers get full points
    } else {
      // Lower cost = higher score
      const costScore = Math.max(0, 30 - stats.estimatedCost * 100);
      score += costScore;
    }

    return Math.round(Math.min(100, score));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-500' };
    if (score >= 80) return { label: 'Very Good', color: 'bg-green-400' };
    if (score >= 70) return { label: 'Good', color: 'bg-yellow-500' };
    if (score >= 60) return { label: 'Fair', color: 'bg-yellow-400' };
    return { label: 'Poor', color: 'bg-red-500' };
  };

  const getBestProvider = () => {
    if (providers.length === 0) return null;
    return providers[0];
  };

  const bestProvider = getBestProvider();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Provider Comparison
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Compare performance, cost, and features
          </p>
        </div>
        
        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm"
          >
            <option value="score">Overall Score</option>
            <option value="cost">Cost</option>
            <option value="speed">Speed</option>
            <option value="searches">Usage</option>
          </select>
        </div>
      </div>

      {/* Best Provider Highlight */}
      {bestProvider && bestProvider.stats.totalSearches > 0 && (
        <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Award className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold flex items-center gap-2">
                Recommended: {bestProvider.name}
                <span className={`text-xs px-2 py-0.5 ${getScoreBadge(bestProvider.score).color} text-white rounded-full`}>
                  {getScoreBadge(bestProvider.score).label}
                </span>
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Based on your usage patterns, this provider offers the best balance of performance, cost, and reliability.
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {bestProvider.stats.successRate.toFixed(1)}% success
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-blue-500" />
                  {Math.round(bestProvider.stats.avgResponseTime)}ms avg
                </span>
                {bestProvider.type === 'paid' && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    ${bestProvider.stats.estimatedCost.toFixed(4)} spent
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {providers.map(provider => {
          const badge = getScoreBadge(provider.score);
          
          return (
            <div 
              key={provider.id}
              className="border border-border rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 bg-muted/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{provider.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      provider.type === 'free'
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                      {provider.type}
                    </span>
                  </div>
                  
                  {/* Score Badge */}
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(provider.score)}`}>
                      {provider.score}
                    </div>
                    <div className={`text-xs px-2 py-0.5 ${badge.color} text-white rounded-full mt-1`}>
                      {badge.label}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="p-4 space-y-3">
                {/* Performance Metrics */}
                <div>
                  <h5 className="text-sm font-semibold mb-2">Performance</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Searches:</span>
                      <span className="font-medium">{provider.stats.totalSearches}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Success Rate:</span>
                      <span className="font-medium">{provider.stats.successRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Avg Speed:</span>
                      <span className="font-medium">
                        {provider.stats.avgResponseTime > 0 
                          ? `${Math.round(provider.stats.avgResponseTime)}ms`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <h5 className="text-sm font-semibold mb-2">Pricing</h5>
                  <div className="space-y-2 text-sm">
                    {provider.pricing.freeTier && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Free Tier:</span>
                        <span className="font-medium">{provider.pricing.freeTier}</span>
                      </div>
                    )}
                    {provider.pricing.paidTier && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Paid Tier:</span>
                        <span className="font-medium">{provider.pricing.paidTier}</span>
                      </div>
                    )}
                    {provider.pricing.costPerSearch !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Per Search:</span>
                        <span className="font-medium">${provider.pricing.costPerSearch.toFixed(4)}</span>
                      </div>
                    )}
                    {provider.type === 'paid' && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Spent:</span>
                        <span className="font-medium">${provider.stats.estimatedCost.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h5 className="text-sm font-semibold mb-2">Key Features</h5>
                  <ul className="space-y-1 text-sm">
                    {provider.features.slice(0, 3).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Limitations */}
                {provider.limitations.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold mb-2">Limitations</h5>
                    <ul className="space-y-1 text-sm">
                      {provider.limitations.slice(0, 2).map((limitation, i) => (
                        <li key={i} className="flex items-start gap-2 text-muted-foreground">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Matrix */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted/30">
          <h4 className="font-semibold">Feature Matrix</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Feature</th>
                {providers.map(p => (
                  <th key={p.id} className="px-4 py-3 text-center text-sm font-medium">
                    {p.name.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-sm">API Key Required</td>
                {providers.map(p => (
                  <td key={p.id} className="px-4 py-3 text-center">
                    {p.type === 'paid' ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm">Free Tier</td>
                {providers.map(p => (
                  <td key={p.id} className="px-4 py-3 text-center text-sm">
                    {p.pricing.freeTier || '-'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm">Avg Speed</td>
                {providers.map(p => (
                  <td key={p.id} className="px-4 py-3 text-center text-sm">
                    {p.stats.avgResponseTime > 0 
                      ? `${Math.round(p.stats.avgResponseTime)}ms`
                      : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm">Success Rate</td>
                {providers.map(p => (
                  <td key={p.id} className="px-4 py-3 text-center text-sm">
                    {p.stats.totalSearches > 0 
                      ? `${p.stats.successRate.toFixed(1)}%`
                      : 'N/A'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-4 border border-primary/30 rounded-lg bg-primary/5">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Recommendations
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Use <strong>Free Provider</strong> for unlimited searches at no cost</li>
          <li>• Use <strong>Serper API</strong> for fastest speeds and most affordable paid option ($0.001/search)</li>
          <li>• Use <strong>Google Custom Search</strong> for official Google results with 100 free searches/day</li>
          <li>• Use <strong>Brave Search</strong> for privacy-focused searches with good free tier</li>
          <li>• Enable <strong>Smart Selection</strong> to automatically choose the best provider</li>
        </ul>
      </div>
    </div>
  );
}
