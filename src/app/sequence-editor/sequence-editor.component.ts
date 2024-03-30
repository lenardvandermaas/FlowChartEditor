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
  // This should represent the following graph:
  //
  //   Start => N1
  //   Start => N2
  //   N1 => End
  //   N2 => End
  //
  // This should have three layers:
  //
  //   layer 0: Start
  //   layer 1: N1, N2
  //   layer 2: End
  //
  // We have omitted N1
  //
  view: View = {
    header: [
      {position: 0, backgroundClass: BackgroundClass.EVEN, nodeId: "Start", fillOptions: []},
      {position: 1, backgroundClass: BackgroundClass.ODD, nodeId: null, fillOptions: ["N1"]},
      {position: 2, backgroundClass: BackgroundClass.ODD, nodeId: "N2", fillOptions: []},
      {position: 3, backgroundClass: BackgroundClass.EVEN, nodeId: "End", fillOptions: []}
    ],
    body: [
      {
        header: {position: 0, backgroundClass: BackgroundClass.EVEN, nodeId: "Start", fillOptions: []},
        cells: [
          {
            fromPosition: 0,
            toPosition: 0,
            backgroundClass: BackgroundClass.EVEN,
            fromAndToHaveNode: true,
            hasEdge: false
          },
          {
            fromPosition: 0,
            toPosition: 1,
            backgroundClass: BackgroundClass.ODD,
            fromAndToHaveNode: false,
            hasEdge: false
          },
          {
            fromPosition: 0,
            toPosition: 2,
            backgroundClass: BackgroundClass.ODD,
            fromAndToHaveNode: true,
            hasEdge: true
          },
          {
            fromPosition: 0,
            toPosition: 3,
            backgroundClass: BackgroundClass.EVEN,
            fromAndToHaveNode: true,
            hasEdge: false
          }
        ]
      },
      {
        header: {position: 1, backgroundClass: BackgroundClass.ODD, nodeId: null, fillOptions: ["N1"]},
        cells: [
          {
            fromPosition: 1,
            toPosition: 0,
            backgroundClass: BackgroundClass.ODD,
            fromAndToHaveNode: false,
            hasEdge: false
          },
          {
            fromPosition: 1,
            toPosition: 1,
            backgroundClass: BackgroundClass.DOUBLE_ODD,
            fromAndToHaveNode: false,
            hasEdge: false
          },
          {
            fromPosition: 1,
            toPosition: 2,
            backgroundClass: BackgroundClass.DOUBLE_ODD,
            fromAndToHaveNode: false,
            hasEdge: false
          },
          {
            fromPosition: 1,
            toPosition: 3,
            backgroundClass: BackgroundClass.ODD,
            fromAndToHaveNode: false,
            hasEdge: false
          }
        ]
      },
      {
        header: {position: 2, backgroundClass: BackgroundClass.ODD, nodeId: "N2", fillOptions: []},
        cells: [
          {
            fromPosition: 2,
            toPosition: 0,
            backgroundClass: BackgroundClass.ODD,
            fromAndToHaveNode: true,
            hasEdge: false
          },
          {
            fromPosition: 2,
            toPosition: 1,
            backgroundClass: BackgroundClass.DOUBLE_ODD,
            fromAndToHaveNode: false,
            hasEdge: false
          },
          {
            fromPosition: 2,
            toPosition: 2,
            backgroundClass: BackgroundClass.DOUBLE_ODD,
            fromAndToHaveNode: true,
            hasEdge: false
          },
          {
            fromPosition: 2,
            toPosition: 3,
            backgroundClass: BackgroundClass.ODD,
            fromAndToHaveNode: true,
            hasEdge: true
          }
        ]
      },
      {
        header: {position: 3, backgroundClass: BackgroundClass.EVEN, nodeId: "End", fillOptions: []},
        cells: [
          {
            fromPosition: 3,
            toPosition: 0,
            backgroundClass: BackgroundClass.EVEN,
            fromAndToHaveNode: true,
            hasEdge: false
          },
          {
            fromPosition: 3,
            toPosition: 1,
            backgroundClass: BackgroundClass.ODD,
            fromAndToHaveNode: false,
            hasEdge: false
          },
          {
            fromPosition: 3,
            toPosition: 2,
            backgroundClass: BackgroundClass.ODD,
            fromAndToHaveNode: true,
            hasEdge: false
          },
          {
            fromPosition: 3,
            toPosition: 3,
            backgroundClass: BackgroundClass.EVEN,
            fromAndToHaveNode: true,
            hasEdge: false
          }
        ]
      }
    ]
  }

  lastMove = ''

  receivedFromParent = 'Not yet set'

  drop($event: CdkDragDrop<string>) {
    const indexFrom = $event.previousIndex
    const indexTo = $event.currentIndex
    this.lastMove = `From ${indexFrom} to ${indexTo}`
  };

  omit(position: number) {
    this.lastMove = `Omit node at position ${position}`
  }

  select($event: Event, position: number) {
    const target = $event.target as HTMLSelectElement
    const option: string = target.value
    this.lastMove = `Reintroduce ${option} at position ${position}`
  }

  getClass(item: Position | Cell) {
    if (item.backgroundClass === BackgroundClass.EVEN) {
      return {'even': true}
    } else if (item.backgroundClass === BackgroundClass.ODD) {
      return {'odd': true}
    } else {
      return {'doubleOdd': true}
    }
  }

  receiveFromParent(message: string) {
    this.receivedFromParent = message
  }
}

interface View {
  header: Position[],
  body: BodyRow[]
}

interface BodyRow {
  header: Position
  cells: Cell[]
}

interface Position {
  position: number
  backgroundClass: BackgroundClass
  nodeId: string | null
  fillOptions: string[]
}

interface Cell {
  fromPosition: number,
  toPosition: number,
  backgroundClass: BackgroundClass
  fromAndToHaveNode: boolean,
  hasEdge: boolean
}

enum BackgroundClass {
  EVEN = "even",
  ODD = "odd",
  DOUBLE_ODD = "doubleOdd"
}