import { Zap, Coins, BarChart3, TrendingUp, ShieldCheck, Activity } from 'lucide-react';

export function DocsPricingSettings() {
  return (
    <div className="max-w-4xl space-y-10 pb-12">
      <div className="space-y-2 border-l-2 border-primary pl-6 py-1">
        <h3 className="text-2xl font-bold tracking-tight uppercase">
          Pricing Model & Cost Calculation
        </h3>
        <p className="text-xs font-mono text-muted-foreground uppercase">
          Documentation // Status: April 2026
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" />
          <h4 className="text-lg font-bold">Model Aggregation</h4>
        </div>
        <div className="p-6 border border-border bg-card/20 rounded-sm space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            This system uses OpenRouter to distribute requests across multiple providers (e.g., DeepInfra, Together, Fireworks). This ensures that a model remains available even if a single provider fails.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <h5 className="font-bold text-[11px] uppercase text-primary">Weighted Average</h5>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The app displays the weighted average price of all active providers for a model. This value provide a more realistic cost estimate compared to only showing the minimum price of a single provider.
              </p>
            </div>
            <div className="space-y-1">
              <h5 className="font-bold text-[11px] uppercase text-primary">Token-Based Billing</h5>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Billing occurs per 1 million tokens. Input (your message) and Output (AI response) are calculated separately. One token equals approximately 0.75 words.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: BarChart3,
            title: "Token Measurement",
            desc: "Costs are tracked per 1M tokens. A 1M token package corresponds to roughly 750,000 words."
          },
          {
            icon: TrendingUp,
            title: "Price Updates",
            desc: "Prices in the frontend are updated every 5 minutes to reflect changes among providers."
          },
          {
            icon: ShieldCheck,
            title: "Individual Billing",
            desc: "Each request is audited via the generation API after completion to debit the exact amount from your balance."
          }
        ].map((item, i) => (
          <div key={i} className="p-5 border border-border bg-card/20 rounded-sm space-y-2">
            <item.icon className="w-4 h-4 text-primary" />
            <h5 className="font-bold text-xs uppercase">{item.title}</h5>
            <p className="text-xs text-muted-foreground leading-normal">{item.desc}</p>
          </div>
        ))}
      </div>

      <section className="p-6 border border-border bg-primary/5 rounded-sm space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h4 className="text-lg font-bold uppercase tracking-tight">Price Variations</h4>
        </div>
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Why do prices sometimes deviate from the lowest possible value?
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 bg-background border border-border rounded-sm">
              <p className="text-sm font-bold uppercase tracking-tight mb-1">Provider Weighting</p>
              <p className="text-xs text-muted-foreground">The weighted average considers the capacity each provider offers. A provider with high capacity impacts the average more than a provider with low capacity.</p>
            </div>
            <div className="p-4 bg-background border border-border rounded-sm">
              <p className="text-sm font-bold uppercase tracking-tight mb-1">Routing Integrity</p>
              <p className="text-xs text-muted-foreground">If the cheapest provider fails, the next best available provider is automatically selected. Displaying the average price helps account for these market fluctuations.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
