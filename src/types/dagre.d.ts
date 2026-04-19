declare module 'dagre' {
  namespace graphlib {
    class Graph {
      setDefaultEdgeLabel(fn: () => Record<string, unknown>): void;
      setGraph(opts: {
        rankdir?: string;
        ranksep?: number;
        nodesep?: number;
        marginx?: number;
        marginy?: number;
      }): void;
      setNode(id: string, opts: { width: number; height: number }): void;
      setEdge(source: string, target: string): void;
      node(id: string): { x: number; y: number; width: number; height: number };
    }
  }

  function layout(graph: graphlib.Graph): void;
}
