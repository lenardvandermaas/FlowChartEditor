import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SequenceEditorComponent } from '../sequence-editor/sequence-editor.component';
import { Drawing, FrankFlowchartComponent, Line, Rectangle } from '../frank-flowchart/frank-flowchart.component';
import { getGraphFromMermaid } from '../../parsing/mermaid-parser';
import { GraphBase, Graph, GraphConnectionsDecorator, ConcreteNode, Edge, getEdgeKey } from '../../model/graph';
import { calculateLayerNumbers, CreationReason, NodeForEditor, NodeSequenceEditorBuilder, OriginalNode } from '../../model/horizontalGrouping';
import { NodeSequenceEditor } from '../../model/nodeSequenceEditor';
import { Subject } from 'rxjs';
import { NodeLayout, NodeLayoutBuilder, NodeSpacingDimensions, Position } from '../../graphics/node-layout';
import { Interval } from '../../util/interval';

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
  drawing: Drawing | null = null

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
    const layout = builder.run()
    const rectangles: Rectangle[] = layout.positions
      .map(p => this.position2rectangle(p, dimensions))
    const lines: Line[] = this.layoutModel!.getEdges()
      .filter(e => layout.positionMap.has(e.getFrom().getId()))
      .filter(e => layout.positionMap.has(e.getTo().getId()))
      .map(e => this.edge2line(e, layout, this.layoutModel!))
    this.drawing = {width: layout.width, height: layout.height, rectangles, lines}
  }

  private position2rectangle(p: Position, dimensions: Dimensions): Rectangle {
    const intervalX: Interval = Interval.createFromCenterSize(p.x!, dimensions.nodeBoxWidth)
    const intervalY: Interval = Interval.createFromCenterSize(p.y!, dimensions.nodeBoxHeight)
    const rawNode: NodeForEditor = p.node as NodeForEditor
    if (rawNode.getCreationReason() == CreationReason.ORIGINAL) {
      return {
        id: p.node.getId(),
        x: intervalX.minValue,
        y: intervalY.minValue,
        width: dimensions.nodeBoxWidth,
        height: dimensions.nodeBoxHeight,
        centerX: intervalX.center,
        centerY: intervalY.center,
        text: ((rawNode as OriginalNode).original as ConcreteNode).text
      }
    } else {
      return {
        id: p.node.getId(),
        x: p.x!,
        y: p.y!,
        width: 1,
        height: 1,
        centerX: p.x!,
        centerY: p.y!,
        text: ''
      }
    }
  }

  edge2line(edge: Edge, layout: NodeLayout, model: NodeSequenceEditor): Line {
    return {
      id: getEdgeKey(edge.getFrom(), edge.getTo()),
      x1: layout.positionMap.get(edge.getFrom().getId())!.x!,
      y1: layout.positionMap.get(edge.getFrom().getId())!.y!,
      x2: layout.positionMap.get(edge.getTo().getId())!.x!,
      y2: layout.positionMap.get(edge.getTo().getId())!.y!
    }
  }
}
