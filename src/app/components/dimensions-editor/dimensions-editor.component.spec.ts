import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DimensionsEditorComponent } from './dimensions-editor.component';

describe('DimensionsEditorComponent', () => {
  let component: DimensionsEditorComponent;
  let fixture: ComponentFixture<DimensionsEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DimensionsEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DimensionsEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
