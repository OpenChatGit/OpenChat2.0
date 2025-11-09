/**
 * WebSearchProviderSettings - Provider configuration UI
 * 
 * Allows users to:
 * - Select default search provider
 * - Configure API keys for paid providers
 * - Test provider connections
 * - View usage statistics
 * - Enable/disable providers
 */

import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Toggle } from './ui/Toggle';
import { ApiUsageDisplay } from './ApiUsageDisplay';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  providerSettingsManager,
  searchProviderRegistry,
  type ProviderType 
} from '../lib/web-search';

interface ProviderCardProps {
  id: ProviderType;
  isDefault: boolean;
  onSetDefault: () => void;
}

function ProviderCard({ id, isDefault, onSetDefault }: ProviderCardProps) {
  const provider = searchProviderRegistry.getProvider(id);
  const metadata = provider.getMetadata();
  const stats = provider.getStats();
  const settings = providerSettingsManager.getSettings();
  const providerSettings = settings.providers[id as keyof typeof settings.providers];
  
  const [isEnabled, setIsEnabled] = useState(providerSettings.enabled);
  const [apiKey, setApiKey] = useState(providerSettings.config.apiKey || '');
  const [searchEngineId, setSearchEngineId] = useState(providerSettings.config.searchEngineId || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync enabled state with settings
  useEffect(() => {
    setIsEnabled(providerSettings.enabled);
  }, [providerSettings.enabled]);

  // Sync API key with settings
  useEffect(() => {
    setApiKey(providerSettings.config.apiKey || '');
  }, [providerSettings.config.apiKey]);

  // Sync Search Engine ID with settings
  useEffect(() => {
    setSearchEngineId(providerSettings.config.searchEngineId || '');
  }, [providerSettings.config.searchEngineId]);

  const handleToggleEnabled = (checked: boolean) => {
    setIsEnabled(checked);
    providerSettingsManager.setProviderEnabled(id, checked);
  };

  const handleSaveConfig = () => {
    const config: any = {};
    
    if (apiKey) {
      config.apiKey = apiKey;
    }
    
    if (searchEngineId) {
      config.searchEngineId = searchEngineId;
    }
    
    providerSettingsManager.updateProviderConfig(id, config);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Save config first
      handleSaveConfig();
      
      // Test connection
      const success = await providerSettingsManager.testProvider(id);
      setTestResult(success ? 'success' : 'error');
    } catch (error) {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };



  return (
    <div className={`border rounded-lg overflow-hidden ${
      isDefault ? 'border-primary ring-2 ring-primary/20' : 'border-border'
    }`}>
      {/* Header */}
      <div className="p-4 bg-muted/30">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{metadata.name}</h4>
              {isDefault && (
                <span className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded-full">
                  Default
                </span>
              )}
              {metadata.type === 'free' && (
                <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                  Free
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {metadata.description}
            </p>
          </div>
          
          <Toggle
            checked={isEnabled}
            onChange={handleToggleEnabled}
          />
        </div>

        {/* Quick Stats */}
        {isEnabled && (
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Search className="w-3 h-3" />
              <span>{stats.totalSearches} searches</span>
            </div>
            {metadata.type === 'paid' && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span>${stats.estimatedCost.toFixed(4)}</span>
              </div>
            )}
            {stats.averageResponseTime > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{Math.round(stats.averageResponseTime)}ms</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isEnabled && (
        <div className="p-4 space-y-4">
          {/* API Key Configuration */}
          {provider.requiresApiKey && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">API Key</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your API key"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={!apiKey || isTesting}
                  >
                    {isTesting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
                
                {/* Test Result */}
                {testResult && (
                  <div className={`mt-2 flex items-center gap-2 text-sm ${
                    testResult === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {testResult === 'success' ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Connection successful!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Connection failed. Check your API key.</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Search Engine ID (Google only) */}
              {id === 'google' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Search Engine ID</label>
                  <Input
                    value={searchEngineId}
                    onChange={(e) => setSearchEngineId(e.target.value)}
                    placeholder="Enter your Search Engine ID (cx parameter)"
                  />
                </div>
              )}

              {/* Save Button */}
              <Button
                size="sm"
                onClick={handleSaveConfig}
                disabled={!apiKey || (id === 'google' && !searchEngineId)}
              >
                Save Configuration
              </Button>
            </div>
          )}

          {/* Real-Time API Usage Display */}
          {metadata.type === 'paid' && providerSettings.config.apiKey && (
            <div className="p-4 border border-border rounded-lg bg-muted/30">
              <ApiUsageDisplay 
                providerId={id} 
                autoRefresh={true}
                refreshInterval={60}
              />
            </div>
          )}
          
          {/* Shared Provider Usage (always show for shared-serper) */}
          {id === 'shared-serper' && (
            <div className="p-4 border border-border rounded-lg bg-muted/30">
              <ApiUsageDisplay 
                providerId={id} 
                autoRefresh={true}
                refreshInterval={30}
              />
            </div>
          )}

          {/* Pricing Info */}
          {metadata.pricing && (
            <div className="text-xs space-y-1 p-3 bg-muted/50 rounded">
              <div className="font-medium mb-1">Pricing</div>
              {metadata.pricing.freeTier && (
                <div className="text-muted-foreground">
                  Free: {metadata.pricing.freeTier.limit === -1 ? 'Unlimited' : 
                    `${metadata.pricing.freeTier.limit} searches/${metadata.pricing.freeTier.period}`}
                </div>
              )}
              {metadata.pricing.paidTier && (
                <div className="text-muted-foreground">
                  Paid: ${metadata.pricing.paidTier.price}/{metadata.pricing.paidTier.period} 
                  ({metadata.pricing.paidTier.limit} searches)
                </div>
              )}
              {metadata.pricing.costPerSearch && (
                <div className="text-muted-foreground">
                  Cost per search: ${metadata.pricing.costPerSearch.toFixed(4)}
                </div>
              )}
            </div>
          )}

          {/* Features & Limitations */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-primary hover:underline"
          >
            {isExpanded ? 'Hide' : 'Show'} details
          </button>

          {isExpanded && (
            <div className="space-y-3 text-sm">
              {/* Features */}
              <div>
                <div className="font-medium mb-2">Features</div>
                <ul className="space-y-1 text-muted-foreground">
                  {metadata.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Limitations */}
              {metadata.limitations && metadata.limitations.length > 0 && (
                <div>
                  <div className="font-medium mb-2">Limitations</div>
                  <ul className="space-y-1 text-muted-foreground">
                    {metadata.limitations.map((limitation, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span>{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Documentation Link */}
              {metadata.documentationUrl && (
                <a
                  href={metadata.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <span>Documentation</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Set as Default Button */}
          {!isDefault && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onSetDefault}
              className="w-full"
            >
              Set as Default Provider
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function WebSearchProviderSettings() {
  const [settings, setSettings] = useState(providerSettingsManager.getSettings());
  const [autoFallback, setAutoFallback] = useState(settings.autoFallback);
  const [smartSelection, setSmartSelection] = useState(settings.smartSelection);
  const [showFreeProviders, setShowFreeProviders] = useState(true);
  const [showPremiumProviders, setShowPremiumProviders] = useState(true);

  // Refresh settings when they change
  useEffect(() => {
    const interval = setInterval(() => {
      setSettings(providerSettingsManager.getSettings());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSetDefault = (id: ProviderType) => {
    providerSettingsManager.setDefaultProvider(id);
    setSettings(providerSettingsManager.getSettings());
  };

  const handleAutoFallbackChange = (checked: boolean) => {
    setAutoFallback(checked);
    providerSettingsManager.setAutoFallback(checked);
  };

  const handleSmartSelectionChange = (checked: boolean) => {
    setSmartSelection(checked);
    providerSettingsManager.setSmartSelection(checked);
  };

  // Group providers by type
  const freeProviders: ProviderType[] = ['free', 'shared-serper'];
  const premiumProviders: ProviderType[] = ['serper', 'google', 'brave'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Search Provider Configuration</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure search providers and API keys
        </p>
      </div>

      {/* Advanced Options */}
      <div className="p-4 border border-border rounded-lg space-y-4">
        <h4 className="text-sm font-semibold">Advanced Options</h4>
        
        {/* Auto Fallback */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Auto-Fallback</label>
            <p className="text-xs text-muted-foreground mt-1">
              Automatically use free provider if paid provider fails
            </p>
          </div>
          <Toggle
            checked={autoFallback}
            onChange={handleAutoFallbackChange}
          />
        </div>

        {/* Smart Selection */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Smart Provider Selection</label>
            <p className="text-xs text-muted-foreground mt-1">
              Automatically choose best provider based on query complexity
            </p>
          </div>
          <Toggle
            checked={smartSelection}
            onChange={handleSmartSelectionChange}
          />
        </div>
      </div>

      {/* Free Providers Section */}
      <div className="space-y-4">
        <button
          onClick={() => setShowFreeProviders(!showFreeProviders)}
          className="w-full flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Free Providers</h4>
            <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
              No API Key Required
            </span>
          </div>
          {showFreeProviders ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </button>
        
        {showFreeProviders && (
          <div className="space-y-4 pl-2">
            {freeProviders.map((id) => (
              <ProviderCard
                key={id}
                id={id}
                isDefault={settings.defaultProvider === id}
                onSetDefault={() => handleSetDefault(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Premium Providers Section */}
      <div className="space-y-4">
        <button
          onClick={() => setShowPremiumProviders(!showPremiumProviders)}
          className="w-full flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Premium Providers</h4>
            <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-medium">
              ⭐ Premium
            </span>
          </div>
          {showPremiumProviders ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </button>
        
        {showPremiumProviders && (
          <div className="space-y-4 pl-2">
            {premiumProviders.map((id) => (
              <ProviderCard
                key={id}
                id={id}
                isDefault={settings.defaultProvider === id}
                onSetDefault={() => handleSetDefault(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 border border-blue-500/30 rounded-lg bg-blue-500/5">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <AlertCircle className="w-4 h-4" />
          API Calls via Tauri Backend
        </h4>
        <p className="text-sm text-muted-foreground mb-2">
          All search provider API calls are routed through the Tauri Rust backend to bypass browser CORS restrictions.
        </p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Free Provider (DuckDuckGo)</strong> - Works immediately, no API key needed</li>
          <li>• <strong>Paid Providers</strong> - Require valid API keys for testing and usage</li>
          <li>• All API calls are proxied through Rust backend for security</li>
          <li>• Connection testing validates your API keys</li>
        </ul>
      </div>

      {/* Info Box */}
      <div className="p-4 border border-primary/30 rounded-lg bg-primary/5">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Cost Optimization Tips
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Enable Smart Selection to use free provider for simple queries</li>
          <li>• Enable Auto-Fallback to ensure searches always work</li>
          <li>• Monitor usage statistics to track API costs</li>
          <li>• Use free provider as default for unlimited searches</li>
        </ul>
      </div>

      {/* Danger Zone */}
      <div className="p-4 border border-red-500/30 rounded-lg bg-red-500/5 space-y-3">
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            Danger Zone
          </h4>
          <p className="text-sm text-muted-foreground">
            Manage sensitive data and reset configurations. These actions cannot be undone.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Clear API Keys */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (confirm('⚠️ Clear All API Keys?\n\nThis will:\n• Remove all configured API keys\n• Keep other settings intact\n• Disable all paid providers\n\nYou will need to re-enter API keys to use paid providers again.\n\nContinue?')) {
                // Clear API keys for all providers
                const providers: Array<'serper' | 'google' | 'brave'> = ['serper', 'google', 'brave'];
                providers.forEach(id => {
                  providerSettingsManager.updateProviderConfig(id, {});
                  providerSettingsManager.setProviderEnabled(id, false);
                });
                setSettings(providerSettingsManager.getSettings());
                alert('✓ All API keys have been cleared.');
              }
            }}
            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Clear API Keys
          </Button>

          {/* Reset All Settings */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (confirm('⚠️ Reset All Settings?\n\nThis will:\n• Remove all API keys\n• Reset all providers to defaults\n• Clear usage statistics\n• Reset auto-fallback and smart selection\n• Set Free Provider as default\n\nThis action cannot be undone!\n\nContinue?')) {
                providerSettingsManager.resetToDefaults();
                setSettings(providerSettingsManager.getSettings());
                alert('✓ All settings have been reset to defaults.');
              }
            }}
            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Reset All Settings
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Tip: Export your settings before resetting to create a backup.
        </p>
      </div>
    </div>
  );
}
