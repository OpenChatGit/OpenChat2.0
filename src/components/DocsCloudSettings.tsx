import { Shield, Zap, Server, Lock, Code, Cpu, Activity, Globe } from 'lucide-react';

export function DocsCloudSettings() {
  return (
    <div className="max-w-4xl space-y-10 pb-12">
      <div className="space-y-2 border-l-2 border-primary pl-6 py-1">
        <h3 className="text-2xl font-bold tracking-tight uppercase">
          Technical Concept: <br />
          Local & Cloud Integration
        </h3>
        <p className="text-xs font-mono text-muted-foreground uppercase">
          Documentation // Status: April 2026
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          <h4 className="text-lg font-bold">Cloud Model Usage</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <h5 className="font-bold text-sm uppercase text-primary">Data Freshness & VRAM</h5>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Local models are loaded into GPU memory (VRAM). Once initialized, their basic parameters are static. To obtain current records without retraining the model, external data sources such as cloud search are utilized.
            </p>
          </div>
          <div className="space-y-2">
            <h5 className="font-bold text-sm uppercase text-primary">Web Search & Formatting</h5>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Local search engines like SearXNG often include substantial "noise" (menus, ads) in the HTML code. Specialized web search providers pre-filter this data and deliver structured text that models can process efficiently.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h4 className="text-lg font-bold uppercase tracking-tight">Data Processing</h4>
        </div>
        <div className="p-6 border border-border bg-card/20 rounded-sm space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
             A key aspect of local search is the computational effort required for parsing website data.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-sm border-l-2 border-gray-400">
              <span className="text-[10px] font-bold uppercase block mb-1">Standard Search</span>
              <p className="text-xs text-muted-foreground">Often returns unstructured text containing irrelevant data. This may affect the accuracy of the AI.</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-sm border-l-2 border-gray-400">
              <span className="text-[10px] font-bold uppercase block mb-1">AI-Optimized Search</span>
              <p className="text-xs text-muted-foreground">Structured JSON data, pre-filtered content, and relevance ranking for stable processing within context windows.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Activity,
            title: "Performance",
            desc: "Cloud models can be operated on large GPU clusters to handle complex tasks that may exceed local hardware capacity."
          },
          {
            icon: Globe,
            title: "Data Recency",
            desc: "Information is retrieved in real-time via cloud APIs instead of relying on legacy model data from previous years."
          },
          {
            icon: Code,
            title: "Tool Integration",
            desc: "Integrating tools such as search, code interpreters, or mathematics APIs often requires server-side logic."
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
          <Shield className="w-5 h-5 text-primary" />
          <h4 className="text-lg font-bold">Privacy & Isolation</h4>
        </div>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            To maintain privacy, requests are handled in isolation:
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex gap-4 p-4 bg-background border border-border rounded-sm">
              <div className="flex-shrink-0 text-primary font-mono text-xs">[01]</div>
              <div className="space-y-1">
                <p className="text-sm font-bold uppercase tracking-tight">Query Isolation</p>
                <p className="text-xs text-muted-foreground">Only the specific search query is exported. Personal data or history remains locally stored.</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 bg-background border border-border rounded-sm">
              <div className="flex-shrink-0 text-primary font-mono text-xs">[02]</div>
              <div className="space-y-1">
                <p className="text-sm font-bold uppercase tracking-tight">Transaction-Based</p>
                <p className="text-xs text-muted-foreground">Requests are treated as one-off transactions. No session cookies or identifiers are shared with search providers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
