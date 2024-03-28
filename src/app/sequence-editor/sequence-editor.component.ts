import { Component } from '@angular/core';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop'
import { CommonModule, NgFor } from '@angular/common'

@Component({
  selector: 'app-sequence-editor',
  standalone: true,
  imports: [ DragDropModule, CommonModule, NgFor ],
  templateUrl: './sequence-editor.component.html',
  styleUrl: './sequence-editor.component.scss'
})
export class SequenceEditorComponent {
  items = [
    ['aap', 'one'],
    ['noot', 'two'],
    ['mies', 'three']
  ]
  lastMove = ''

  drop($event: CdkDragDrop<string[]>) {
    const indexFrom = $event.previousIndex
    const indexTo = $event.currentIndex
    this.lastMove = `From ${indexFrom} to ${indexTo}`
  }
}
