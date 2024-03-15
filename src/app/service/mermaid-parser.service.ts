import { Injectable } from '@angular/core';
import { Graph } from '../model/graph'

@Injectable({
  providedIn: 'root'
})
export class MermaidParserService {
  constructor() { }

  getGraph(str: string): Graph {
    const result = new Graph()
    const lines: string[] = str.split(/\r?\n/).map(line => line.trim());
    const nodeLines: string[] = lines.filter(line => line.search(/^[a-zA-Z0-9-]+\(/) === 0);
    const forwardLines: string[] = lines.filter(line => !(line.startsWith('classDef') || line.startsWith('linkStyle')) && line.search(/^[a-zA-Z0-9-]+ /) !== -1);
    nodeLines.forEach((line) => {
      const id = line.substring(0, line.indexOf('('))
      const text = line.substring(line.indexOf('(') + 2, line.lastIndexOf(')') - 1)
      const style = line.substring(line.lastIndexOf(':::') + 3)
      result.addNode(id, text, style)
    })
    forwardLines.forEach((line) => {
      const fromId = line.substring(0, line.indexOf(' '))
      const toId = line.substring(line.lastIndexOf(' ') + 1);
      const firstPipeIndex = line.indexOf('|');
      const text = firstPipeIndex < 0 ? undefined : line.substring(firstPipeIndex + 1, line.lastIndexOf('|'))
      if (! result.nodesById.has(fromId)) {
        throw new Error(`Intended edge references unknown from node [${fromId}]`)
      }
      const from = result.nodesById.get(fromId)!
      if (! result.nodesById.has(toId)) {
        throw new Error(`Intended edge references unknown to node [${toId}]`)
      }
      const to = result.nodesById.get(toId)!
      result.connect(from, to, text)
    })
    return result
  }
}
