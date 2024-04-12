// Holds a grouping of nodes and edges in layers.
// A layer is group of nodes that should appear on the same horizontal line.
// No attempt here to assign concrete coordinates here. Just
// deciding how many layers there should be, how much nodes in each layer.
// Managing how to choose the sequence of nodes within a layer is also
// supported here.

import { Node, Edge, getEdgeKey, OptionalNode, OptionalEdge, Graph } from './graph'
import { getRange } from '../util/util'

export enum UpdateResponse {
  ACCEPTED = "accepted",
  REJECTED = "rejected"
}

type OptionalString = string | null

export interface NodeSequenceEditor extends Graph {
  getNumLayers(): number
  getLayerOfPosition(position: number): number
  getLayerOfNode(node: Node): number
  getPositionsInLayer(layerNumber: number): number[]
  getSequence(): readonly OptionalNode[]
  getSequenceInLayer(layerNumber: number): readonly OptionalNode[]
  rotateToSwap(posFrom: number, posTo: number): UpdateResponse
  omitNodeFrom(position: number): UpdateResponse
  reintroduceNode(position: number, node: Node): UpdateResponse
  getOrderedOmittedNodes(): readonly Node[]
  getOrderedOmittedNodesInLayer(layerNumber: number): readonly Node[]
  getCell(positionFrom: number, positionTo: number): NodeSequenceEditorCell
}

export interface NodeSequenceEditorCell {
  getFromPosition(): number
  getToPosition(): number
  getLayerFrom(): number
  getLayerTo(): number
  getEdgeIfConnected(): OptionalEdge
}

export class ConcreteNodeSequenceEditor implements NodeSequenceEditor {
  private nodeIdToLayer: Map<string, number>
  private sequence: OptionalString[]
  private layerStartPositions: number[]
  private omittedByLayer: Set<string>[] = []

  constructor(
    // Not modified, no need to copy
    readonly graph: Graph,
    nodeIdToLayer: Map<string, number>
  ) {
    // Copy the map
    this.nodeIdToLayer = new Map(nodeIdToLayer)
    this.checkNodeToLayerMap()
    this.sequence = orderNodesByLabelButPreserveOrderWithinEachLayer(
      graph.getNodes(), this.nodeIdToLayer, Math.max( ... nodeIdToLayer.values()) + 1)
    this.layerStartPositions = calculateLayerStartPositions(
      this.sequence.map(os => os!), this.nodeIdToLayer)
    for(let i = 0; i < this.getNumLayers(); ++i) {
      this.omittedByLayer.push(new Set<string>())
    }
  }

  private checkNodeToLayerMap() {
    const coveredLayersSet: Set<number> = new Set()
    const nonLayeredIds: Set<string> = new Set(this.graph.getNodes().map(n => n.getId()))
    this.nodeIdToLayer.forEach((v, k) => {
      if (this.graph.getNodeById(k) === undefined) {
        throw new Error(`Node to layer map refers to nonexisting node ${k}`)
      }
      coveredLayersSet.add(v)
      nonLayeredIds.delete(k)
    })
    if (nonLayeredIds.size !== 0) {
      throw new Error('Some nodes in the graph do not have a layer')
    }
    const coveredLayers: number[] = Array.from(coveredLayersSet).sort((a, b) => a - b)
    if (coveredLayers.length === 0) {
      throw new Error('No node has a layer number assigned')
    }
    coveredLayers.forEach((v, i) => {
      if (v !== i) {
        throw new Error('There are empty layers, not supported')
      }
    })
  }

  getNodes(): readonly Node[] {
    return this.graph.getNodes()
  }

  getNodeById(id: string): Node | undefined {
    return this.graph.getNodeById(id)
  }

  getEdges(): readonly Edge[] {
    return this.graph.getEdges()
  }

  getEdgeByKey(key: string): Edge | undefined {
    return this.graph.getEdgeByKey(key)
  }

  getNumLayers(): number {
    return this.layerStartPositions.length
  }

  getOrderedEdgesStartingFrom(startId: string): readonly Edge[] {
    this.checkNodeId(startId)
    return this.graph.getOrderedEdgesStartingFrom(startId)
  }

  getOrderedEdgesLeadingTo(endId: string): readonly Edge[] {
    this.checkNodeId(endId)
    return this.graph.getOrderedEdgesLeadingTo(endId)
  }

  getSuccessors(nodeId: string): readonly Node[] {
    this.checkNodeId(nodeId)
    return this.graph.getSuccessors(nodeId)
  }

  getPredecessors(nodeId: string): readonly Node[] {
    this.checkNodeId(nodeId)
    return this.graph.getPredecessors(nodeId)
  }

  getLayerOfPosition(position: number): number {
    this.checkPosition(position)
    // Do not use array method findLastIndex() because that exists
    // only from TypeScript language version ES2023 onwards.
    for (let layerNumber = this.getNumLayers() - 1; layerNumber >= 0; --layerNumber) {
      if (this.layerStartPositions[layerNumber] <= position) {
        return layerNumber
      }
    }
    throw new Error('Cannot happen because layer 0 starts at position 0')
  }

  getLayerOfNode(node: Node): number {
    this.checkNode(node)
    return this.nodeIdToLayer.get(node.getId())!
  }

  getPositionsInLayer(layerNumber: number): number[] {
    this.checkLayerNumber(layerNumber)
    if (layerNumber === (this.getNumLayers() - 1)) {
      return getRange(this.layerStartPositions![layerNumber], this.graph.getNodes().length)
    } else {
      return getRange(this.layerStartPositions![layerNumber], this.layerStartPositions![layerNumber + 1])
    }
  }

  getSequence(): readonly OptionalNode[] {
    return this.sequence.map(id => this.optionalNodeOf(id))
  }

  private optionalNodeOf(optionalId: OptionalString): OptionalNode {
    return optionalId === null ? null : this.graph.getNodeById(optionalId)!
  }

  getSequenceInLayer(layerNumber: number): readonly OptionalNode[] {
    this.checkLayerNumber(layerNumber)
    return this.getPositionsInLayer(layerNumber).map(index => this.getSequence()[index])
  }

  rotateToSwap(posFrom: number, posTo: number): UpdateResponse {
    this.checkPosition(posFrom)
    this.checkPosition(posTo)
    const layerFrom = this.getLayerOfPosition(posFrom)
    const layerTo = this.getLayerOfPosition(posTo)
    if (posFrom === posTo) {
      // Nothing to do
      return UpdateResponse.ACCEPTED
    }
    if (layerFrom !== layerTo) {
      return UpdateResponse.REJECTED
    }
    const carry: OptionalString = this.sequence[posFrom]
    this.rotate(posFrom, posTo)
    this.sequence[posTo] = carry
    return UpdateResponse.ACCEPTED
  }

  private rotate(posFrom: number, posTo: number) {
    if (posFrom < posTo) {
      for (let index = posFrom + 1; index <= posTo; ++index) {
        this.sequence[index - 1] = this.sequence[index]
      }  
    } else if (posFrom > posTo) {
      for(let index = posFrom - 1; index >= posTo; --index) {
        this.sequence[index + 1] = this.sequence[index]
      }  
    }
  }

  omitNodeFrom(position: number): UpdateResponse {
    this.checkPosition(position)
    const optionalNode: OptionalString = this.sequence[position]
    if (optionalNode === null) {
      // Nothing to do
      return UpdateResponse.ACCEPTED
    }
    const nodeId: string = optionalNode!
    const layerNumber = this.nodeIdToLayer.get(nodeId)!
    if (this.omittedByLayer[layerNumber].has(nodeId)) {
      throw Error(`Programming error: node ${nodeId} exists at position ${position} and is also omitted from layer ${layerNumber}`)
    }
    this.sequence[position] = null
    this.omittedByLayer[layerNumber].add(nodeId)
    return UpdateResponse.ACCEPTED
  }

  reintroduceNode(position: number, node: Node): UpdateResponse {
    this.checkPosition(position)
    const layerNumber = this.getLayerOfPosition(position)
    if (this.sequence[position] !== null) {
      // Destination spot is not empty
      return UpdateResponse.REJECTED
    }
    if (this.getLayerOfNode(node) !== layerNumber) {
      // Trying to reintroduce a node that lives in another layer
      return UpdateResponse.REJECTED
    }
    if (! this.omittedByLayer[layerNumber].has(node.getId())) {
      // Node to reintroduce is in already.
      return UpdateResponse.REJECTED
    }
    this.sequence[position] = node.getId()
    this.omittedByLayer[layerNumber].delete(node.getId())
    return UpdateResponse.ACCEPTED
  }

  getOrderedOmittedNodes(): readonly Node[] {
    return this.getOmittedNodesSatisfying(n => true)
  }

  private getOmittedNodesSatisfying(pred: (n: Node) => boolean) {
    const originalOrder = this.graph.getNodes()
    const result: Node[] = []
    originalOrder.forEach(n => {
      const layerNumber: number = this.nodeIdToLayer.get(n.getId())!
      if (this.omittedByLayer[layerNumber].has(n.getId())) {
        if (pred(n)) {
          result.push(n)
        }
      }
    })
    return result
  }

  getOrderedOmittedNodesInLayer(layerNumber: number): Node[] {
    this.checkLayerNumber(layerNumber)
    return this.getOmittedNodesSatisfying(n => (this.nodeIdToLayer.get(n.getId()) === layerNumber))
  }

  getCell(positionFrom: number, positionTo: number): NodeSequenceEditorCell {
    this.checkPosition(positionFrom)
    this.checkPosition(positionTo)
    const layerFrom = this.getLayerOfPosition(positionFrom)
    const layerTo = this.getLayerOfPosition(positionTo)
    let optionalEdge: OptionalEdge = null
    const optionalNodeFrom: OptionalNode = this.optionalNodeOf(this.sequence[positionFrom])
    const optionalNodeTo: OptionalNode = this.optionalNodeOf(this.sequence[positionTo])
    if ((optionalNodeFrom !== null) && (optionalNodeTo !== null)) {
      const searchedEdge: Edge | undefined = this.graph.getEdgeByKey(getEdgeKey(optionalNodeFrom!, optionalNodeTo!))
      if (searchedEdge !== undefined) {
        optionalEdge = searchedEdge!
      }
    }
    return new ConcreteNodeSequenceCell(positionFrom, positionTo, layerFrom, layerTo, optionalEdge)
  }

  private checkPosition(position: number) {
    if ((position < 0) || (position >= this.sequence.length)) {
      throw new Error(`Position out of bounds: ${position}, because there are ${this.sequence.length} nodes`)
    }
  }

  private checkLayerNumber(layerNumber: number) {
    if ((layerNumber < 0) || (layerNumber >= this.getNumLayers())) {
      throw new Error(`Layer number out of bound: ${layerNumber}, because there are ${this.getNumLayers()}`)
    }
  }

  private checkNode(node: Node) {
    if (this.graph.getNodeById(node.getId()) === undefined) {
      throw Error(`Invalid node provided, id is ${node.getId()}`)
    }
  }

  private checkNodeId(id: string) {
    if (this.graph.getNodeById(id) === undefined) {
      throw Error(`Invalid node id provided, id is ${id}`)
    }
  }
}

class ConcreteNodeSequenceCell implements NodeSequenceEditorCell {
  constructor(
    private fromPosition: number,
    private toPosition: number,
    private fromLayer: number,
    private toLayer: number,
    private optionalEdge: OptionalEdge
  ) {}

  getFromPosition(): number {
    return this.fromPosition
  }

  getToPosition(): number {
    return this.toPosition
  }

  getLayerFrom(): number {
    return this.fromLayer
  }

  getLayerTo(): number {
    return this.toLayer
  }

  getEdgeIfConnected(): OptionalEdge {
    return this.optionalEdge
  }
}

function orderNodesByLabelButPreserveOrderWithinEachLayer(nodes: readonly Node[], nodeIdToLayer: Map<string, number>, numLayers: number): string[] {
  let nodesByLayer: string[][] = []
  // Do not work wity Array().fill().
  // That fills every element with the *same* list
  // If you then update one row, the other
  // row get secretly updated too.
  for(let layerNumber = 0; layerNumber < numLayers; ++layerNumber) {
    nodesByLayer.push([])
  }
  nodes.forEach(n => {
    const id: string = n.getId()
    const layer: number = nodeIdToLayer.get(id)!
    nodesByLayer[layer].push(id)
  })
  return nodesByLayer.flat()
}

function calculateLayerStartPositions(sequence: readonly string[], nodeIdToLayer: Map<string, number>): number[] {
  let layerStartPositions: number[] = []
  if (sequence.length > 0) {
    let previousLayer = -1
    for (let currentPosition = 0; currentPosition < sequence.length; ++currentPosition) {
      let currentLayer: number = nodeIdToLayer.get(sequence[currentPosition])!
      if (currentLayer > previousLayer) {
        layerStartPositions.push(currentPosition)
        previousLayer = currentLayer
      }
    }
  }
  return layerStartPositions
}


// If a node has been selected, all its incoming and outgoing
// edges should also be highlighted.
//
// If an edge has been selected, the nodes it connects
// should also be highlighted.
export class NodeOrEdgeSelection {
  private constructor (
    private selectedNodeId: string | null,
    private selectedEdgeKey: string | null
  ) {}

  static create() {
    return new NodeOrEdgeSelection(null, null)
  }

  static copy(other: NodeOrEdgeSelection) {
    return new NodeOrEdgeSelection(other.selectedNodeId, other.selectedEdgeKey)
  }

  selectNode(id: string, m: NodeSequenceEditor) {
    this.checkNodeId(id, m)
    if (this.selectedNodeId === id) {
      this.deselect()
    } else {
      this.deselect()
      this.selectedNodeId = id
    }
  }

  selectEdge(key: string, m: NodeSequenceEditor) {
    this.checkEdgeKey(key, m)
    if (this.selectedEdgeKey === key) {
      this.deselect()
    } else {
      this.deselect()
      this.selectedEdgeKey = key
    }
  }

  isNodeSelectedInDrawing(nodeId: string, m: NodeSequenceEditor): boolean {
    this.checkNodeId(nodeId, m)
    if (nodeId === this.selectedNodeId) {
      return true
    }
    if (this.selectedEdgeKey !== null) {
      const selectedEdge = m.getEdgeByKey(this.selectedEdgeKey)!
      const connectedNodeIds = [selectedEdge.getFrom(), selectedEdge.getTo()]
        .map(n => n.getId())
      if (connectedNodeIds.indexOf(nodeId) >= 0) {
        return true
      }
    }
    return false
  }

  isEdgeSelectedInDrawing(edgeKey: string, m: NodeSequenceEditor): boolean {
    this.checkEdgeKey(edgeKey, m)
    if (this.selectedEdgeKey === edgeKey) {
      return true
    }
    if (this.selectedNodeId !== null) {
      const connectedEdgeKeys: string[] =
        [m.getOrderedEdgesStartingFrom(this.selectedNodeId), m.getOrderedEdgesLeadingTo(this.selectedNodeId)]
        .flat()
        .map(edge => getEdgeKey(edge.getFrom(), edge.getTo()))
      if (connectedEdgeKeys.indexOf(edgeKey) >= 0) {
        return true
      }
    }
    return false
  }

  static isFromPositionSelectedInEditor(fromPosition: number, m: NodeSequenceEditor, context: NodeOrEdgeSelection): boolean {
    return NodeOrEdgeSelection.isPositionSelectedInEditor(fromPosition, e => e.getFrom(), m, context)
  }

  private static isPositionSelectedInEditor(position: number, edgeDirection: (e: Edge) => Node, m: NodeSequenceEditor, context: NodeOrEdgeSelection): boolean {
    const nodeQuery: OptionalNode = m.getSequence()[position]
    if (nodeQuery === null) {
      return false
    }
    if (context.selectedNodeId === nodeQuery.getId()) {
      return true
    }
    if (context.selectedEdgeKey !== null) {
      const selectedEdge: Edge = m.getEdgeByKey(context.selectedEdgeKey)!
      const refNode: Node = edgeDirection(selectedEdge)
      if (nodeQuery.getId() === refNode.getId()) {
        return true
      }
    }
    return false
  }

  static isToPositionSelectedInEditor(toPosition: number, m: NodeSequenceEditor, context: NodeOrEdgeSelection): boolean {
    return NodeOrEdgeSelection.isPositionSelectedInEditor(toPosition, e => e.getTo(), m, context)
  }

  static isCellSelectedInEditor(fromPosition: number, toPosition: number, m: NodeSequenceEditor, context: NodeOrEdgeSelection): boolean {
    if (context.selectedNodeId !== null) {
      return NodeOrEdgeSelection.isFromPositionSelectedInEditor(fromPosition, m, context) || NodeOrEdgeSelection.isToPositionSelectedInEditor(toPosition, m, context)
    } else {
      const optionalFromNode: OptionalNode = m.getSequence()[fromPosition]
      const optionalToNode: OptionalNode = m.getSequence()[toPosition]
      if ( (optionalFromNode !== null) && (optionalToNode !== null) ) {
        const keyQuery = getEdgeKey(optionalFromNode, optionalToNode)
        if (keyQuery === context.selectedEdgeKey) {
          return true
        }
      }
      return false
    }
  }

  private deselect() {
    this.selectedNodeId = null
    this.selectedEdgeKey = null
  }

  private checkNodeId(id: string, m: NodeSequenceEditor) {
    if (m.getNodeById(id) === undefined) {
      throw new Error(`No node with id ${id} exists in graph`)
    }
  }

  private checkEdgeKey(key: string, m: NodeSequenceEditor) {
    if (m.getEdgeByKey(key) === undefined) {
      throw new Error(`No edge with key ${key} exists in graph`)
    }
  }
}
