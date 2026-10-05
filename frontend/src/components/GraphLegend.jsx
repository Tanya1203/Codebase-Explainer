const TYPE_LEGEND = [
  { type: 'entry', label: 'Entry point', color: '#f472b6' },
  { type: 'route', label: 'Route', color: '#22d3ee' },
  { type: 'middleware', label: 'Middleware', color: '#fb923c' },
  { type: 'controller', label: 'Controller', color: '#6366f1' },
  { type: 'service', label: 'Service', color: '#a78bfa' },
  { type: 'data', label: 'Data/model', color: '#34d399' },
  { type: 'page', label: 'Page', color: '#fbbf24' },
  { type: 'core', label: 'Core/config', color: '#38bdf8' },
  { type: 'external', label: 'Other', color: '#94a3b8' },
];

export default function GraphLegend({ hasSelection }) {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-surface/90 backdrop-blur-sm border border-border rounded-xl p-3 text-xs max-w-[220px]">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
        {TYPE_LEGEND.map((item) => (
          <div key={item.type} className="flex items-center gap-1.5 text-muted">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
      <div className="h-px bg-border my-2" />
      {hasSelection ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#fb7185' }} />
            Would break if changed
          </div>
          <div className="flex items-center gap-1.5 text-muted">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#60a5fa' }} />
            This depends on
          </div>
        </div>
      ) : (
        <p className="text-muted">Click a node to see its impact</p>
      )}
    </div>
  );
}
