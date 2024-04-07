import { OptionalNode } from "../model/graph";
import { CreationReason, NodeForEditor } from "../model/horizontalGrouping";
import { NodeSequenceEditor } from "../model/nodeSequenceEditor";
import { Interval } from "../util/interval";
import { Node } from "../model/graph";
import { getRange, sortedUniqNumbers } from "../util/util";
import { HorizontalConflictResolver } from "./horizontal-conflict";

export interface Dimensions {
  nodeWidth: number
  intermediateWidth: number
  omittedPlaceholderWidth: number
  layerHeight: number
  layerDistance: number
}

export interface NodeLayout {
  readonly width: number
  readonly height: number
  readonly positions: Position[]
  readonly positionMap: Map<string, Position>
}

export interface Position {
  readonly node: Node
  x: number | null
  y: number | null
  preds: number[]
}

interface Layer {
  layerNumber: number
  positions: Position[]
  idToPosition: Map<string, Position>
  initialWidth: number
}

export class NodeLayoutBuilder {
  private layers: Layer[] = []

  constructor(
    private model: NodeSequenceEditor,
    private dimensions: Dimensions
  ) {}

  run(): NodeLayout {
    this.layers = getRange(0, this.model.getNumLayers())
      .map(layerNumber => this.createLayer(layerNumber))
    this.setYCoordinates()
    const width = this.setXCoordinates()
    const positions: Position[] = this.layers.flatMap(layer => layer.positions)
    const positionMap: Map<string, Position> = new Map()
    positions.forEach(p => positionMap.set(p.node.getId(), p))
    return {width, height: this.dimensions.layerDistance * this.model.getNumLayers(), positions, positionMap}
  }

  private createLayer(layerNumber: number): Layer {
    console.log(`Creating layer ${layerNumber}`)
    const positions: Position[] = []
    const idToPosition: Map<string, Position> = new Map()
    let cursor = 0
    this.model.getSequenceInLayer(layerNumber).forEach(optionalNode => {
      console.log(`Cursor is at ${cursor}`)
      if (optionalNode != null) {
        const position = this.createPosition(optionalNode, cursor)
        console.log(`Position created for node ${position.node.getId()} at ${position.preds[0]}`)
        positions.push(position)
        idToPosition.set(position.node.getId(), position)
      }
      cursor += this.widthOf(optionalNode)
    })
    const initialWidth = cursor
    return {positions, idToPosition, initialWidth, layerNumber}
  }

  private createPosition(node: Node, startX: number): Position {
    const defaultX = Interval.createFromMinSize(startX, this.widthOf(node)).center
    return {
      node,
      x: null,
      y: null,
      preds: [defaultX]
    }
  }

  private setYCoordinates() {
    let cursor = 0
    this.layers.forEach(layer => {
      const y = Interval.createFromMinSize(cursor, this.dimensions.layerHeight).center
      layer.positions.forEach(p => p.y = y)
      cursor += this.dimensions.layerDistance
    })
  }

  private setXCoordinates(): number {
    this.setInitialX()
    const allHorizontalIntervals: Interval[] = this.layers.flatMap(layer => layer.positions)
      .map(p => {
        const size = this.widthOf(p.node)
        return Interval.createFromCenterSize(p.x!, size)
      })
    const minX = Math.min( ... allHorizontalIntervals.map(interval => interval.minValue))
    const maxX = Math.max( ... allHorizontalIntervals.map(interval => interval.maxValue))
    this.layers.flatMap(layer => layer.positions).forEach(p => {
      p.x = p.x! - minX
    })
    return maxX - minX + 1
  }
  
  private setInitialX() {
    const initialWidths = this.layers.map(layer => layer.initialWidth)
    const maxInitialWidth = Math.max(... initialWidths)
    const initialLayerIndex = initialWidths.indexOf(maxInitialWidth)
    this.initializeXFrom(this.layers[initialLayerIndex], null)
    for (let i = initialLayerIndex - 1; i >= 0; --i) {
      this.initializeXFrom(this.layers[i], this.layers[i+1])
    }
    for (let i = initialLayerIndex + 1; i < this.layers.length; ++i) {
      this.initializeXFrom(this.layers[i], this.layers[i-1])
    }
  }

  initializeXFrom(subjectLayer: Layer, sourceLayer: Layer | null) {
    if (sourceLayer !== null) {
      subjectLayer.positions.forEach(p => {
        const newPreds: number[] = this.getPredsFromLayer(p, sourceLayer)
        if (newPreds.length > 0) {
          p.preds = newPreds
        }
      })
    }
    const xCoords = new HorizontalConflictResolver(
      subjectLayer.positions.length,
      i => this.widthOf(subjectLayer.positions[i].node),
      i => subjectLayer.positions[i].preds
    ).run()
    subjectLayer.positions.forEach((p, i) => p.x = xCoords[i])
  }

  getPredsFromLayer(position: Position, sourceLayer: Layer): number[] {
    let sourceNodes: Node[] = [ ... this.model.getPredecessors(position.node.getId())]
    sourceNodes.push(... this.model.getSuccessors(position.node.getId()))
    return sortedUniqNumbers(sourceNodes.filter(n => sourceLayer.idToPosition.has(n.getId()))
      .map(n => sourceLayer.idToPosition.get(n.getId())!)
      .map(p => p.x!))
  }

  widthOf(n: OptionalNode) {
    if (n === null) {
      return this.dimensions.omittedPlaceholderWidth
    } else {
      const cast = n! as NodeForEditor
      if (cast.getCreationReason() === CreationReason.INTERMEDIATE) {
        return this.dimensions.intermediateWidth
      } else {
        return this.dimensions.nodeWidth
      }
    }
  }  
}
