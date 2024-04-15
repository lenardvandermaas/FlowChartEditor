import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Dimensions } from '../../graphics/edge-layout';

@Component({
  selector: 'app-dimensions-editor',
  standalone: true,
  imports: [FormsModule, NgClass],
  templateUrl: './dimensions-editor.component.html',
  styleUrl: './dimensions-editor.component.scss'
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
    nodeBoxWidth: 110,
    boxConnectorAreaPerc: 50
  }
}
