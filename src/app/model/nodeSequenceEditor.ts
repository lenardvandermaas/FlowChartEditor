// Holds a grouping of nodes and edges in layers.
// A layer is group of nodes that should appear on the same horizontal line.
// No attempt here to assign concrete coordinates here. Just
// deciding how many layers there should be, how much nodes in each layer.
// Managing how to choose the sequence of nodes within a layer is also
// supported here.

import { Node, Edge, GraphBase, getEdgeKey, OptionalNode, OptionalEdge } from './graph'
import { getRange } from '../util/util'

export enum UpdateResponse {
  ACCEPTED = "accepted",
  REJECTED = "rejected"
}

type OptionalString = string | null

export interface NodeSequenceEditor {
  getNodeById(id: string): Node | undefined
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
    readonly graph: GraphBase,
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

  getNodeById(id: string): Node | undefined {
    return this.graph.getNodeById(id)
  }

  getNumLayers(): number {
    return this.layerStartPositions.length
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
