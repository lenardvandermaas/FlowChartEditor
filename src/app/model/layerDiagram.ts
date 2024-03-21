// Holds a grouping of nodes and edges in layers.
// A layer is group of nodes that should appear on the same horizontal line.
// No attempt here to assign concrete coordinates here. Just
// deciding how many layers there should be, how much nodes in each layer.
// Managing how to choose the sequence of nodes within a layer is also
// supported here.

import { Node, Edge, GraphBase, ConcreteGraphBase, getEdgeKey } from './graph'
import { getRange } from '../util/util'

export interface LayerStructure extends GraphBase {
  getNumLayers(): number
  getLayerOfPosition(position: number): number
  getLayerOfNode(node: Node): number
  getPositionsInLayer(layerNumber: number): number[]
  getInitialSequence(): NodeSequenceForLayerStructure
}

export enum UpdateResponse {
  ACCEPTED = "accepted",
  REJECTED = "rejected"
}

export type OptionalNode = Node | null
export type OptionalEdge = Edge | null

export interface NodeSequenceForLayerStructure {
  getLayerStructure(): LayerStructure
  getSequence(): readonly OptionalNode[]
  getSequenceInLayer(layerNumber: number): readonly OptionalNode[]
  rotateToSwap(posFrom: number, posTo: number): UpdateResponse
  omitNodeFrom(position: number): UpdateResponse
  reintroduceNode(position: number, node: Node): UpdateResponse
  getOrderedOmittedNodes(): readonly Node[]
  getOrderedOmittedNodesInLayer(layerNumber: number): readonly Node[]
  getCell(positionFrom: number, positionTo: number): NodeSequenceCell
}

export interface NodeSequenceCell {
  getFromPosition(): number
  getToPosition(): number
  getLayerFrom(): number
  getLayerTo(): number
  getEdgeIfConnected(): OptionalEdge
}

class NodeOnLayer implements Node {
  constructor(
    private original: Node,
    private layer: number
  ) {}

  getId(): string {
    return this.original.getId()
  }

  getLayer(): number {
    return this.layer
  }

  getOriginal(): Node {
    return this.original
  }
}

export class ConcreteLayerStructure implements LayerStructure {
  // This is the graph that is shown to the user
  // that determines the sequence of the nodes.
  // This graph should hold intermediate nodes and
  // related edges. These new nodes and edges are
  // provided from the outside.
  //
  // The order of the nodes and the edges within this
  // graph is not changed when the user reorders the nodes.
  // The order chosen by the user is in the
  // NodeSequenceForLayerStructure instance that
  // is returned by getInitialSequence()
  //
  private items: ConcreteGraphBase = new ConcreteGraphBase

  private numLayers: number = 0
  private layerStartPositions: number[] | null = null

  // Do not call getInitialSequence() before initialization is done
  isInitialized() {
    return this.layerStartPositions !== null
  }

  // Do not add nodes and do not add edges after calling init
  init() {
    this.reorderNodesByLabelAndPreserveOrderWithinEachLayer()
    this.calculateLayerStartPositions()
  }

  // After initialization, the nodes have been sorted by
  // layer and within each layer, the order has been
  // preserved in which the nodes were added during
  // construction.
  getNodes(): readonly Node[] {
    this.checkIsInitialized()
    return this.items.getNodes().map(nodeOnLayer => (nodeOnLayer as NodeOnLayer).getOriginal())
  }

  getNodeById(id: string): Node | undefined {
    // Initialized or not initialize status is not important
    // because the order of the nodes is not important here
    return (this.items.getNodeById(id) as NodeOnLayer)?.getOriginal()
  }

  getEdges(): readonly Edge[] {
    this.checkIsInitialized()
    return this.items.getEdges()
  }

  getEdgeByKey(key: string): Edge | undefined {
    this.checkIsInitialized()
    return this.items.getEdgeByKey(key)
  }

  newLayer(): number {
    this.checkNotInitialized()
    return this.numLayers++
  }

  newPosition(layerNumber: number, initialNode: Node) {
    this.checkNotInitialized()
    this.checkLayerNumber(layerNumber)
    this.items.addExistingNode(new NodeOnLayer(initialNode, layerNumber))
  }

  getNumLayers(): number {
    return this.numLayers
  }

  getLayerOfPosition(position: number): number {
    this.checkIsInitialized()
    return (this.items.getNodes()[position] as NodeOnLayer).getLayer()
  }

  // The node is probably not a NodeOnLayer
  getLayerOfNode(node: Node): number {
    const nodeOnLayer: NodeOnLayer | undefined = this.items.getNodeById(node.getId()) as NodeOnLayer
    if (nodeOnLayer === undefined) {
      throw new Error(`Incompatible node, ConcreteLayerStructure instance does not know node with id ${node.getId()}`)
    }
    if (nodeOnLayer.getLayer === undefined) {
      throw new Error('Programming error, expected a NodeOnLayer in function ConcreteLayerStructure.getLayerOfNode')
    }
    return nodeOnLayer!.getLayer()
  }

  addEdge(edge: Edge) {
    this.checkNotInitialized()
    this.items.addEdge(edge)
  }

  getPositionsInLayer(layerNumber: number): number[] {
    this.checkIsInitialized()
    this.checkLayerNumber(layerNumber)
    if (layerNumber === (this.numLayers - 1)) {
      return getRange(this.layerStartPositions![layerNumber], this.items.getNodes().length)
    } else {
      return getRange(this.layerStartPositions![layerNumber], this.layerStartPositions![layerNumber + 1])
    }
  }

  getInitialSequence(): NodeSequenceForLayerStructure {
    this.checkIsInitialized()
    return new ConcreteNodeSequence(this)
  }

  private checkIsInitialized() {
    if (! this.isInitialized()) {
      throw new Error("Method is only available after calling init()")
    }
  }

  private checkNotInitialized() {
    if (this.isInitialized()) {
      throw new Error("Changing this ConcreteLayerStructure will invalidate derived node sequences")
    }
  }

  private checkLayerNumber(layerNumber: number) {
    if ((layerNumber < 0) || (layerNumber >= this.numLayers)) {
      throw new Error(`Layer number out of bound: ${layerNumber}, because there are ${this.numLayers}`)
    }
  }

  private reorderNodesByLabelAndPreserveOrderWithinEachLayer() {
    let nodesByLayer: Node[][] = []
    // Do not work wity Array().fill().
    // That fills every element with the *same* list
    // If you then update one row, the other
    // row get secretly updated too.
    for(let layerNumber = 0; layerNumber < this.getNumLayers(); ++ layerNumber) {
      nodesByLayer.push([])
    }
    this.items.getNodes().forEach(rawNodeOnLayer => {
      let nodeOnLayer = rawNodeOnLayer as NodeOnLayer
      nodesByLayer[nodeOnLayer.getLayer()].push(nodeOnLayer)
    })
    let newlyOrdered: Node[] = []
    nodesByLayer.forEach(nodesOfLayer => {
      // Do not push node.getOriginal() because we need
      // the node.getLayer() in calculateLayerStartPositions
      nodesOfLayer.forEach(node => newlyOrdered.push(node))
    })
    this.items._putReorderedNodesBack(newlyOrdered)
  }

  private calculateLayerStartPositions() {
    this.layerStartPositions = []
    if (this.items.getNodes().length > 0) {
      let previousLayer = -1
      for (let currentPosition = 0; currentPosition < this.items.getNodes().length; ++currentPosition) {
        let currentLayer = (this.items.getNodes()[currentPosition] as NodeOnLayer).getLayer()
        if (currentLayer > previousLayer) {
          this.layerStartPositions.push(currentPosition)
          previousLayer = currentLayer
        }
      }
    }
  }
}

class ConcreteNodeSequence implements NodeSequenceForLayerStructure {
  private sequence: OptionalNode[]
  private omittedByLayer: Set<string>[]

  constructor(
    private base: LayerStructure,
  ) {
    // Copy the array
    this.sequence = [ ... base.getNodes()]
    this.omittedByLayer = []
    // Do not use Array(...).fill(...), because that would
    // assign the same set for each layer. Omitting a node
    // from one layer would omit it secretly from all others as well
    for(let i = 0; i < base.getNumLayers(); ++i) {
      this.omittedByLayer.push(new Set<string>())
    }
  }

  getLayerStructure(): LayerStructure {
    return this.base
  }

  getSequence(): readonly OptionalNode[] {
    return this.sequence
  }

  getSequenceInLayer(layerNumber: number): readonly OptionalNode[] {
    this.checkLayerNumber(layerNumber)
    return this.base.getPositionsInLayer(layerNumber).map(index => this.getSequence()[index])
  }

  rotateToSwap(posFrom: number, posTo: number): UpdateResponse {
    this.checkPosition(posFrom)
    this.checkPosition(posTo)
    const layerFrom = this.base.getLayerOfPosition(posFrom)
    const layerTo = this.base.getLayerOfPosition(posTo)
    if (posFrom === posTo) {
      // Nothing to do
      return UpdateResponse.ACCEPTED
    }
    if (layerFrom !== layerTo) {
      return UpdateResponse.REJECTED
    }
    const carry: OptionalNode = this.sequence[posFrom]
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
    const optionalNode: OptionalNode = this.sequence[position]
    if (optionalNode === null) {
      // Nothing to do
      return UpdateResponse.ACCEPTED
    }
    const layerNumber = this.base.getLayerOfPosition(position)
    const node: Node = optionalNode!
    if (this.omittedByLayer[layerNumber].has(node.getId())) {
      throw Error(`Programming error: node ${node.getId()} exists at position ${position} and is also omitted from layer ${layerNumber}`)
    }
    this.sequence[position] = null
    this.omittedByLayer[layerNumber].add(node.getId())
    return UpdateResponse.ACCEPTED
  }

  reintroduceNode(position: number, node: Node): UpdateResponse {
    this.checkPosition(position)
    const layerNumber = this.base.getLayerOfPosition(position)
    if (this.sequence[position] !== null) {
      // Destination spot is not empty
      return UpdateResponse.REJECTED
    }
    if (this.base.getLayerOfNode(node) !== layerNumber) {
      // Trying to reintroduce a node that lives in another layer
      return UpdateResponse.REJECTED
    }
    if (! this.omittedByLayer[layerNumber].has(node.getId())) {
      // Node to reintroduce is in already.
      return UpdateResponse.REJECTED
    }
    this.sequence[position] = node
    this.omittedByLayer[layerNumber].delete(node.getId())
    return UpdateResponse.ACCEPTED
  }

  getOrderedOmittedNodes(): readonly Node[] {
    const originalOrder = this.base.getNodes()
    const result: Node[] = []
    originalOrder.forEach((n, position) => {
      const layerNumber = this.base.getLayerOfPosition(position)
      if (this.omittedByLayer[layerNumber].has(n.getId())) {
        result.push(n)
      }
    })
    return result
  }

  getOrderedOmittedNodesInLayer(layerNumber: number): Node[] {
    const originalOrder = this.base.getNodes()
    const result: Node[] = []
    this.base.getPositionsInLayer(layerNumber).forEach(position => {
      if (this.omittedByLayer[layerNumber].has(originalOrder[position].getId())) {
        result.push(originalOrder[position])
      }
    })
    return result
  }

  getCell(positionFrom: number, positionTo: number): NodeSequenceCell {
    this.checkPosition(positionFrom)
    this.checkPosition(positionTo)
    const layerFrom = this.base.getLayerOfPosition(positionFrom)
    const layerTo = this.base.getLayerOfPosition(positionTo)
    let optionalEdge = null
    const optionalNodeFrom: OptionalNode = this.sequence[positionFrom]
    const optionalNodeTo: OptionalNode = this.sequence[positionTo]
    if ((optionalNodeFrom !== null) && (optionalNodeTo !== null)) {
      const searchedEdge: Edge | undefined = this.base.getEdgeByKey(getEdgeKey(optionalNodeFrom!, optionalNodeTo!))
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
    if (layerNumber < 0 || (layerNumber >= this.base.getNumLayers())) {
      throw new Error(`Layer number is out of bounds: ${layerNumber}, because there are ${this.base.getNumLayers()} layers`)
    }
  }
}

class ConcreteNodeSequenceCell implements NodeSequenceCell {
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
