// Holds a graph, a set of nodes and edges. No data here on how to layout nodes and edges

export interface GraphBase {
  getNodes(): readonly Node[]
  getNodeById(id: string): Node | undefined
  getEdges(): readonly Edge[]
  getEdgeByKey(id: string): Edge | undefined
}

export interface Graph extends GraphBase {
  getOrderedEdgesStartingFrom(startNode: Node): readonly Edge[]
  getOrderedEdgesLeadingTo(endNode: Node): readonly Edge[]
  getSuccessors(node: Node): readonly Node[]
  getPredecessors(node: Node): readonly Node[]
}

export class ConcreteGraphBase implements GraphBase {
  private nodes: Node[] = []
  private nodesById: Map<string, Node> = new Map()
  private edges: Edge[] = []
  private edgesByKey: Map<string, Edge> = new Map()

  getNodes(): readonly Node[] {
    return this.nodes
  }

  getNodeById(id: string): Node | undefined {
    return this.nodesById.get(id)
  }

  getEdges(): readonly Edge[] {
    return this.edges
  }

  getEdgeByKey(key: string): Edge | undefined {
    return this.edgesByKey.get(key)
  }

  addNode(id: string, text: string, style: string) {
    if (id.includes('-')) {
      throw new Error(`Node id [${id}] is illegal because it contains '-'`)
    }
    const seq = this.nodes.length
    const node = new ConcreteNode(seq, id, text, style)
    this.addExistingNode(node)
  }

  addExistingNode(node: Node) {
    let id = node.getId()
    if(this.nodesById.has(id)) {
      throw new Error(`Cannot put node with id ${id} because this id is already present`)
    }
    this.nodes.push(node)
    this.nodesById.set(id, node)
  }
  connect(from: Node, to: Node, text?: string) {
    const key = getEdgeKey(from, to);
    const seq = this.edges.length
    const edge = new ConcreteEdge(seq, from, to, text)
    this.addEdge(edge)
  }

  addEdge(existingEdge: Edge) {
    this.checkEdgeRefersToExistingNodes(existingEdge)
    let key: string = getEdgeKey(existingEdge.getFrom(), existingEdge.getTo())
    if (this.edgesByKey.has(key)) {
      throw new Error(`Cannot add existing edge with key ${key} because that connection is present already`)
    }
    this.edges.push(existingEdge)
    this.edgesByKey.set(key, existingEdge)
  }

  private checkEdgeRefersToExistingNodes(edge: Edge) {
    let key = getEdgeKey(edge.getFrom(), edge.getTo())
    if (! this.nodesById.has(edge.getFrom().getId())) {
      throw new Error(`Illegal edge with key ${key} because referred from node is not in this graph`)
    }
    if( ! this.nodesById.has(edge.getTo().getId())) {
      throw new Error(`Illegal edge with key ${key} because referred to node is not in this graph`)
    }
  }
}

export class GraphConnectionsDecorator implements Graph {
  private startingFrom: Map<string, Edge[]>;
  private leadingTo: Map<string, Edge[]>;

  constructor(
    private delegate: GraphBase
  ) {
    this.startingFrom = new Map<string, Edge[]>
    this.leadingTo = new Map<string, Edge[]>
    this.getNodes().forEach(node => {
      this.startingFrom.set(node.getId(), [])
      this.leadingTo.set(node.getId(), [])
    })
    this.getEdges().forEach(edge => {
      const fromId = edge.getFrom().getId()
      const toId = edge.getTo().getId()
      this.startingFrom.get(fromId)!.push(edge)
      this.leadingTo.get(toId)!.push(edge)
    });
  }

  getNodes(): readonly Node[] {
    return this.delegate.getNodes()
  }

  getNodeById(id: string): Node | undefined {
    return this.delegate.getNodeById(id)
  }

  getEdges(): readonly Edge[] {
    return this.delegate.getEdges()
  }

  getEdgeByKey(key: string): Edge | undefined {
    return this.delegate.getEdgeByKey(key)
  }

  getOrderedEdgesStartingFrom(startNode: Node): readonly Edge[] {
    return this.startingFrom!.get(startNode.getId())!
  }

  getOrderedEdgesLeadingTo(endNode: Node): readonly Edge[] {
    return this.leadingTo!.get(endNode.getId())!
  }

  getSuccessors(node: Node): readonly Node[] {
    return this.getOrderedEdgesStartingFrom(node).map(edge => edge.getTo())
  }

  getPredecessors(node: Node): readonly Node[] {
    return this.getOrderedEdgesLeadingTo(node).map(edge => edge.getFrom())
  }
}

export interface Node {
  getId(): string
  // GUI components should be able to show the text of a node if available
  getText(): string
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

  getText() {
    return this.text
  }
}

export function getEdgeKey(from: Node, to: Node): string {
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

export enum NodeCaptionChoice {
  ID = "id",
  TEXT = "text"
}

export function getCaption(n: Node, choice: NodeCaptionChoice): string {
  switch (choice) {
    case NodeCaptionChoice.ID: return n.getId()
    case NodeCaptionChoice.TEXT: return n.getText()
  }
}

// If a node has been selected, all its incoming and outgoing
// edges should also be highlighted.
//
// If an edge has been selected, the nodes it connects
// should also be highlighted.
export class NodeOrEdgeSelection {
  private selectedNodeId: string | null = null
  private selectedEdgeKey: string | null = null

  selectNode(id: string, g: Graph) {
    this.checkNodeId(id, g)
    if (this.selectedNodeId === id) {
      this.deselect()
    } else {
      this.deselect()
      this.selectedNodeId = id
    }
  }

  selectEdge(key: string, g: Graph) {
    this.checkEdgeKey(key, g)
    if (this.selectedEdgeKey === key) {
      this.deselect()
    } else {
      this.deselect()
      this.selectedEdgeKey = key
    }
  }

  isNodeSelectedInGraph(nodeId: string, g: Graph): boolean {
    this.checkNodeId(nodeId, g)
    if (nodeId === this.selectedNodeId) {
      return true
    }
    if (this.selectedEdgeKey !== null) {
      const selectedEdge = g.getEdgeByKey(this.selectedEdgeKey)!
      const connectedNodeIds = [selectedEdge.getFrom(), selectedEdge.getTo()]
        .map(n => n.getId())
      if (connectedNodeIds.indexOf(nodeId) >= 0) {
        return true
      }
    }
    return false
  }

  isEdgeSelectedInGraph(edgeKey: string, g: Graph): boolean {
    this.checkEdgeKey(edgeKey, g)
    if (this.selectedEdgeKey === edgeKey) {
      return true
    }
    if (this.selectedNodeId !== null) {
      const selectedNode = g.getNodeById(this.selectedNodeId)!
      const connectedEdgeKeys: string[] =
        [g.getOrderedEdgesStartingFrom(selectedNode), g.getOrderedEdgesLeadingTo(selectedNode)]
        .flat()
        .map(edge => getEdgeKey(edge.getFrom(), edge.getTo()))
      if (connectedEdgeKeys.indexOf(edgeKey) >= 0) {
        return true
      }
    }
    return false
  }

  private deselect() {
    this.selectedNodeId = null
    this.selectedEdgeKey = null
  }

  private checkNodeId(id: string, g: Graph) {
    if (g.getNodeById(id) === undefined) {
      throw new Error(`No node with id ${id} exists in graph`)
    }
  }

  private checkEdgeKey(key: string, g: Graph) {
    if (g.getEdgeByKey(key) === undefined) {
      throw new Error(`No edge with key ${key} exists in graph`)
    }
  }
}

export type OptionalNode = Node | null
export type OptionalEdge = Edge | null
