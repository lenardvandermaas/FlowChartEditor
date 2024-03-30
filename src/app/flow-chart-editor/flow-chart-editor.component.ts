import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SequenceEditorComponent } from '../sequence-editor/sequence-editor.component';
import { MermaidParserService } from '../service/mermaid-parser.service';
import { GraphBase, Graph, GraphConnectionsDecorator } from '../model/graph';
import { calculateLayerNumbers, NodeSequenceEditorBuilder } from '../model/horizontalGrouping';

@Component({
  selector: 'app-flow-chart-editor',
  standalone: true,
  imports: [ SequenceEditorComponent, FormsModule ],
  templateUrl: './flow-chart-editor.component.html',
  styleUrl: './flow-chart-editor.component.scss',
  providers: [ MermaidParserService ]
})
export class FlowChartEditorComponent {
  constructor(private mermaidParseService: MermaidParserService) {}

  mermaidText: string = ''

  @ViewChild(SequenceEditorComponent)
  sequenceEditor: SequenceEditorComponent | undefined

  loadMermaid() {
    console.log('Loading mermaid')
    if (this.sequenceEditor === undefined) {
      console.log('ERROR: sequenceEditor not initialized')
    }
    let b: GraphBase
    try {
      b = this.mermaidParseService.getGraph(this.mermaidText)
    } catch(e) {
      console.log(e)
      return
    }
    const g: Graph = new GraphConnectionsDecorator(b)
    const layerMap: Map<string, number> = calculateLayerNumbers(g)
    const builder: NodeSequenceEditorBuilder = new NodeSequenceEditorBuilder(layerMap, g)
    if (builder.orderedOmittedNodes.length > 0) {
      console.log(`Could not assign a layer to nodes: ${builder.orderedOmittedNodes.map(n => n.getId())}`)
      return
    }
    console.log('Pass model to SequenceEditorComponent')
    this.sequenceEditor!.receiveModel(builder.build())
  }
}
