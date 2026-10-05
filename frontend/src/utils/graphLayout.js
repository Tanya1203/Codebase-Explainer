import dagre from '@dagrejs/dagre';

const NODE_WIDTH = 256; // matches the w-64 card in GraphNode.jsx
const NODE_HEIGHT = 92; // approximate rendered height

/**
 * Runs a hierarchical (top-to-bottom) auto-layout over arbitrary
 * nodes/edges using dagre. Needed because real repos produce graphs of
 * unknown shape/size — hardcoded x/y coordinates only work for a fixed demo.
 *
 * @param {Array} nodes - React Flow nodes (position will be overwritten)
 * @param {Array} edges - React Flow edges
 * @param {'TB'|'LR'} direction - top-to-bottom or left-to-right
 */
export function getLayoutedElements(nodes, edges, direction = 'TB') {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 110 });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    const { x, y } = graph.node(node.id);
    return {
      ...node,
      // dagre gives center coordinates, React Flow wants top-left
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}
