import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SequenceEditorComponent } from '../sequence-editor/sequence-editor.component';
import { Drawing, FrankFlowchartComponent, Line, Rectangle, getEmptyDrawing } from '../frank-flowchart/frank-flowchart.component';
import { getGraphFromMermaid } from '../../parsing/mermaid-parser';
import { GraphBase, Graph, GraphConnectionsDecorator, ConcreteNode, Edge, getEdgeKey } from '../../model/graph';
import { calculateLayerNumbers, CreationReason, NodeForEditor, NodeSequenceEditorBuilder, OriginalNode } from '../../model/horizontalGrouping';
import { NodeSequenceEditor } from '../../model/nodeSequenceEditor';
import { Subject } from 'rxjs';
import { NodeLayout, NodeLayoutBuilder, NodeSpacingDimensions, Position } from '../../graphics/node-layout';
import { Interval } from '../../util/interval';
import { Layout, PlacedEdge, PlacedNode } from '../../graphics/edge-layout';

interface Dimensions extends NodeSpacingDimensions {
  nodeBoxWidth: number
  nodeBoxHeight: number
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
  imports: [ SequenceEditorComponent, FrankFlowchartComponent, FormsModule ],
  templateUrl: './flow-chart-editor.component.html',
  styleUrl: './flow-chart-editor.component.scss'
})
export class FlowChartEditorComponent {
  mermaidText: string = ''
  zoomInput: number = 100
  layoutModel: NodeSequenceEditor | null = null
  drawing: Drawing = getEmptyDrawing()

  loadMermaid() {
    let b: GraphBase
    try {
      b = getGraphFromMermaid(this.mermaidText)
    } catch(e) {
      alert('Invalid mermaid text:' + (e as Error).message)
      return
    }
    const g: Graph = new GraphConnectionsDecorator(b)
    const layerMap: Map<string, number> = calculateLayerNumbers(g)
    const builder: NodeSequenceEditorBuilder = new NodeSequenceEditorBuilder(layerMap, g)
    if (builder.orderedOmittedNodes.length > 0) {
      alert('Could not assign a layer to the following nodes: ' + builder.orderedOmittedNodes.map(n => n.getId()).join(', '))
      return
    }
    console.log('Pass model to SequenceEditorComponent')
    this.layoutModel = builder.build()
    this.updateDrawing()
  }

  onSequenceEditorChanged() {
    this.updateDrawing()
  }

  updateDrawing() {
    const builder = new NodeLayoutBuilder(this.layoutModel!, dimensions)
    const nodeLayout = builder.run()
    const layout = new Layout(nodeLayout, this.layoutModel!, dimensions)
    const rectangles: Rectangle[] = layout.getNodes()
      .map(n => n as PlacedNode)
      .map(n => { return {
        id: n.getId(), x: n.left, y: n.top, width: n.width, height: n.height, centerX: n.centerX, centerY: n.centerY,
        text: n.optionalText === null ? '' : n.optionalText}})
    const lines: Line[] = layout.getEdges()
      .map(edge => edge as PlacedEdge)
      .map(edge => { return {
        id: edge.key, x1: edge.line.startPoint.x, y1: edge.line.startPoint.y,
        x2: edge.line.endPoint.x, y2: edge.line.endPoint.y
      }})
    this.drawing = {width: nodeLayout.width, height: nodeLayout.height, rectangles, lines}
  }
}
