import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ArrowLeft, Loader2, RefreshCw, Search } from 'lucide-react';
import GraphNode from '../components/GraphNode.jsx';
import GraphLegend from '../components/GraphLegend.jsx';
import NodeDetailPanel from '../components/NodeDetailPanel.jsx';
import { getGraph } from '../api.js';
import { getLayoutedElements } from '../utils/graphLayout.js';

const nodeTypes = { card: GraphNode };

const BASE_EDGE_STYLE = { type: 'smoothstep', animated: true, style: { stroke: '#6366f1', strokeWidth: 1.5, opacity: 0.6 } };
const IMPACT_EDGE_STYLE = { stroke: '#fb7185', strokeWidth: 2.5, opacity: 1 };
const DEPENDS_EDGE_STYLE = { stroke: '#60a5fa', strokeWidth: 2.5, opacity: 1 };
const DIMMED_EDGE_STYLE = { opacity: 0.08 };

/** Walks `adjacency` breadth-first from `startId`, returns every node reached (excluding start). */
function traverse(startId, adjacency) {
  const visited = new Set();
  const queue = [...(adjacency.get(startId) || [])];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    queue.push(...(adjacency.get(current) || []));
  }
  return visited;
}

function GraphViewInner() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const { setCenter, getNode } = useReactFlow();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawGraph, setRawGraph] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const loadGraph = async () => {
    setLoading(true);
    setError(null);
    setSelectedId(null);
    try {
      const data = await getGraph(repoId);
      setRawGraph(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]);

  // Adjacency maps + degree counts, recomputed only when the graph data itself changes.
  const { dependents, dependencies, inDegree, nodeById } = useMemo(() => {
    const dependentsMap = new Map(); // target -> [sources that import it]
    const dependenciesMap = new Map(); // source -> [targets it imports]
    const inDegreeMap = new Map();
    const byId = new Map();

    if (rawGraph) {
      rawGraph.nodes.forEach((n) => {
        byId.set(n.id, n);
        inDegreeMap.set(n.id, 0);
      });
      rawGraph.edges.forEach((e) => {
        if (!dependenciesMap.has(e.source)) dependenciesMap.set(e.source, []);
        dependenciesMap.get(e.source).push(e.target);

        if (!dependentsMap.has(e.target)) dependentsMap.set(e.target, []);
        dependentsMap.get(e.target).push(e.source);

        inDegreeMap.set(e.target, (inDegreeMap.get(e.target) || 0) + 1);
      });
    }

    return { dependents: dependentsMap, dependencies: dependenciesMap, inDegree: inDegreeMap, nodeById: byId };
  }, [rawGraph]);

  // What this selection means: "impacted" = files that would break (upstream,
  // walking dependents); "dependsOn" = files this one relies on (downstream).
  const { impactedIds, dependsOnIds } = useMemo(() => {
    if (!selectedId) return { impactedIds: new Set(), dependsOnIds: new Set() };
    return {
      impactedIds: traverse(selectedId, dependents),
      dependsOnIds: traverse(selectedId, dependencies),
    };
  }, [selectedId, dependents, dependencies]);

  const maxInDegree = useMemo(() => Math.max(1, ...[...inDegree.values()]), [inDegree]);

  // Rebuild React Flow's node/edge arrays whenever the graph data OR the
  // current selection changes — selection only changes styling, not layout,
  // so positions are computed once per graph load, not on every click.
  useEffect(() => {
    if (!rawGraph) return;

    const flowNodes = rawGraph.nodes.map((n) => {
      const degree = inDegree.get(n.id) || 0;
      const isCritical = degree >= 3;
      const importance = 0.95 + Math.min(degree / maxInDegree, 1) * 0.25; // 0.95–1.2

      let highlightState = null;
      if (selectedId) {
        if (n.id === selectedId) highlightState = 'selected';
        else if (impactedIds.has(n.id)) highlightState = 'impacted';
        else if (dependsOnIds.has(n.id)) highlightState = 'dependsOn';
        else highlightState = 'dimmed';
      }

      return {
        id: n.id,
        type: 'card',
        data: { label: n.label, type: n.type, description: n.description, isCritical, inDegree: degree, importance, highlightState },
        position: { x: 0, y: 0 }, // overwritten by dagre
      };
    });

    const flowEdges = rawGraph.edges.map((e, i) => {
      let extraStyle = {};
      if (selectedId) {
        const touchesSelection =
          (e.source === selectedId && dependsOnIds.has(e.target)) ||
          (e.target === selectedId && impactedIds.has(e.source)) ||
          e.source === selectedId || e.target === selectedId;

        if (e.target === selectedId || (impactedIds.has(e.source) && impactedIds.has(e.target)) || (e.source === selectedId)) {
          extraStyle = e.target === selectedId || impactedIds.has(e.source) ? IMPACT_EDGE_STYLE : {};
        }
        if (e.source === selectedId || (dependsOnIds.has(e.source) && dependsOnIds.has(e.target))) {
          extraStyle = dependsOnIds.has(e.target) ? DEPENDS_EDGE_STYLE : extraStyle;
        }
        if (!touchesSelection) extraStyle = DIMMED_EDGE_STYLE;
      }

      return {
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        ...BASE_EDGE_STYLE,
        style: { ...BASE_EDGE_STYLE.style, ...extraStyle },
      };
    });

    // Only re-run the layout algorithm on a fresh graph load, not on every
    // selection change — re-laying-out on click would be jarring (nodes
    // jumping around just because you clicked one).
    setNodes((prevNodes) => {
      const needsLayout = prevNodes.length === 0 || prevNodes.length !== flowNodes.length;
      if (needsLayout) {
        const layouted = getLayoutedElements(flowNodes, flowEdges);
        return layouted.nodes;
      }
      // Keep existing positions, just swap in the new data/highlight state.
      const posById = new Map(prevNodes.map((n) => [n.id, n.position]));
      return flowNodes.map((n) => ({ ...n, position: posById.get(n.id) || { x: 0, y: 0 } }));
    });
    setEdges(flowEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawGraph, selectedId]);

  const handleNodeClick = useCallback((_, node) => {
    setSelectedId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const handleExplain = () => {
    const node = nodeById.get(selectedId);
    if (!node) return;
    navigate(`/workspace/${repoId}`, {
      state: { prefillQuestion: `What does ${node.label} do and how is it used elsewhere in the codebase?` },
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchTerm.trim().toLowerCase();
    if (!term || !rawGraph) return;
    const match = rawGraph.nodes.find((n) => n.label.toLowerCase().includes(term) || n.id.toLowerCase().includes(term));
    if (!match) return;

    setSelectedId(match.id);
    const flowNode = getNode(match.id);
    if (flowNode) {
      setCenter(flowNode.position.x + 128, flowNode.position.y + 46, { zoom: 0.9, duration: 500 });
    }
  };

  const selectedNodeData = selectedId ? rawGraph?.nodes.find((n) => n.id === selectedId) : null;

  return (
    <div className="h-screen flex flex-col bg-base">
      <header className="flex flex-col gap-2 px-4 py-3 border-b border-border bg-surface shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link to={`/workspace/${repoId}`} className="text-muted hover:text-slate-100">
            <ArrowLeft size={18} />
          </Link>
          <span className="text-sm text-slate-200 font-medium truncate">Dependency graph</span>
          {rawGraph && (
            <span className="text-xs text-muted ml-1">
              {rawGraph.nodes.length} files · {rawGraph.edges.length} connections
            </span>
          )}

          <form onSubmit={handleSearch} className="ml-auto flex items-center gap-1.5 bg-base border border-border rounded-lg px-2.5 py-1">
            <Search size={12} className="text-muted" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Jump to file..."
              className="bg-transparent outline-none text-xs placeholder:text-muted w-32"
            />
          </form>

          <button
            onClick={loadGraph}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:border-accent text-muted hover:text-slate-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {rawGraph?.overview?.summary && (
          <p className="text-xs text-muted max-w-3xl leading-relaxed">{rawGraph.overview.summary}</p>
        )}
        {rawGraph?.overview?.techStack?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {rawGraph.overview.techStack.map((tech) => (
              <span key={tech} className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted">
                {tech}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 relative">
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[140px]" />
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted text-sm z-10">
            <Loader2 size={16} className="animate-spin" /> Building graph...
          </div>
        )}

        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-red-400 z-10 px-6 text-center">
            {error}
          </div>
        )}

        {!loading && !error && rawGraph?.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-sm z-10 px-6 text-center">
            No dependency edges detected for this repo — it may not use relative
            imports/requires, or hasn't finished indexing yet.
          </div>
        )}

        {!loading && !error && rawGraph?.nodes.length > 0 && (
          <>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              onPaneClick={() => setSelectedId(null)}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.15}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#242f45" />
              <Controls
                className="!bg-surface !border !border-border !rounded-xl !overflow-hidden [&>button]:!bg-surface [&>button]:!border-border [&>button]:!text-slate-300 [&>button:hover]:!bg-white/5"
              />
              <MiniMap
                className="!bg-surface !border !border-border !rounded-xl"
                maskColor="rgba(15, 23, 42, 0.75)"
                nodeColor="#6366f1"
                nodeStrokeWidth={0}
              />
            </ReactFlow>

            <GraphLegend hasSelection={!!selectedId} />

            <NodeDetailPanel
              node={selectedNodeData}
              impactedPaths={[...impactedIds]}
              dependsOnPaths={[...dependsOnIds]}
              onClose={() => setSelectedId(null)}
              onExplain={handleExplain}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ReactFlowProvider is required for useReactFlow() (used for search/jump-to-node).
export default function GraphView() {
  return (
    <ReactFlowProvider>
      <GraphViewInner />
    </ReactFlowProvider>
  );
}
