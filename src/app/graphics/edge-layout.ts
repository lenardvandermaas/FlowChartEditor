import { ConcreteEdge, ConcreteGraphBase, ConcreteNode, Edge, GraphBase, Node, OptionalNode, getEdgeKey } from "../model/graph";
import { CreationReason, EdgeForEditor, NodeForEditor, OriginalNode } from "../model/horizontalGrouping";
import { NodeSequenceEditor } from "../model/nodeSequenceEditor";
import { Interval } from "../util/interval";
import { Line, Point } from "./graphics";
import { NodeLayout, NodeSpacingDimensions, Position } from "./node-layout";

export interface Dimensions extends NodeSpacingDimensions {
  nodeBoxWidth: number
  nodeBoxHeight: number
}
  
export class PlacedNode implements Node {
  private id: string
  readonly creationReason: CreationReason
  readonly optionalText: string | null
  readonly originalStyle: string | null
  readonly layerNumber: number
  private horizontalBox: Interval
  private verticalBox: Interval

  constructor(p: Position, d: Dimensions) {
    this.id = p.node.getId()
    this.creationReason = (p.node as NodeForEditor).getCreationReason()
    const optionalOriginalNode = PlacedNode.optionalOriginalNode(p.node)
    this.optionalText = optionalOriginalNode === null ? null : optionalOriginalNode.text
    this.originalStyle = optionalOriginalNode === null ? null : optionalOriginalNode.style
    this.layerNumber = p.layerNumber
    if (this.creationReason === CreationReason.ORIGINAL) {
      this.horizontalBox = Interval.createFromCenterSize(p.x!, d.nodeBoxWidth)
      this.verticalBox = Interval.createFromCenterSize(p.y!, d.nodeBoxHeight)  
    } else {
      this.horizontalBox = Interval.createFromCenterSize(p.x!, 1)
      this.verticalBox = Interval.createFromCenterSize(p.y!, 1)  
    }
  }

  getId() {
    return this.id
  }

  private static optionalOriginalNode(rawNode: OptionalNode): ConcreteNode | null {
    const node = rawNode as NodeForEditor
    if (node.getCreationReason() === CreationReason.INTERMEDIATE) {
      return null
    }
    const originalNode: Node = (node as OriginalNode).original
    return originalNode as ConcreteNode
  }

  get centerTop(): Point {
    return new Point(this.horizontalBox.center, this.verticalBox.minValue)
  }

  get centerBottom(): Point {
    return new Point(this.horizontalBox.center, this.verticalBox.maxValue)
  }

  get left(): number {
    return this.horizontalBox.minValue
  }

  get top(): number {
    return this.verticalBox.minValue
  }

  get width(): number {
    return this.horizontalBox.size
  }

  get height(): number {
    return this.verticalBox.size
  }

  get centerX(): number {
    return this.horizontalBox.center
  }

  get centerY(): number {
    return this.verticalBox.center
  }
}

export class PlacedEdge implements Edge {
  readonly key: string
  readonly creationReason: CreationReason
  readonly optionalOriginalText: string | null
  readonly line: Line
  readonly minLayerNumber: number
  readonly maxLayerNumber: number

  constructor (private fromNode: PlacedNode, private toNode: PlacedNode, rawEdge: Edge) {
    this.key = getEdgeKey(fromNode, toNode)
    const edge = rawEdge as EdgeForEditor
    this.creationReason = edge.creationReason
    const originalEdge = edge.original as ConcreteEdge
    this.optionalOriginalText = originalEdge.text === undefined ? null : originalEdge.text
    if (fromNode.layerNumber < toNode.layerNumber) {
      this.minLayerNumber = fromNode.layerNumber
      this.maxLayerNumber = toNode.layerNumber
      this.line = new Line(fromNode.centerBottom, toNode.centerTop)
    } else {
      this.minLayerNumber = toNode.layerNumber
      this.maxLayerNumber = fromNode.layerNumber
      this.line = new Line(fromNode.centerTop, toNode.centerBottom)
    }
  }

  getFrom(): PlacedNode {
    return this.fromNode
  }

  getTo(): PlacedNode {
    return this.toNode
  }
}

export class Layout implements GraphBase {
  readonly width: number
  readonly height: number

  private delegate: ConcreteGraphBase

  constructor(layout: NodeLayout, model: NodeSequenceEditor, d: Dimensions) {
    this.width = layout.width
    this.height = layout.height
    this.delegate = new ConcreteGraphBase()
    layout.positions.forEach(p => this.delegate.addExistingNode(
      new PlacedNode(p, d)
    ))
    model.getEdges()
      .filter(edge => layout.positionMap.has(edge.getFrom().getId()))
      .filter(edge => layout.positionMap.has(edge.getTo().getId()))
      .forEach(edge => this.delegate.addEdge(new PlacedEdge(
        this.delegate.getNodeById(edge.getFrom().getId())! as PlacedNode,
        this.delegate.getNodeById(edge.getTo().getId())! as PlacedNode,
        edge
      )))
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
}