import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { NodeSequenceEditor } from '../../model/nodeSequenceEditor';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-frank-flowchart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './frank-flowchart.component.html',
  styleUrl: './frank-flowchart.component.scss'
})
export class FrankFlowchartComponent {
  @Input() zoom: number = 100
  @Input() drawing: Drawing | null = null

  calcZoom(coord: number): number {
    return coord * this.zoom / 100
  }

  // TODO: Remove test data and make this an input
  /*
  drawing: Drawing | null = {
    width: 200,
    height: 300,
    rectangles: [
      {id: "first", x: 50, y: 80, width: 100, height: 40, centerX: 100, centerY: 100, text: "My text"}
    ],
    lines: [
      {id: "line1", x1: 100, y1: 150, x2: 100, y2: 250}
    ]
  }
  */

  getRectangleClass(rectangle: Rectangle): string[] {
    // TODO: Implement
    return ["rectangle"]
  }

  getLineClass(line: Line): string[] {
    // TODO: Implement
    return ["line"]
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
}

export interface Line {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}
