/**
 * WebSearchHistory - Search history viewer with filtering and export
 * 
 * Features:
 * - View recent searches
 * - Filter by provider, date, cost
 * - Sort by various criteria
 * - Export to CSV/JSON
 * - Clear history
 * - Search details modal
 */

import { useState, useEffect } from 'react';
import { 
  History, 
  Download, 
  Trash2, 
  Search,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { 
  smartSearchManager,
  type SearchMetadata 
} from '../lib/web-search';

type SortField = 'time' | 'provider' | 'cost' | 'results' | 'quality';
type SortOrder = 'asc' | 'desc';

interface FilterOptions {
  provider?: string;
  minCost?: number;
  maxCost?: number;
  dateFrom?: Date;
  dateTo?: Date;
  quality?: 'low' | 'medium' | 'high';
}

export function WebSearchHistory() {
  const [history, setHistory] = useState<SearchMetadata[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<SearchMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [selectedSearch, setSelectedSearch] = useState<SearchMetadata | null>(null);

  // Load history
  useEffect(() => {
    refreshHistory();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(refreshHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...history];

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.providerId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filters
    if (filters.provider) {
      filtered = filtered.filter(item => item.provider === filters.provider);
    }

    if (filters.minCost !== undefined) {
      filtered = filtered.filter(item => item.cost >= filters.minCost!);
    }

    if (filters.maxCost !== undefined) {
      filtered = filtered.filter(item => item.cost <= filters.maxCost!);
    }

    if (filters.quality) {
      filtered = filtered.filter(item => item.quality === filters.quality);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'time':
          comparison = a.searchTime - b.searchTime;
          break;
        case 'provider':
          comparison = a.provider.localeCompare(b.provider);
          break;
        case 'cost':
          comparison = a.cost - b.cost;
          break;
        case 'results':
          comparison = a.resultCount - b.resultCount;
          break;
        case 'quality':
          const qualityOrder = { low: 0, medium: 1, high: 2 };
          comparison = qualityOrder[a.quality] - qualityOrder[b.quality];
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredHistory(filtered);
  }, [history, searchQuery, filters, sortField, sortOrder]);

  const refreshHistory = () => {
    const newHistory = smartSearchManager.getSearchHistory();
    setHistory(newHistory);
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all search history? This cannot be undone.')) {
      smartSearchManager.clearHistory();
      refreshHistory();
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ['Time', 'Provider', 'Results', 'Search Time (ms)', 'Cost ($)', 'Quality', 'Used Fallback'].join(','),
      ...filteredHistory.map(item => [
        new Date(item.searchTime).toISOString(),
        item.provider,
        item.resultCount,
        item.searchTime,
        item.cost.toFixed(4),
        item.quality,
        item.usedFallback
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(filteredHistory, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5" />
            Search History
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredHistory.length} of {history.length} searches
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportCSV}
            disabled={filteredHistory.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportJSON}
            disabled={filteredHistory.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleClearHistory}
            disabled={history.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by provider..."
          className="pl-10"
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-4">
          <h4 className="text-sm font-semibold">Filters</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Provider Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Provider</label>
              <select
                value={filters.provider || ''}
                onChange={(e) => setFilters({ ...filters, provider: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="">All Providers</option>
                <option value="DuckDuckGo (Free)">DuckDuckGo (Free)</option>
                <option value="Serper API">Serper API</option>
                <option value="Google Custom Search">Google Custom Search</option>
                <option value="Brave Search API">Brave Search API</option>
              </select>
            </div>

            {/* Quality Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Quality</label>
              <select
                value={filters.quality || ''}
                onChange={(e) => setFilters({ ...filters, quality: e.target.value as any || undefined })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="">All Qualities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Cost Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Max Cost ($)</label>
              <Input
                type="number"
                step="0.001"
                value={filters.maxCost || ''}
                onChange={(e) => setFilters({ ...filters, maxCost: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.01"
              />
            </div>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFilters({})}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* History Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('provider')}
                >
                  <div className="flex items-center gap-2">
                    Provider
                    <SortIcon field="provider" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('results')}
                >
                  <div className="flex items-center gap-2">
                    Results
                    <SortIcon field="results" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('time')}
                >
                  <div className="flex items-center gap-2">
                    Time
                    <SortIcon field="time" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('cost')}
                >
                  <div className="flex items-center gap-2">
                    Cost
                    <SortIcon field="cost" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('quality')}
                >
                  <div className="flex items-center gap-2">
                    Quality
                    <SortIcon field="quality" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Fallback
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {history.length === 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <History className="w-8 h-8 opacity-50" />
                        <p>No search history yet</p>
                        <p className="text-xs">Start searching to see history</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Filter className="w-8 h-8 opacity-50" />
                        <p>No searches match your filters</p>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setFilters({})}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item, index) => (
                  <tr 
                    key={index}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedSearch(item)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.provider}</span>
                        {item.usedFallback && (
                          <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full">
                            Fallback
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.resultCount}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.searchTime}ms
                    </td>
                    <td className="px-4 py-3 text-sm">
                      ${item.cost.toFixed(4)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium capitalize ${getQualityColor(item.quality)}`}>
                        {item.quality}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.usedFallback ? (
                        <span className="text-orange-600 dark:text-orange-400">✓</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Search Details Modal */}
      {selectedSearch && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedSearch(null)}
        >
          <div 
            className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold mb-4">Search Details</h4>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Provider:</span>
                <span className="font-medium">{selectedSearch.provider}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Provider ID:</span>
                <span className="font-mono text-xs">{selectedSearch.providerId}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Results:</span>
                <span className="font-medium">{selectedSearch.resultCount}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Search Time:</span>
                <span className="font-medium">{selectedSearch.searchTime}ms</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-medium">${selectedSearch.cost.toFixed(4)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quality:</span>
                <span className={`font-medium capitalize ${getQualityColor(selectedSearch.quality)}`}>
                  {selectedSearch.quality}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Used Fallback:</span>
                <span className="font-medium">
                  {selectedSearch.usedFallback ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <Button
              className="w-full mt-6"
              onClick={() => setSelectedSearch(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {filteredHistory.length > 0 && (
        <div className="p-4 border border-border rounded-lg bg-muted/30">
          <h4 className="text-sm font-semibold mb-3">Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Searches</p>
              <p className="text-lg font-bold">{filteredHistory.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Cost</p>
              <p className="text-lg font-bold">
                ${filteredHistory.reduce((sum, item) => sum + item.cost, 0).toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg Time</p>
              <p className="text-lg font-bold">
                {Math.round(filteredHistory.reduce((sum, item) => sum + item.searchTime, 0) / filteredHistory.length)}ms
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Fallbacks</p>
              <p className="text-lg font-bold">
                {filteredHistory.filter(item => item.usedFallback).length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
