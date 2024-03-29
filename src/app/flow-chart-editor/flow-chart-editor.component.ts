import { Component } from '@angular/core';
import { SequenceEditorComponent } from '../sequence-editor/sequence-editor.component';

@Component({
  selector: 'app-flow-chart-editor',
  standalone: true,
  imports: [ SequenceEditorComponent ],
  templateUrl: './flow-chart-editor.component.html',
  styleUrl: './flow-chart-editor.component.scss'
})
export class FlowChartEditorComponent {

}
