import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlowChartEditorComponent } from './flow-chart-editor.component';
import { CommonModule } from '@angular/common';
import { DimensionsEditorComponent } from '../dimensions-editor/dimensions-editor.component';
import { SequenceEditorComponent } from '../sequence-editor/sequence-editor.component';
import { FrankFlowchartComponent } from '../frank-flowchart/frank-flowchart.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

describe('FlowChartEditorComponent', () => {
  let component: FlowChartEditorComponent;
  let fixture: ComponentFixture<FlowChartEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule
      ],
      declarations: [FlowChartEditorComponent, DimensionsEditorComponent, SequenceEditorComponent, FrankFlowchartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FlowChartEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
