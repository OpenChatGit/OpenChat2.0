/**
 * WebSearchDashboard - Complete web search monitoring dashboard
 * 
 * Combines all monitoring components:
 * - Statistics overview
 * - Provider comparison
 * - Search history
 * - Quick actions
 */

import { useState } from 'react';
import { 
  BarChart3, 
  History, 
  Settings,
  TrendingUp
} from 'lucide-react';
import { WebSearchStatistics } from './WebSearchStatistics';
import { WebSearchProviderComparison } from './WebSearchProviderComparison';
import { WebSearchHistory } from './WebSearchHistory';

type Tab = 'overview' | 'comparison' | 'history';

export function WebSearchDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: TrendingUp },
    { id: 'comparison' as Tab, label: 'Comparison', icon: BarChart3 },
    { id: 'history' as Tab, label: 'History', icon: History }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Web Search Dashboard
        </h2>
        <p className="text-muted-foreground mt-1">
          Monitor search performance, costs, and usage
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <WebSearchStatistics />}
        {activeTab === 'comparison' && <WebSearchProviderComparison />}
        {activeTab === 'history' && <WebSearchHistory />}
      </div>
    </div>
  );
}
