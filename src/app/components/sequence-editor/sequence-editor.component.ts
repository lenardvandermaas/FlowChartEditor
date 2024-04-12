import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop'
import { CommonModule, NgFor } from '@angular/common'
import { NodeSequenceEditor, NodeSequenceEditorCell, NodeOrEdgeSelection } from '../../model/nodeSequenceEditor';
import { getRange } from '../../util/util';
import { NodeCaptionChoice, OptionalNode, getCaption, getEdgeKey } from '../../model/graph';

@Component({
  selector: 'app-sequence-editor',
  standalone: true,
  imports: [ DragDropModule, CommonModule, NgFor ],
  templateUrl: './sequence-editor.component.html',
  styleUrl: './sequence-editor.component.scss'
})
export class SequenceEditorComponent {
  view: View = this.getEmptyView()
  showText: boolean = false
  captionChoice: NodeCaptionChoice = this.updateCaptionChoice()

  updateCaptionChoice(): NodeCaptionChoice {
    if (this.showText) {
      return NodeCaptionChoice.TEXT
    }
    return NodeCaptionChoice.ID
  }

  onNewCaptionChoice() {
    this.showText = (! this.showText)
    this.captionChoice = this.updateCaptionChoice()
    if (this.model !== null) {
      this.view = this.getView(this.model!)
    }
  }

  private _model: NodeSequenceEditor | null = null

  get model(): NodeSequenceEditor | null {
    return this._model
  }

  @Input()
  set model(model: NodeSequenceEditor | null) {
    this._model = model
    if (this.model === null) {
      this.view = this.getEmptyView()
    } else {
      this.view = this.getView(model!)
    }
  }

  getEmptyView(): View {
    return {
      header: [],
      body: []
    }
  }

  @Input()
  selection: NodeOrEdgeSelection = NodeOrEdgeSelection.create()

  @Output()
  onChanged: EventEmitter<any> = new EventEmitter<any>()

  drop($event: CdkDragDrop<string>) {
    if (this.model !== null) {
      const indexFrom = $event.previousIndex
      const indexTo = $event.currentIndex
      this.model.rotateToSwap(indexFrom, indexTo)
      this.view = this.getView(this.model!)
      this.onChanged.emit(true)
    }
  };

  omit(position: number) {
    if (this.model !== null) {
      this.model!.omitNodeFrom(position)
      this.view = this.getView(this.model)
      this.onChanged.emit(true)
    }
  }

  reintroducePulldownSelect($event: Event, position: number) {
    if (this.model !== null) {
      const target = $event.target as HTMLSelectElement
      const option: string = target.value
      this.model!.reintroduceNode(position, this.model.getNodeById(option)!)
      this.view = this.getView(this.model)
      this.onChanged.emit(true)
    }
  }

  selectNode(index: number) {
    console.log(`Node selected ${index}`)
    if (this.model === null) {
      return
    }
    const optionalNode: OptionalNode = this.model.getSequence()[index]
    if (optionalNode !== null) {
      this.selection.selectNode(optionalNode.getId(), this.model)
    }
    this.view = this.getView(this.model)
    this.onChanged.emit(true)
  }

  selectCell(indexFrom: number, indexTo: number) {
    console.log(`Cell selected: from ${indexFrom}, to: ${indexTo}`)
    if (this.model === null) {
      return
    }
    const optionalFrom = this.model.getSequence()[indexFrom]
    const optionalTo = this.model.getSequence()[indexTo]
    if ( (optionalFrom !== null) && (optionalTo !== null) ) {
      const keyToSelect = getEdgeKey(optionalFrom, optionalTo)
      this.selection.selectEdge(keyToSelect, this.model)
    }
    this.view = this.getView(this.model)
    this.onChanged.emit(true)
  }

  getClass(item: Position | Cell): string[] {
    const result = []
    if (item.selected === true) {
      result.push('selected')
    }
    if (item.backgroundClass === BackgroundClass.EVEN) {
      result.push('even')
    } else if (item.backgroundClass === BackgroundClass.ODD) {
      result.push('odd')
    } else {
      result.push('doubleOdd')
    }
    return result
  }

  getCellClass(cell: Cell) {
    const result = ['edgeMark']
    if (cell.hasEdge) {
      result.push('hasEdge')
    }
    return result
  }

  getView(model: NodeSequenceEditor): View {
    return {
      header: getRange(0, model.getSequence().length)
        .map(index => this.getPosition(index, model, (index, model) => NodeOrEdgeSelection.isToPositionSelectedInEditor(index, model, this.selection))),
      body: getRange(0, model.getSequence().length)
        .map(indexFrom => {
          return {
            header: this.getPosition(indexFrom, model, (index, model) => NodeOrEdgeSelection.isFromPositionSelectedInEditor(index, model, this.selection)),
            cells: getRange(0, model.getSequence().length)
              .map(indexTo => {
                return this.getCell(indexFrom, indexTo, model)
              })
          }
        })
    }
  }

  private getPosition(index: number, model: NodeSequenceEditor, selectionGetter: SelectionGetter): Position {
    const node = model.getSequence()[index]
    return {
      position: index,
      nodeId: node === null ? null : getCaption(node, this.captionChoice),
      backgroundClass: model.getLayerOfPosition(index) % 2 === 1 ? BackgroundClass.ODD : BackgroundClass.EVEN,
      fillOptions: node !== null ? [] : model.getOrderedOmittedNodesInLayer(model.getLayerOfPosition(index)).map(omitted => omitted.getId()),
      selected: selectionGetter(index, model)
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
      hasEdge: modelCell.getEdgeIfConnected() !== null,
      selected: NodeOrEdgeSelection.isCellSelectedInEditor(indexFrom, indexTo, model, this.selection)
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
  selected: boolean
}

interface Cell {
  fromPosition: number,
  toPosition: number,
  backgroundClass: BackgroundClass
  fromAndToHaveNode: boolean,
  hasEdge: boolean
  selected: boolean
}

export enum BackgroundClass {
  EVEN = "even",
  ODD = "odd",
  DOUBLE_ODD = "doubleOdd"
}

type SelectionGetter = (index: number, model: NodeSequenceEditor) => boolean
