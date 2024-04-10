import { Component, EventEmitter, Output } from '@angular/core';
import { Dimensions } from '../flow-chart-editor/flow-chart-editor.component';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

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
    this.onDimensions.emit(this.lastPosted)
  }
}

function getFactoryDimensions(): Dimensions {
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
