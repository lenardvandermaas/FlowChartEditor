// Holds a graph, a set of nodes and edges. No data here on how to layout nodes and edges

export interface Graph {
  getNodes(): Node[]
  getNodeById(id: string): Node | undefined
  getEdges(): Edge[]
  getEdgeByKey(id: string): Edge | undefined
}

export class ConcreteGraph implements Graph{
  private nodes: Node[] = []
  private nodesById: Map<string, Node> = new Map()
  private edges: Edge[] = []
  private edgesByKey: Map<string, Edge> = new Map()

  getNodes(): Node[] {
    return this.nodes
  }

  getNodeById(id: string): Node | undefined {
    return this.nodesById.get(id)
  }

  getEdges(): Edge[] {
    return this.edges
  }

  getEdgeByKey(key: string): Edge | undefined {
    return this.edgesByKey.get(key)
  }

  addNode(id: string, text: string, style: string) {
    if (this.nodesById.has(id)) {
      throw new Error(`Graph already has node with id [${id}]`)
    }
    if (id.includes('-')) {
      throw new Error(`Node id [${id}] is illegal because it contains '-'`)
    }
    const seq = this.nodes.length
    const node = new ConcreteNode(seq, id, text, style)
    this.nodes.push(node)
    this.nodesById.set(id, node)
  }

  connect(from: Node, to: Node, text?: string) {
    const key = getEdgeKey(from, to);
    if (this.edgesByKey.has(key)) {
      throw new Error(`Graph cannot contain the same nodes multiple times, connection [${key}]`)
    }
    const seq = this.edges.length
    const edge = new ConcreteEdge(seq, from, to, text)
    this.edges.push(edge)
    this.edgesByKey.set(key, edge)
  }
}

export interface Node {
  getId(): string
  // Intermediate nodes from the layering algorithm won't have text, so no getText method
}

export class ConcreteNode implements Node {
  constructor(
    readonly sequence: number,
    readonly id: string,
    readonly text: string,
    readonly style: string
  ) {}

  getId(): string {
    return this.id
  }
}

function getEdgeKey(from: Node, to: Node): string {
  return from.getId() + '-' + to.getId();
}

export interface Edge {
  getFrom(): Node
  getTo(): Node
}

export class ConcreteEdge implements Edge {
  constructor(
    readonly seq: number,
    readonly from: Node,
    readonly to: Node,
    readonly text?: string
  ) {}

  getFrom(): Node {
    return this.from
  }

  getTo(): Node {
    return this.to
  }
}