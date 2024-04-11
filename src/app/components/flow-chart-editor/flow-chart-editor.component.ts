import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SequenceEditorComponent } from '../sequence-editor/sequence-editor.component';
import { Drawing, FrankFlowchartComponent, Line, Rectangle, getEmptyDrawing } from '../frank-flowchart/frank-flowchart.component';
import { getGraphFromMermaid } from '../../parsing/mermaid-parser';
import { GraphBase, Graph, GraphConnectionsDecorator, ConcreteNode, Edge, getEdgeKey, NodeCaptionChoice, getCaption } from '../../model/graph';
import { calculateLayerNumbers, CreationReason, NodeForEditor, NodeSequenceEditorBuilder, OriginalNode } from '../../model/horizontalGrouping';
import { NodeSequenceEditor } from '../../model/nodeSequenceEditor';
import { NodeLayoutBuilder, NodeSpacingDimensions } from '../../graphics/node-layout';
import { Layout, PlacedEdge, PlacedNode } from '../../graphics/edge-layout';
import { Dimensions, DimensionsEditorComponent, getFactoryDimensions } from '../dimensions-editor/dimensions-editor.component';

export interface NodeSequenceEditorOrError {
  model: NodeSequenceEditor | null
  error: string | null
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
  showNodeTextInDrawing: boolean = true
  choiceShowNodeTextInDrawing: NodeCaptionChoice = this.updateShowNodeTextInDrawing()

  updateShowNodeTextInDrawing(): NodeCaptionChoice {
    if (this.showNodeTextInDrawing) {
      return NodeCaptionChoice.TEXT
    }
    return NodeCaptionChoice.ID
  }

  newChoiceShowNodeText() {
    this.showNodeTextInDrawing = ! this.showNodeTextInDrawing
    this.choiceShowNodeTextInDrawing = this.updateShowNodeTextInDrawing()
    if (this.layoutModel !== null) {
      this.updateDrawing()
    }
  }

  dimensions = getFactoryDimensions()
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
    const layout = FlowChartEditorComponent.model2layout(this.layoutModel!, this.dimensions)
    this.numCrossingLines = layout.getNumCrossingLines()
    // TODO: Properly fill selected property
    const rectangles: Rectangle[] = layout.getNodes()
      .map(n => n as PlacedNode)
      // No box around intermediate node
      .filter(n => n.creationReason === CreationReason.ORIGINAL)
      .map(n => { return {
        id: n.getId(), x: n.left, y: n.top, width: n.width, height: n.height, centerX: n.centerX, centerY: n.centerY,
        text: getCaption(n, this.choiceShowNodeTextInDrawing),
        selected: true
      }})
    const lines: Line[] = layout.getEdges()
      .map(edge => edge as PlacedEdge)
      .map(edge => { return {
        id: edge.key, x1: edge.line.startPoint.x, y1: edge.line.startPoint.y,
        x2: edge.line.endPoint.x, y2: edge.line.endPoint.y,
        selected: true
      }})
    this.drawing = {width: layout.width, height: layout.height, rectangles, lines}
  }

  static model2layout(model: NodeSequenceEditor, inDimensions: Dimensions): Layout {
    const builder = new NodeLayoutBuilder(model, inDimensions)
    const nodeLayout = builder.run()
    return new Layout(nodeLayout, model, inDimensions)
  }

  onNewDimensions(d: Dimensions) {
    this.dimensions = d
    this.updateDrawing()
  }
}
