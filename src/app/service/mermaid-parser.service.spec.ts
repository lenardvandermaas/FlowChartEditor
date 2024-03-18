import { TestBed } from '@angular/core/testing';

import { MermaidParserService } from './mermaid-parser.service';
import { ConcreteNode, ConcreteEdge } from '../model/graph'

describe('MermaidParserService', () => {
  let service: MermaidParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MermaidParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('Simple node definition', () => {
    const input = `
flowchart
    d2e2("<b>Test1</b><br/>JavaListener"):::normal
  `
    const result = service.getGraph(input)
    expect(result.getNodes().length).toEqual(1)
    expect((result.getNodes()[0] as ConcreteNode).sequence).toEqual(0)
    expect(result.getNodes()[0].getId()).toEqual('d2e2')
    expect((result.getNodes()[0] as ConcreteNode).style).toEqual('normal')
  })

  it('Nodes connected by edge', () => {
    const input = `
flowchart
d2e2("<b>Test1</b><br/>JavaListener"):::normal
d2e12("<b>InputValidator</b>"):::normal
d2e2 --> |success| d2e12
    `
    const result = service.getGraph(input)
    expect(result.getNodes().length).toEqual(2)
    expect((result.getNodes()[0] as ConcreteNode).sequence).toEqual(0)
    expect((result.getNodes()[1] as ConcreteNode).sequence).toEqual(1)
    expect(result.getNodes()[0].getId()).toBe('d2e2')
    expect(result.getNodes()[1].getId()).toBe('d2e12')
    expect((result.getNodes()[0] as ConcreteNode).text).toContain('Test')
    expect((result.getNodes()[1] as ConcreteNode).text).toContain('InputValidator')
    expect((result.getNodeById('d2e2')! as ConcreteNode).sequence).toBe(0)
    expect((result.getNodeById('d2e12')! as ConcreteNode).sequence).toBe(1)
    expect(result.getNodes()[0].getId()).toEqual('d2e2')
    expect((result.getNodes()[0] as ConcreteNode).style).toEqual('normal')
    expect(result.getEdges().length).toBe(1)
    expect(result.getEdges()[0].getFrom().getId()).toBe('d2e2')
    expect(result.getEdges()[0].getTo().getId()).toBe('d2e12')
    expect((result.getEdges()[0] as ConcreteEdge).seq).toBe(0)
    expect((result.getEdges()[0] as ConcreteEdge).text).toBe('success')
    expect(result.getEdgeByKey('d2e2-d2e12')!.getFrom().getId()).toBe('d2e2')
    expect(result.getEdgeByKey('d2e2-d2e12')!.getTo().getId()).toBe('d2e12')
  })
});
