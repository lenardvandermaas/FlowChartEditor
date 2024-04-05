import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SequenceEditorComponent, View, BackgroundClass } from './sequence-editor.component';
import { NodeSequenceEditor, ConcreteNodeSequenceEditor } from '../../model/nodeSequenceEditor';

import { ConcreteGraphBase, GraphConnectionsDecorator } from '../../model/graph';

describe('SequenceEditorComponent', () => {
  let component: SequenceEditorComponent;
  let fixture: ComponentFixture<SequenceEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SequenceEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SequenceEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('Should create correct View', () => {
    const b: ConcreteGraphBase = new ConcreteGraphBase()
    b.addNode('Start', '', '')
    b.addNode('N1', '', '')
    b.addNode('N2', '', '')
    b.addNode('End', '', '')
    b.connect(b.getNodeById('Start')!, b.getNodeById('N1')!)
    b.connect(b.getNodeById('Start')!, b.getNodeById('N2')!)
    b.connect(b.getNodeById('N1')!, b.getNodeById('End')!)
    b.connect(b.getNodeById('N2')!, b.getNodeById('End')!)
    const m: Map<string, number> = new Map([
      ['Start', 0],
      ['N1', 1],
      ['N2', 1],
      ['End', 2]
    ])
    const model: NodeSequenceEditor = new ConcreteNodeSequenceEditor(new GraphConnectionsDecorator(b), m)
    model.omitNodeFrom(1)
    const actual: View = component.getView(model)
    const expected = getTheView()
    expect(actual).toEqual(expected)
  })

  function getTheView(): View {
    return {
      header: [
        {position: 0, backgroundClass: BackgroundClass.EVEN, nodeId: "Start", fillOptions: []},
        {position: 1, backgroundClass: BackgroundClass.ODD, nodeId: null, fillOptions: ["N1"]},
        {position: 2, backgroundClass: BackgroundClass.ODD, nodeId: "N2", fillOptions: []},
        {position: 3, backgroundClass: BackgroundClass.EVEN, nodeId: "End", fillOptions: []}
      ],
      body: [
        {
          header: {position: 0, backgroundClass: BackgroundClass.EVEN, nodeId: "Start", fillOptions: []},
          cells: [
            {
              fromPosition: 0,
              toPosition: 0,
              backgroundClass: BackgroundClass.EVEN,
              fromAndToHaveNode: true,
              hasEdge: false
            },
            {
              fromPosition: 0,
              toPosition: 1,
              backgroundClass: BackgroundClass.ODD,
              fromAndToHaveNode: false,
              hasEdge: false
            },
            {
              fromPosition: 0,
              toPosition: 2,
              backgroundClass: BackgroundClass.ODD,
              fromAndToHaveNode: true,
              hasEdge: true
            },
            {
              fromPosition: 0,
              toPosition: 3,
              backgroundClass: BackgroundClass.EVEN,
              fromAndToHaveNode: true,
              hasEdge: false
            }
          ]
        },
        {
          header: {position: 1, backgroundClass: BackgroundClass.ODD, nodeId: null, fillOptions: ["N1"]},
          cells: [
            {
              fromPosition: 1,
              toPosition: 0,
              backgroundClass: BackgroundClass.ODD,
              fromAndToHaveNode: false,
              hasEdge: false
            },
            {
              fromPosition: 1,
              toPosition: 1,
              backgroundClass: BackgroundClass.DOUBLE_ODD,
              fromAndToHaveNode: false,
              hasEdge: false
            },
            {
              fromPosition: 1,
              toPosition: 2,
              backgroundClass: BackgroundClass.DOUBLE_ODD,
              fromAndToHaveNode: false,
              hasEdge: false
            },
            {
              fromPosition: 1,
              toPosition: 3,
              backgroundClass: BackgroundClass.ODD,
              fromAndToHaveNode: false,
              hasEdge: false
            }
          ]
        },
        {
          header: {position: 2, backgroundClass: BackgroundClass.ODD, nodeId: "N2", fillOptions: []},
          cells: [
            {
              fromPosition: 2,
              toPosition: 0,
              backgroundClass: BackgroundClass.ODD,
              fromAndToHaveNode: true,
              hasEdge: false
            },
            {
              fromPosition: 2,
              toPosition: 1,
              backgroundClass: BackgroundClass.DOUBLE_ODD,
              fromAndToHaveNode: false,
              hasEdge: false
            },
            {
              fromPosition: 2,
              toPosition: 2,
              backgroundClass: BackgroundClass.DOUBLE_ODD,
              fromAndToHaveNode: true,
              hasEdge: false
            },
            {
              fromPosition: 2,
              toPosition: 3,
              backgroundClass: BackgroundClass.ODD,
              fromAndToHaveNode: true,
              hasEdge: true
            }
          ]
        },
        {
          header: {position: 3, backgroundClass: BackgroundClass.EVEN, nodeId: "End", fillOptions: []},
          cells: [
            {
              fromPosition: 3,
              toPosition: 0,
              backgroundClass: BackgroundClass.EVEN,
              fromAndToHaveNode: true,
              hasEdge: false
            },
            {
              fromPosition: 3,
              toPosition: 1,
              backgroundClass: BackgroundClass.ODD,
              fromAndToHaveNode: false,
              hasEdge: false
            },
            {
              fromPosition: 3,
              toPosition: 2,
              backgroundClass: BackgroundClass.ODD,
              fromAndToHaveNode: true,
              hasEdge: false
            },
            {
              fromPosition: 3,
              toPosition: 3,
              backgroundClass: BackgroundClass.EVEN,
              fromAndToHaveNode: true,
              hasEdge: false
            }
          ]
        }
      ]
    }  
  }
});
