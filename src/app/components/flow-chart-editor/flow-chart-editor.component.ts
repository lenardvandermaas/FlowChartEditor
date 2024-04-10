import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SequenceEditorComponent } from '../sequence-editor/sequence-editor.component';
import { Drawing, FrankFlowchartComponent, Line, Rectangle, getEmptyDrawing } from '../frank-flowchart/frank-flowchart.component';
import { getGraphFromMermaid } from '../../parsing/mermaid-parser';
import { GraphBase, Graph, GraphConnectionsDecorator } from '../../model/graph';
import { calculateLayerNumbers, CreationReason, NodeSequenceEditorBuilder } from '../../model/horizontalGrouping';
import { NodeSequenceEditor } from '../../model/nodeSequenceEditor';
import { NodeLayoutBuilder, NodeSpacingDimensions } from '../../graphics/node-layout';
import { Layout, PlacedEdge, PlacedNode } from '../../graphics/edge-layout';
import { DimensionsEditorComponent } from '../dimensions-editor/dimensions-editor.component';

export interface Dimensions extends NodeSpacingDimensions {
  nodeBoxWidth: number
  nodeBoxHeight: number
}

export interface NodeSequenceEditorOrError {
  model: NodeSequenceEditor | null
  error: string | null
}

const dimensions: Dimensions = {
  layerHeight: 50,
  layerDistance: 120,
  nodeBoxHeight: 40,
  intermediateWidth: 60,
  nodeWidth: 120,
  omittedPlaceholderWidth: 90,
  nodeBoxWidth: 110,
}

@Component({
  selector: 'app-flow-chart-editor',
  standalone: true,
  imports: [ SequenceEditorComponent, FrankFlowchartComponent, DimensionsEditorComponent, FormsModule ],
  templateUrl: './flow-chart-editor.component.html',
  styleUrl: './flow-chart-editor.component.scss'
})
export class FlowChartEditorComponent {
  mermaidText: string = ''
  zoomInput: number = 100
  layoutModel: NodeSequenceEditor | null = null
  drawing: Drawing = getEmptyDrawing()
  numCrossingLines: number = 0

  loadMermaid() {
    const modelOrError: NodeSequenceEditorOrError = FlowChartEditorComponent.mermaid2model(this.mermaidText)
    if (modelOrError.error !== null) {
      alert(modelOrError.error)
      return
    }
    this.layoutModel = modelOrError.model
    this.updateDrawing()
  }

  static mermaid2model(text: string): NodeSequenceEditorOrError {
    let b: GraphBase
    try {
      b = getGraphFromMermaid(text)
    } catch(e) {
      return {model: null, error: 'Invalid mermaid text:' + (e as Error).message}
    }
    const g: Graph = new GraphConnectionsDecorator(b)
    const layerMap: Map<string, number> = calculateLayerNumbers(g)
    const builder: NodeSequenceEditorBuilder = new NodeSequenceEditorBuilder(layerMap, g)
    if (builder.orderedOmittedNodes.length > 0) {
      return {model: null, error: 'Could not assign a layer to the following nodes: ' + builder.orderedOmittedNodes.map(n => n.getId()).join(', ')}
    }
    return {model: builder.build(), error: null}
  }

  onSequenceEditorChanged() {
    this.updateDrawing()
  }

  updateDrawing() {
    const layout = FlowChartEditorComponent.model2layout(this.layoutModel!, dimensions)
    this.numCrossingLines = layout.getNumCrossingLines()
    const rectangles: Rectangle[] = layout.getNodes()
      .map(n => n as PlacedNode)
      // No box around intermediate node
      .filter(n => n.creationReason === CreationReason.ORIGINAL)
      .map(n => { return {
        id: n.getId(), x: n.left, y: n.top, width: n.width, height: n.height, centerX: n.centerX, centerY: n.centerY,
        text: n.optionalText === null ? '' : n.optionalText}})
    const lines: Line[] = layout.getEdges()
      .map(edge => edge as PlacedEdge)
      .map(edge => { return {
        id: edge.key, x1: edge.line.startPoint.x, y1: edge.line.startPoint.y,
        x2: edge.line.endPoint.x, y2: edge.line.endPoint.y
      }})
    this.drawing = {width: layout.width, height: layout.height, rectangles, lines}
  }

  static model2layout(model: NodeSequenceEditor, inDimensions: Dimensions): Layout {
    const builder = new NodeLayoutBuilder(model, inDimensions)
    const nodeLayout = builder.run()
    return new Layout(nodeLayout, model, dimensions)
  }
}
