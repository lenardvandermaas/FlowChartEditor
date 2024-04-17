import { Directive, ElementRef, EventEmitter, Output } from '@angular/core';

@Directive({
  selector: '[appSvgZoomPan]'
})
export class SvgZoomPanDirective {

  @Output() newScale: EventEmitter<number> = new EventEmitter();

  svg: HTMLElement;
  svgSize: {w: number, h: number} = {w: 0, h: 0}
  viewBox: {x: number, y: number, w: number, h: number} = {x: 0, y: 0, w: 0, h: 0}
  isPanning: boolean = false
  startPoint: {x: number, y: number} = {x:0,y:0}
  endPoint: {x: number, y: number} = {x:0,y:0}
  scaleFactor = 10
  zoom: number = 1

  constructor(elementRef: ElementRef) {
    this.svg = elementRef.nativeElement
    this.svg.classList.add('moveable');

    this.resize()

    // Listen for resizing on this.svg on trigger, call this.resize
    new ResizeObserver(() => this.resize()).observe(this.svg)

    this.svg.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault()
      this.scale(e.offsetX, e.offsetY, Math.sign(e.deltaY))
    })

    this.svg.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0 && e.target === this.svg) {
        this.isPanning = true
        this.startPoint = {x:e.x,y:e.y}
      }
    })

    this.svg.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isPanning) this.pan(e)
    })

    this.svg.addEventListener('mouseup', (e: MouseEvent) => {
      if (this.isPanning && e.button === 0) {
        this.viewBox = this.pan(e)
        this.isPanning = false
      }
    })
  }

  scale(mx: number, my: number, direction: number) {
    this.setScaleFactor(this.scaleFactor + direction * 0.3)
    // viewBox size delta
    const dw = this.viewBox.w - this.svgSize.w * this.zoom
    const dh = this.viewBox.h - this.svgSize.h * this.zoom
    // viewBox offset delta
    const dx = dw*mx/this.svgSize.w
    const dy = dh*my/this.svgSize.h
    this.viewBox = {
      x: this.viewBox.x + dx,
      y: this.viewBox.y + dy,
      w: this.viewBox.w - dw,
      h: this.viewBox.h - dh
    }
    this.applyViewBox(this.viewBox)
  }

  resize() {
    const w = this.svg.clientWidth
    const h = this.svg.clientHeight
    if (w !== this.svgSize.w || h !== this.svgSize.h) {
      let nw = w
      let nh = h
      if (this.svgSize.w !== 0 && this.viewBox.w !== 0) {
        nw = this.viewBox.w/this.svgSize.w*w
      }
      if (this.svgSize.h !== 0 && this.viewBox.h !== 0) {
        nh = this.viewBox.h/this.svgSize.h*h
      }
      this.viewBox = {x:this.viewBox.x, y:this.viewBox.y, w: nw, h: nh}
      this.applyViewBox(this.viewBox)
      this.svgSize = {w, h}
    }
  }

  pan(e: MouseEvent): {x: number, y: number, w: number, h: number} {
    this.endPoint = {x:e.x,y:e.y}
    // viewBox offset delta
    const dx = (this.startPoint.x - this.endPoint.x)*this.zoom
    const dy = (this.startPoint.y - this.endPoint.y)*this.zoom
    const movedViewBox = {
      x: this.viewBox.x + dx,
      y: this.viewBox.y + dy,
      w: this.viewBox.w,
      h: this.viewBox.h
    }
    this.applyViewBox(movedViewBox)
    return movedViewBox;
  }

  applyViewBox(viewBox: {x: number, y: number, w: number, h: number}) {
    this.svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`)
  }

  setScaleFactor(factor: number) {
    this.scaleFactor = Math.max(0, factor)
    this.zoom = this.scaleFactor * this.scaleFactor / 100
    this.newScale.emit(this.zoom)
  }
}
