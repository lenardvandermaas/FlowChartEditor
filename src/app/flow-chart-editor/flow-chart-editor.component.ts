import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SequenceEditorComponent } from '../sequence-editor/sequence-editor.component';

@Component({
  selector: 'app-flow-chart-editor',
  standalone: true,
  imports: [ SequenceEditorComponent, FormsModule ],
  templateUrl: './flow-chart-editor.component.html',
  styleUrl: './flow-chart-editor.component.scss'
})
export class FlowChartEditorComponent {
  mermaidText: string = ''

  @ViewChild(SequenceEditorComponent)
  sequenceEditor: SequenceEditorComponent | undefined

  loadMermaid() {
    if (this.sequenceEditor === undefined) {
      console.log('ERROR: sequenceEditor not initialized')
    }
    this.sequenceEditor?.receiveFromParent(this.mermaidText)
  }
}
