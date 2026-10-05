import { Handle, Position } from 'reactflow';
import { FileCode2, Route, Cog, Database, Boxes, AppWindow, Puzzle, ShieldCheck, Cloud, AlertTriangle } from 'lucide-react';

// One accent per architectural layer, so the graph reads as a map of the
// system rather than a pile of identical boxes. Colors stay inside the
// app's existing dark/indigo/cyan palette family. Keys here must match
// classifyNodeType()'s output in the backend's graph.manager.js.
const TYPE_STYLES = {
  entry: { icon: Boxes, ring: '#f472b6', glow: 'rgba(244,114,182,0.35)' },
  page: { icon: AppWindow, ring: '#fbbf24', glow: 'rgba(251,191,36,0.35)' },
  core: { icon: Puzzle, ring: '#38bdf8', glow: 'rgba(56,189,248,0.35)' },
  route: { icon: Route, ring: '#22d3ee', glow: 'rgba(34,211,238,0.35)' },
  middleware: { icon: ShieldCheck, ring: '#fb923c', glow: 'rgba(251,146,60,0.35)' },
  controller: { icon: FileCode2, ring: '#6366f1', glow: 'rgba(99,102,241,0.35)' },
  service: { icon: Cog, ring: '#a78bfa', glow: 'rgba(167,139,250,0.35)' },
  data: { icon: Database, ring: '#34d399', glow: 'rgba(52,211,153,0.35)' },
  external: { icon: Cloud, ring: '#94a3b8', glow: 'rgba(148,163,184,0.35)' },
};

// Impact-analysis highlight colors — intentionally separate from the type
// colors above so "what breaks" / "what this depends on" reads as its own
// visual language laid over the type colors, not confused with them.
const HIGHLIGHT_RING = {
  impacted: '#fb7185', // rose — "would break if this changes"
  dependsOn: '#60a5fa', // blue — "this relies on"
};

export default function GraphNode({ data }) {
  const style = TYPE_STYLES[data.type] || TYPE_STYLES.external;
  const Icon = style.icon;

  const isSelected = data.highlightState === 'selected';
  const isDimmed = data.highlightState === 'dimmed';
  const highlightRing = HIGHLIGHT_RING[data.highlightState];

  const ringColor = highlightRing || (isSelected ? style.ring : null);
  const importance = data.importance ?? 1; // 0.95–1.2, see GraphView's degree calc

  return (
    <div
      className="group relative rounded-2xl p-4 transition-all duration-300 cursor-pointer"
      style={{
        width: 256,
        background: 'rgba(22, 30, 46, 0.55)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${ringColor || 'rgba(255,255,255,0.09)'}`,
        boxShadow: ringColor
          ? `0 0 0 1px ${ringColor}, 0 8px 30px ${highlightRing ? `${highlightRing}55` : style.glow}`
          : '0 4px 20px rgba(0,0,0,0.25)',
        transform: `scale(${isSelected ? importance * 1.05 : importance})`,
        opacity: isDimmed ? 0.25 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: style.ring, width: 8, height: 8, border: 'none' }} />

      {data.isCritical && (
        <span
          className="absolute -top-2 -left-2 flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-rose-500/90 text-white shadow-lg"
          title={`${data.inDegree} files depend on this`}
        >
          <AlertTriangle size={9} /> Core
        </span>
      )}

      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-transform duration-300 group-hover:scale-110"
          style={{ background: `${style.ring}22`, color: style.ring }}
        >
          <Icon size={14} />
        </span>
        <span className="font-mono text-[13px] text-slate-100 truncate">{data.label}</span>
      </div>

      <p className="text-xs leading-relaxed text-slate-400 pl-9">{data.description}</p>

      <span
        className="absolute top-3 right-3 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ color: style.ring, border: `1px solid ${style.ring}55` }}
      >
        {data.type}
      </span>

      <Handle type="source" position={Position.Bottom} style={{ background: style.ring, width: 8, height: 8, border: 'none' }} />
    </div>
  );
}
