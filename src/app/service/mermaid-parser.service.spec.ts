import { TestBed } from '@angular/core/testing';

import { MermaidParserService } from './mermaid-parser.service';

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
    expect(result.nodes.length).toEqual(1)
    expect(result.nodes[0].sequence).toEqual(0)
    expect(result.nodes[0].id).toEqual('d2e2')
    expect(result.nodes[0].style).toEqual('normal')
  })

  it('Nodes connected by edge', () => {
    const input = `
flowchart
d2e2("<b>Test1</b><br/>JavaListener"):::normal
d2e12("<b>InputValidator</b>"):::normal
d2e2 --> |success| d2e12
    `
    const result = service.getGraph(input)
    expect(result.nodes.length).toEqual(2)
    expect(result.nodes[0].sequence).toEqual(0)
    expect(result.nodes[1].sequence).toEqual(1)
    expect(result.nodes[0].id).toBe('d2e2')
    expect(result.nodes[1].id).toBe('d2e12')
    expect(result.nodes[0].text).toContain('Test')
    expect(result.nodes[1].text).toContain('InputValidator')
    expect(result.nodesById.get('d2e2')!.sequence).toBe(0)
    expect(result.nodesById.get('d2e12')!.sequence).toBe(1)
    expect(result.nodes[0].id).toEqual('d2e2')
    expect(result.nodes[0].style).toEqual('normal')
    expect(result.edges.length).toBe(1)
    expect(result.edges[0].from.id).toBe('d2e2')
    expect(result.edges[0].to.id).toBe('d2e12')
    expect(result.edges[0].seq).toBe(0)
    expect(result.edges[0].text).toBe('success')
    expect(result.edgesByKey.get('d2e2-d2e12')!.from.id).toBe('d2e2')
    expect(result.edgesByKey.get('d2e2-d2e12')!.to.id).toBe('d2e12')
  })
});
