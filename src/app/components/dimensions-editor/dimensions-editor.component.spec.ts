import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DimensionsEditorComponent } from './dimensions-editor.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

describe('DimensionsEditorComponent', () => {
  let component: DimensionsEditorComponent;
  let fixture: ComponentFixture<DimensionsEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule
      ],
      declarations: [DimensionsEditorComponent]
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
