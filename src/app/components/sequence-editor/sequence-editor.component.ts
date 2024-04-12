import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop'
import { CommonModule, NgFor } from '@angular/common'
import { NodeSequenceEditor, NodeSequenceEditorCell, NodeOrEdgeSelection } from '../../model/nodeSequenceEditor';
import { getRange } from '../../util/util';
import { NodeCaptionChoice, OptionalNode, getCaption, getEdgeKey } from '../../model/graph';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-sequence-editor',
  standalone: true,
  imports: [ DragDropModule, CommonModule, NgFor ],
  templateUrl: './sequence-editor.component.html',
  styleUrl: './sequence-editor.component.scss'
})
export class SequenceEditorComponent implements OnInit, OnDestroy {
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
      this.view = this.getView()
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
      this.view = this.getView()
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

  @Input() itemClickedObservable: Observable<string> | null = null
  private subscription: Subscription | null = null

  ngOnInit(): void {
    this.subscription = this.itemClickedObservable!.subscribe(value => SequenceEditorComponent.itemClicked(value, this))
  }
  
  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
  }

  private static itemClicked(itemClicked: string, context: SequenceEditorComponent) {
    if (itemClicked.indexOf('-') >= 0) {
      context.selectEdgeKey(itemClicked)
    } else {
      context.selectNodeId(itemClicked)
    }
  }

  @Output()
  onChanged: EventEmitter<any> = new EventEmitter<any>()

  drop($event: CdkDragDrop<string>) {
    if (this.model !== null) {
      const indexFrom = $event.previousIndex
      const indexTo = $event.currentIndex
      this.model.rotateToSwap(indexFrom, indexTo)
      this.view = this.getView()
      this.onChanged.emit(true)
    }
  };

  omit(position: number) {
    if (this.model !== null) {
      this.model!.omitNodeFrom(position)
      this.view = this.getView()
      this.onChanged.emit(true)
    }
  }

  reintroducePulldownSelect($event: Event, position: number) {
    if (this.model !== null) {
      const target = $event.target as HTMLSelectElement
      const option: string = target.value
      this.model!.reintroduceNode(position, this.model.getNodeById(option)!)
      this.view = this.getView()
      this.onChanged.emit(true)
    }
  }

  selectNodeId(nodeId: string) {
    if (this.model === null) {
      return
    }
    const index: number = this.positionOfNode(nodeId)
    if (index >= 0) {
      this.selectNode(index)
    }
  }

  private positionOfNode(nodeId: string): number {
    return this.model!.getSequence()
      .map(n => n === null ? null : n.getId())
      .indexOf(nodeId)
  }

  selectNode(index: number) {
    if (this.model === null) {
      return
    }
    this.selection.selectPosition(index, this.model)
    this.view = this.getView()
    this.onChanged.emit(true)
  }

  selectEdgeKey(key: string) {
    const components = key.split('-')
    const fromId = components[0]
    const toId = components[1]
    const indexFrom = this.positionOfNode(fromId)
    const indexTo = this.positionOfNode(toId)
    if ( (indexFrom >= 0) && (indexTo >= 0)) {
      this.selectCell(indexFrom, indexTo)
    }
  }

  selectCell(indexFrom: number, indexTo: number) {
    if (this.model === null) {
      return
    }
    this.selection.selectCell(indexFrom, indexTo, this.model)
    this.view = this.getView()
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
    const result = []
    if (cell.fromPosition !== cell.toPosition) {
      result.push('edgeMark')
    }
    if (cell.hasEdge) {
      result.push('hasEdge')
    }
    return result
  }

  getView(): View {
    return {
      header: getRange(0, this.model!.getSequence().length)
        .map(indexTo => this.getPosition(indexTo, this.isToPositionHighlightedInEditor(indexTo))),
      body: getRange(0, this.model!.getSequence().length)
        .map(indexFrom => {
          return {
            header: this.getPosition(indexFrom, this.isFromPositionHighlightedInEditor(indexFrom)),
            cells: getRange(0, this.model!.getSequence().length)
              .map(indexTo => this.getCell(indexFrom, indexTo))
          }
        })
    }
  }

  private isFromPositionHighlightedInEditor(index: number): boolean {
    return this.selection.isFromPositionHighlightedInEditor(index, this.model!)
  }

  private isToPositionHighlightedInEditor(index: number,): boolean {
    return this.selection.isToPositionHighlightedInEditor(index, this.model!)
  }

  private isCellHighlightedInEditor(indexFrom: number, indexTo: number) {
    return this.selection.isCellHighlightedInEditor(indexFrom, indexTo, this.model!)
  }

  private getPosition(index: number, selected: boolean): Position {
    const node = this.model!.getSequence()[index]
    return {
      position: index,
      nodeId: node === null ? null : getCaption(node, this.captionChoice),
      backgroundClass: this.model!.getLayerOfPosition(index) % 2 === 1 ? BackgroundClass.ODD : BackgroundClass.EVEN,
      fillOptions: node !== null ? [] : this.model!.getOrderedOmittedNodesInLayer(this.model!.getLayerOfPosition(index)).map(omitted => omitted.getId()),
      selected
    }
  }

  private getCell(indexFrom: number, indexTo: number): Cell {
    const modelCell: NodeSequenceEditorCell = this.model!.getCell(indexFrom, indexTo)
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
      fromAndToHaveNode: (this.model!.getSequence()[indexFrom] !== null) && (this.model!.getSequence()[indexTo] !== null),
      hasEdge: modelCell.getEdgeIfConnected() !== null,
      selected: this.isCellHighlightedInEditor(indexFrom, indexTo)
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
