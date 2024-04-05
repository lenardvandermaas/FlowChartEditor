import { OptionalNode } from "../model/graph";
import { CreationReason, NodeForEditor } from "../model/horizontalGrouping";
import { NodeSequenceEditor } from "../model/nodeSequenceEditor";
import { Interval } from "../util/interval";
import { Node } from "../model/graph";
import { getRange, sortedUniqNumbers } from "../util/util";
import { HorizontalConflictResolver } from "./horizontal-conflict";

const NODE_WIDTH = 120
const INTERMEDIATE_WIDTH = 60
const OMITTED_PLACEHOLDER_WIDTH = 90
const LAYER_HEIGHT = 40
const LAYER_DISTANCE = 120

function widthOf(n: OptionalNode) {
  if (n === null) {
    return OMITTED_PLACEHOLDER_WIDTH
  } else {
    const cast = n! as NodeForEditor
    if (cast.getCreationReason() === CreationReason.INTERMEDIATE) {
      return INTERMEDIATE_WIDTH
    } else {
      return NODE_WIDTH
    }
  }
}

interface Position {
  readonly node: Node
  x: number | null
  y: number | null
  preds: number[]
}

interface DrawModel {
  readonly width: number
  readonly height: number
  readonly positions: Position[]
  readonly positionMap: Map<string, Position>
}

export function drawModel(model: NodeSequenceEditor): DrawModel {
  let layers: Layer[] = getRange(0, model.getNumLayers())
    .map(layerNumber => new Layer(model, layerNumber))
  setYCoordinatesOf(layers)
  const width = setXCoordinatesOf(layers, model)
  const positions: Position[] = layers.flatMap(layer => layer.positions)
  const positionMap: Map<string, Position> = new Map()
  positions.forEach(p => positionMap.set(p.node.getId(), p))
  return {width, height: LAYER_DISTANCE * model.getNumLayers(), positions, positionMap}
}

function setYCoordinatesOf(layers: Layer[]) {
  let cursor = 0
  layers.forEach(layer => {
    const y = Interval.createFromMinSize(cursor, LAYER_HEIGHT).center
    layer.positions.forEach(p => p.y = y)
    cursor += LAYER_DISTANCE
  })
}

function setXCoordinatesOf(layers: Layer[], model: NodeSequenceEditor): number {
  setInitialXIn(layers, model)
  const allHorizontalIntervals: Interval[] = layers.flatMap(layer => layer.positions)
    .map(p => {
      const size = widthOf(p.node)
      return Interval.createFromCenterSize(p.x!, size)
    })
  const minX = Math.min( ... allHorizontalIntervals.map(interval => interval.minValue))
  const maxX = Math.max( ... allHorizontalIntervals.map(interval => interval.maxValue))
  layers.flatMap(layer => layer.positions).forEach(p => {
    p.x = p.x! - minX
  })
  return maxX - minX + 1
}

function setInitialXIn(layers: Layer[], model: NodeSequenceEditor) {
  const initialWidths = layers.map(layer => layer.initialWidth)
  const maxInitialWidth = Math.max(... initialWidths)
  const initialLayerIndex = initialWidths.indexOf(maxInitialWidth)
  layers[initialLayerIndex].initializeXFrom(null, model)
  for (let i = initialLayerIndex - 1; i >= 0; --i) {
    layers[i].initializeXFrom(layers[i+1], model)
  }
  for (let i = initialLayerIndex + 1; i < layers.length; ++i) {
    layers[i].initializeXFrom(layers[i-1], model)
  }
}

export class Layer {
  readonly positions: Position[]
  private idToPosition: Map<string, Position>
  readonly initialWidth: number

  constructor(model: NodeSequenceEditor,
    readonly layerNumber: number)
  {
    this.positions = []
    this.idToPosition = new Map()
    let cursor = 0
    model.getSequenceInLayer(layerNumber).forEach(optionalNode => {
      if (optionalNode != null) {
        const position = this.createPosition(optionalNode, cursor)
        this.positions.push(position)
        this.idToPosition.set(position.node.getId(), position)
      }
      cursor += widthOf(optionalNode)
    })
    this.initialWidth = cursor
  }

  createPosition(node: Node, startX: number): Position {
    const defaultX = Interval.createFromMinSize(startX, widthOf(node)).center
    return {
      node,
      x: null,
      y: null,
      preds: [defaultX]
    }
  }

  initializeXFrom(sourceLayer: Layer | null, model: NodeSequenceEditor) {
    if (sourceLayer !== null) {
      this.positions.forEach(p => {
        const newPreds: number[] = this.getPredsFromLayer(p, sourceLayer, model)
        if (newPreds.length > 0) {
          p.preds = newPreds
        }
      })
    }
    const xCoords = new HorizontalConflictResolver(
      this.positions.length,
      i => widthOf(this.positions[i].node),
      i => this.positions[i].preds
    ).run()
    this.positions.forEach((p, i) => p.x = xCoords[i])
  }

  getPredsFromLayer(position: Position, sourceLayer: Layer, model: NodeSequenceEditor): number[] {
    let sourceNodes: Node[] = [ ... model.getPredecessors(position.node.getId())]
    sourceNodes.push(... model.getSuccessors(position.node.getId()))
    return sortedUniqNumbers(sourceNodes.filter(n => sourceLayer.idToPosition.has(n.getId()))
      .map(n => sourceLayer.idToPosition.get(n.getId())!)
      .map(p => p.x!))
  }
}