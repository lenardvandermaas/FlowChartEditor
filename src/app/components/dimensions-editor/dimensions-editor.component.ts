import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { NodeSpacingDimensions } from '../../graphics/node-layout';

export interface Dimensions extends NodeSpacingDimensions {
  nodeBoxWidth: number
  nodeBoxHeight: number
}

@Component({
  selector: 'app-dimensions-editor',
  templateUrl: './dimensions-editor.component.html',
  styleUrl: './dimensions-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DimensionsEditorComponent {
  editDimensions: Dimensions = getFactoryDimensions()
  lastPosted: Dimensions = getFactoryDimensions()

  @Output() onDimensions = new EventEmitter<Dimensions>()

  constructor() {
  }

  reset() {
    this.editDimensions = { ... this.lastPosted }
  }

  commit() {
    this.lastPosted = { ... this.editDimensions }
    this.onDimensions.emit({ ... this.lastPosted })
  }

  toFactory() {
    this.editDimensions = getFactoryDimensions()
    this.lastPosted = getFactoryDimensions()
    this.onDimensions.emit({ ... this.lastPosted })
  }
}

export function getFactoryDimensions(): Dimensions {
  return {
    layerHeight: 50,
    layerDistance: 120,
    nodeBoxHeight: 40,
    intermediateWidth: 60,
    nodeWidth: 120,
    omittedPlaceholderWidth: 90,
    nodeBoxWidth: 110
  }
}
