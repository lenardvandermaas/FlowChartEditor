// Holds a graph, a set of nodes and edges. No data here on how to layout nodes and edges

export class Graph {
  readonly nodes: Node[] = []
  readonly nodesById: Map<string, Node> = new Map()
  readonly edges: Edge[] = []
  readonly edgesByKey: Map<string, Edge> = new Map()

  addNode(id: string, text: string, style: string) {
    if (this.nodesById.has(id)) {
      throw new Error(`Graph already has node with id [${id}]`)
    }
    if (id.includes('-')) {
      throw new Error(`Node id [${id}] is illegal because it contains '-'`)
    }
    const seq = this.nodes.length
    const node = new Node(seq, id, text, style)
    this.nodes.push(node)
    this.nodesById.set(id, node)
  }

  connect(from: Node, to: Node, text?: string) {
    const key = getEdgeKey(from, to);
    if (this.edgesByKey.has(key)) {
      throw new Error(`Graph cannot contain the same nodes multiple times, connection [${key}]`)
    }
    const seq = this.edges.length
    const edge = new Edge(seq, from, to, text)
    this.edges.push(edge)
    this.edgesByKey.set(key, edge)
  }
}

// Do not construct outside this file
export class Node {
  constructor(
    readonly sequence: number,
    readonly id: string,
    readonly text: string,
    readonly style: string
  ) {}
}

function getEdgeKey(from: Node, to: Node): string {
  return from.id + '-' + to.id;
}

// Do not construct outside this file
export class Edge {
  constructor(
    readonly seq: number,
    readonly from: Node,
    readonly to: Node,
    readonly text?: string
  ) {}
}