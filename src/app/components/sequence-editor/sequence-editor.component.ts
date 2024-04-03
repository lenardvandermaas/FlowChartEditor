import { Component } from '@angular/core';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop'
import { CommonModule, NgFor } from '@angular/common'
import { NodeSequenceEditor, NodeSequenceEditorCell } from '../../model/nodeSequenceEditor';
import { getRange } from '../../util/util';

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
  view: View = this.getEmptyView()

  lastMove = ''

  model: NodeSequenceEditor | null = null

  getEmptyView(): View {
    return {
      header: [],
      body: []
    }
  }

  drop($event: CdkDragDrop<string>) {
    if (this.model !== null) {
      const indexFrom = $event.previousIndex
      const indexTo = $event.currentIndex
      this.model.rotateToSwap(indexFrom, indexTo)
      this.view = this.getView(this.model!)
    }
  };

  omit(position: number) {
    if (this.model !== null) {
      this.model!.omitNodeFrom(position)
      this.view = this.getView(this.model)
    }
  }

  select($event: Event, position: number) {
    if (this.model !== null) {
      const target = $event.target as HTMLSelectElement
      const option: string = target.value
      this.model!.reintroduceNode(position, this.model.getNodeById(option)!)
      this.view = this.getView(this.model)
    }
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

  receiveModel(model: NodeSequenceEditor) {
    console.log('Receive model')
    this.model = model
    this.view = this.getView(this.model)
  }

  getView(model: NodeSequenceEditor): View {
    return {
      header: getRange(0, model.getSequence().length)
        .map(index => this.getPosition(index, model)),
      body: getRange(0, model.getSequence().length)
        .map(indexFrom => {
          return {
            header: this.getPosition(indexFrom, model),
            cells: getRange(0, model.getSequence().length)
              .map(indexTo => {
                return this.getCell(indexFrom, indexTo, model)
              })
          }
        })
    }
  }

  private getPosition(index: number, model: NodeSequenceEditor): Position {
    const node = model.getSequence()[index]
    return {
      position: index,
      nodeId: node === null ? null : node.getId()!,
      backgroundClass: model.getLayerOfPosition(index) % 2 === 1 ? BackgroundClass.ODD : BackgroundClass.EVEN,
      fillOptions: node !== null ? [] : model.getOrderedOmittedNodesInLayer(model.getLayerOfPosition(index)).map(omitted => omitted.getId())
    }
  }

  private getCell(indexFrom: number, indexTo: number, model: NodeSequenceEditor): Cell {
    const modelCell: NodeSequenceEditorCell = model.getCell(indexFrom, indexTo)
    let numOddLayers = 0
    if (modelCell.getLayerFrom() % 2 == 1) {
      ++numOddLayers
    }
    if (modelCell.getLayerTo() % 2 == 1) {
      ++numOddLayers
    }
    let bgClass: BackgroundClass = BackgroundClass.EVEN
    if (numOddLayers == 1) {
      bgClass = BackgroundClass.ODD
    } else if(numOddLayers == 2) {
      bgClass = BackgroundClass.DOUBLE_ODD
    }
    return {
      fromPosition: indexFrom,
      toPosition: indexTo,
      backgroundClass: bgClass,
      fromAndToHaveNode: (model.getSequence()[indexFrom] !== null) && (model.getSequence()[indexTo] !== null),
      hasEdge: modelCell.getEdgeIfConnected() !== null
    }
  }
}

export interface View {
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

export enum BackgroundClass {
  EVEN = "even",
  ODD = "odd",
  DOUBLE_ODD = "doubleOdd"
}