import { X, MessageSquareText, AlertTriangle, ArrowDownToLine } from 'lucide-react';

export default function NodeDetailPanel({ node, impactedPaths, dependsOnPaths, onClose, onExplain }) {
  if (!node) return null;

  return (
    <div className="absolute top-4 right-4 z-10 w-80 max-h-[calc(100%-2rem)] overflow-y-auto bg-surface/95 backdrop-blur-sm border border-border rounded-xl p-4 text-sm">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-mono text-slate-100 break-all">{node.label}</span>
        <button onClick={onClose} className="text-muted hover:text-slate-100 shrink-0">
          <X size={15} />
        </button>
      </div>
      <p className="text-xs text-muted mb-3">{node.description}</p>

      <button
        onClick={onExplain}
        className="w-full flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors mb-4"
      >
        <MessageSquareText size={13} /> Explain this file
      </button>

      <div className="mb-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-rose-400 mb-1.5">
          <AlertTriangle size={12} />
          {impactedPaths.length} file{impactedPaths.length === 1 ? '' : 's'} would be affected
        </div>
        {impactedPaths.length === 0 ? (
          <p className="text-xs text-muted pl-[18px]">Nothing else depends on this file.</p>
        ) : (
          <ul className="space-y-0.5 pl-[18px]">
            {impactedPaths.map((p) => (
              <li key={p} className="text-xs text-muted truncate font-mono">{p}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400 mb-1.5">
          <ArrowDownToLine size={12} />
          Depends on {dependsOnPaths.length} file{dependsOnPaths.length === 1 ? '' : 's'}
        </div>
        {dependsOnPaths.length === 0 ? (
          <p className="text-xs text-muted pl-[18px]">This file has no internal dependencies.</p>
        ) : (
          <ul className="space-y-0.5 pl-[18px]">
            {dependsOnPaths.map((p) => (
              <li key={p} className="text-xs text-muted truncate font-mono">{p}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
