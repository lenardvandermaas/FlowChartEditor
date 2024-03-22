import { Node, Graph, Edge, ConcreteEdge } from './graph'
import { NodeSequenceEditor, ConcreteNodeSequenceEditor } from './nodeSequenceEditor'

enum CreationReason {
  ORIGINAL = 'original',
  INTERMEDIATE = 'intermediate'
}

class NodeForEditor implements Node {
  constructor(
    readonly creationReason: CreationReason,
    readonly original: Node
  ) {}

  getId(): string {
    return this.original.getId()
  }
}

// Holds an original edge in which the from and to nodes
// are replaced by extended nodes. Or holds a connection
// with intermediate nodes. For an intermediate edge,
// use original.getFrom().getId() and original.getTo().getId()
// to see the original nodes for which this intermediate
// edge was created. Do not use the nodes original.getFrom() and
// original.getTo() directly because that would mix up
// original nodes and nodes with creation information included.
//
// In any case, use the original
// field to find styling information about the edge.
// Styling information for the connected nodes is still
// available without using the original field, because
// the connected nodes are instances of NodeForEditor
//
class EdgeForEditor implements Edge {
  constructor(
    readonly creationReason: CreationReason,
    readonly original: Edge,
    private from: NodeForEditor,
    private to: NodeForEditor
  ) {}

  getFrom(): Node {
    return this.getFrom()
  }

  getTo(): Node {
    return this.getTo()
  }
}

class NodeSequenceEditorBuilder {
  constructor(
    readonly graph: Graph,
    readonly nodeToLayerMap: Map<string, number>,
    readonly orderedOmittedNodes: Node[]) {}

  build(): NodeSequenceEditor {
    // TODO: Implement
    return new ConcreteNodeSequenceEditor()
  }
}

/* TODO: Uncomment and build this
function makeHorizontalGroups(graph: Graph): NodeSequenceEditorBuilder {
  // TODO: Call calculateLayerNumbers here.
  // TODO: Create intermediate nodes and build the
  //       extended Graph.
  // TODO: How to handle omitted nodes without mixing up
  //       NodeForEditor and Node or EdgeForEditor and Edge.
}
*/

function calculateLayerNumbers(graph: Graph): Map<string, number> {
  let layerMap: Map<string, number> = new Map()
  let queue: Node[] = graph.getNodes().filter(n => graph.getOrderedEdgesLeadingTo(n).length === 0)
  while (queue.length > 0) {
    // No node on the queue has a layer number
    const current: Node = queue.shift()!
    const incomingEdges = graph.getOrderedEdgesLeadingTo(current)
    if (incomingEdges.length === 0) {
      layerMap.set(current.getId(), 0)
    } else {
      // Cannot be empty. A non-root node can only have
      // been added if there once was a current with an
      // edge leading to it.
      const precedingLayers: number[] = incomingEdges
        .filter(edge => layerMap.has(edge.getFrom().getId()))
        .map(edge => layerMap.get(edge.getFrom().getId())!)
      layerMap.set(current.getId(), Math.max( ... precedingLayers) + 1)
    }
    // current has a layer number but it is off the queue.
    // Still no node on the queue has a layer number
    graph.getOrderedEdgesStartingFrom(current)
      .map(edge => edge.getTo())
      .filter(node => ! layerMap.has(node.getId()))
      .forEach(node => queue.push(node));
  }
  return layerMap
}