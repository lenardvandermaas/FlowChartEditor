import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlowChartEditorComponent } from './flow-chart-editor.component';

describe('FlowChartEditorComponent', () => {
  let component: FlowChartEditorComponent;
  let fixture: ComponentFixture<FlowChartEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlowChartEditorComponent]
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
