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
      this.view = SequenceEditorComponent.getView(this.model, this.captionChoice, this.selection)
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
      this.view = SequenceEditorComponent.getView(this.model, this.captionChoice, this.selection)
    }
  }

  getEmptyView(): View {
    return {
      header: [],
      body: []
    }
  }

  @Input()
  selection: NodeOrEdgeSelection = new NodeOrEdgeSelection()

  @Output()
  onChanged: EventEmitter<any> = new EventEmitter<any>()

  drop($event: CdkDragDrop<string>) {
    if (this.model !== null) {
      const indexFrom = $event.previousIndex
      const indexTo = $event.currentIndex
      this.model.rotateToSwap(indexFrom, indexTo)
      this.view = SequenceEditorComponent.getView(this.model, this.captionChoice, this.selection)
      this.onChanged.emit(true)
    }
  };

  omit(position: number) {
    if (this.model !== null) {
      this.model!.omitNodeFrom(position)
      this.view = SequenceEditorComponent.getView(this.model, this.captionChoice, this.selection)
      this.onChanged.emit(true)
    }
  }

  reintroducePulldownSelect($event: Event, position: number) {
    if (this.model !== null) {
      const target = $event.target as HTMLSelectElement
      const option: string = target.value
      this.model!.reintroduceNode(position, this.model.getNodeById(option)!)
      this.view = SequenceEditorComponent.getView(this.model, this.captionChoice, this.selection)
      this.onChanged.emit(true)
    }
  }

  selectNode(index: number) {
    if (this.model === null) {
      return
    }
    this.selection.selectPosition(index, this.model)
    this.view = SequenceEditorComponent.getView(this.model, this.captionChoice, this.selection)
    this.onChanged.emit(true)
  }

  selectCell(indexFrom: number, indexTo: number) {
    if (this.model === null) {
      return
    }
    this.selection.selectCell(indexFrom, indexTo, this.model)
    this.view = SequenceEditorComponent.getView(this.model, this.captionChoice, this.selection)
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

  static getView(model: NodeSequenceEditor, captionChoice: NodeCaptionChoice, selection: NodeOrEdgeSelection): View {
    return {
      header: getRange(0, model.getSequence().length)
        .map(indexTo => SequenceEditorComponent.getPosition(
          indexTo, model, captionChoice, SequenceEditorComponent.isToPositionHighlightedInEditor(indexTo, model, selection))),
      body: getRange(0, model.getSequence().length)
        .map(indexFrom => {
          return {
            header: SequenceEditorComponent.getPosition(
              indexFrom, model, captionChoice, SequenceEditorComponent.isFromPositionHighlightedInEditor(indexFrom, model, selection)),
            cells: getRange(0, model.getSequence().length)
              .map(indexTo => {
                return SequenceEditorComponent.getCell(
                  indexFrom, indexTo, SequenceEditorComponent.isCellHighlightedInEditor(indexFrom, indexTo, model, selection), model)
              })
          }
        })
    }
  }

  private static isFromPositionHighlightedInEditor(index: number, model: NodeSequenceEditor, selection: NodeOrEdgeSelection): boolean {
    return selection.isFromPositionHighlightedInEditor(index, model)
  }

  private static isToPositionHighlightedInEditor(index: number, model: NodeSequenceEditor, selection: NodeOrEdgeSelection): boolean {
    return selection.isToPositionHighlightedInEditor(index, model)
  }

  private static isCellHighlightedInEditor(indexFrom: number, indexTo: number, model: NodeSequenceEditor, selection: NodeOrEdgeSelection) {
    return selection.isCellHighlightedInEditor(indexFrom, indexTo, model)
  }

  private static getPosition(index: number, model: NodeSequenceEditor, captionChoice: NodeCaptionChoice,  selected: boolean): Position {
    const node = model.getSequence()[index]
    return {
      position: index,
      nodeId: node === null ? null : getCaption(node, captionChoice),
      backgroundClass: model.getLayerOfPosition(index) % 2 === 1 ? BackgroundClass.ODD : BackgroundClass.EVEN,
      fillOptions: node !== null ? [] : model.getOrderedOmittedNodesInLayer(model.getLayerOfPosition(index)).map(omitted => omitted.getId()),
      selected
    }
  }

  private static getCell(indexFrom: number, indexTo: number, selected: boolean, model: NodeSequenceEditor): Cell {
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
      selected
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
