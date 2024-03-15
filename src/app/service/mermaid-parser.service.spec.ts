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
});
