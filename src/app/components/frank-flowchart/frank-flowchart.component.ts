import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-frank-flowchart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './frank-flowchart.component.html',
  styleUrl: './frank-flowchart.component.scss'
})
export class FrankFlowchartComponent {
  @Input() zoom: number = 100
  @Input() drawing: Drawing = getEmptyDrawing()
  @Output() onShapeClicked: EventEmitter<string> = new EventEmitter()

  calcZoom(coord: number): number {
    return coord * this.zoom / 100
  }

  handleShapeClicked(id: string) {
    this.onShapeClicked.emit(id)
  }

  getRectangleClass(rectangle: Rectangle): string[] {
    const result = ["rectangle"]
    if (rectangle.selected) {
      result.push("selected")
    }
    return result
  }

  getLineClass(line: Line): string[] {
    const result = ["line"]
    if (line.selected) {
      result.push("selected")
    }
    if (line.isError) {
      result.push("error")
    }
    return result
  }
}

export interface Drawing {
  width: number
  height: number
  rectangles: Rectangle[]
  lines: Line[]
}

export interface Rectangle {
  id: string
  x: number
  y: number
  width: number
  height: number
  centerX: number
  centerY: number
  text: string
  selected: boolean
}

export interface Line {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  selected: boolean
  arrow: boolean
  isError: boolean
}

export function getEmptyDrawing(): Drawing {
  return  {
    width: 0,
    height: 0,
    rectangles: [],
    lines: []
  }
}