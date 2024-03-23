import { Node, Graph, GraphBase, Edge, ConcreteGraphBase, OptionalNode } from './graph'
import { NodeSequenceEditor, ConcreteNodeSequenceEditor } from './nodeSequenceEditor'
import { getRange } from '../util/util'

export enum CreationReason {
  ORIGINAL = 'original',
  INTERMEDIATE = 'intermediate'
}

export interface NodeForEditor extends Node {
  getCreationReason(): CreationReason
}

export class OriginalNode implements NodeForEditor {
  constructor(
    private original: Node
  ) {}

  getId() {
    return this.original.getId()
  }

  getCreationReason(): CreationReason {
    return CreationReason.ORIGINAL
  }
}

export class IntermediateNode implements NodeForEditor {
  constructor(
    private id: string
  ) {}

  getId() {
    return this.id
  }

  getCreationReason() {
    return CreationReason.INTERMEDIATE
  }
}

// Holds an original edge in which the from and to nodes
// are replaced by NodeForEditor instances, to include
// CreationReason ORIGINAL. Or holds a connection
// with intermediate nodes, CreationReason INTERMEDIATE.
//
// For an intermediate edge,
// use original.getFrom().getId() and original.getTo().getId()
// to look up the original nodes for which this intermediate
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
export class EdgeForEditor implements Edge {
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

export class NodeSequenceEditorBuilder {
  readonly graph: GraphBase
  readonly orderedOmittedNodes: Node[]
  private nextSeqIntermediateNode: number = 1

  constructor(
    readonly nodeIdToLayer: Map<string, number>,
    originalGraph: GraphBase)
  {
    this.orderedOmittedNodes = originalGraph.getNodes()
      .filter(n => ! nodeIdToLayer.has(n.getId()))
    this.graph = new ConcreteGraphBase()
    originalGraph.getNodes()
      .filter(n => nodeIdToLayer.has(n.getId()))
      .map(n => new OriginalNode(n))
      .forEach(n => (this.graph as ConcreteGraphBase).addExistingNode(n))
    originalGraph.getEdges()
      .filter(edge => nodeIdToLayer.has(edge.getFrom().getId()))
      .filter(edge => nodeIdToLayer.has(edge.getTo().getId()))
      .forEach(edge => this.handleEdge(edge))
  }

  handleEdge(edge: Edge): void {
    const layerFrom: number = this.nodeIdToLayer.get(edge.getFrom().getId())!
    const layerTo: number = this.nodeIdToLayer.get(edge.getTo().getId())!
    if (Math.abs(layerTo - layerFrom) <= 1) {
      // We do not throw an error for edges within the same layer.
      // Maybe a future layering algorithm will allow this.
      // It is not the duty of this function to test the layer
      // assignment algorithm.
      (this.graph as ConcreteGraphBase).addEdge(new EdgeForEditor(
        CreationReason.ORIGINAL,
        edge,
        this.graph.getNodeById(edge.getFrom().getId()) as NodeForEditor,
        this.graph.getNodeById(edge.getTo().getId()) as NodeForEditor
      ))
    } else {
      const intermediateLayers: number[] = getIntermediateLayers(layerFrom, layerTo)
      const intermediateNodes: NodeForEditor[] = intermediateLayers.map(layer => new IntermediateNode(
        `intermediate${this.nextSeqIntermediateNode++}`
      ));
      (this.graph as ConcreteGraphBase).addEdge(new EdgeForEditor(
        CreationReason.INTERMEDIATE,
        edge,
        this.graph.getNodeById(edge.getFrom().getId())! as NodeForEditor,
        intermediateNodes[0]
      ))
      for(let i = 1; i < intermediateNodes.length - 1; ++i) {
        (this.graph as ConcreteGraphBase).addEdge(new EdgeForEditor(
          CreationReason.INTERMEDIATE,
          edge,
          intermediateNodes[i-1],
          intermediateNodes[i]
        ))
      }
      (this.graph as ConcreteGraphBase).addEdge(new EdgeForEditor(
        CreationReason.INTERMEDIATE,
        edge,
        intermediateNodes[intermediateNodes.length - 1],
        this.graph.getNodeById(edge.getTo().getId()) as NodeForEditor
      ))
      intermediateNodes.forEach((n, index) => this.nodeIdToLayer.set(n.getId(), intermediateLayers[index]))
    }
  }

  build(): NodeSequenceEditor {
    return new ConcreteNodeSequenceEditor(this.graph, this.nodeIdToLayer)
  }
}

function getIntermediateLayers(layerFrom: number, layerTo: number): number[] {
  let result: number[]
  if(layerFrom < layerTo) {
    result = getRange(layerFrom, layerTo)
  } else {
    result = getRange(layerTo, layerFrom)
  }
  result.shift()
  return result
}

export function calculateLayerNumbers(graph: Graph): Map<string, number> {
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
        .map(edge => edge.getFrom())
        .filter(predecessor => layerMap.has(predecessor.getId()))
        .map(predecessor => layerMap.get(predecessor.getId())!)
      let layerNumberCandidate = Math.max( ... precedingLayers) + 1
      const layersOfPlacedSuccessors: number[] = graph.getOrderedEdgesStartingFrom(current)
        .map(edge => edge.getTo())
        .filter(successor => layerMap.has(successor.getId()))
        .map(successor => layerMap.get(successor.getId())!)
      const forbiddenByPlacedSuccessors: Set<number> = new Set(layersOfPlacedSuccessors)
      while (forbiddenByPlacedSuccessors.has(layerNumberCandidate)) {
        ++layerNumberCandidate
      }
      layerMap.set(current.getId(), layerNumberCandidate)
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
