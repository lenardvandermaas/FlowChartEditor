import { ConcreteNode, Node, ConcreteGraphBase, GraphConnectionsDecorator } from '../model/graph'
import { calculateLayerNumbers } from './horizontalGrouping'

describe('Calculating layer numbers', () => {
  it('Two disconnected nodes can appear on same layer', () => {
    const g = new GraphConnectionsDecorator(getSimpleGraph())
    const result = calculateLayerNumbers(g)
    expect(result.size).toBe(3)
    expect(result.get('Start')).toBe(0)
    expect(result.get('N1')).toBe(1)
    expect(result.get('N2')).toBe(1)
  });

  it('Node cannot appear on same layer as node that points to it', () => {
    const b = getSimpleGraph()
    b.addExistingNode(newNode('End'))
    connect('N1', 'End', b)
    const g = new GraphConnectionsDecorator(b)
    const result = calculateLayerNumbers(g)
    expect(result.size).toBe(4)
    expect(result.get('Start')).toBe(0)
    expect(result.get('N1')).toBe(1)
    expect(result.get('N2')).toBe(1)
    expect(result.get('End')).toBe(2)
  })

  it('If multiple nodes have no predecessors, all are on layer 0', () => {
    const b = getSimplePlusDisjointEdge()
    const g = new GraphConnectionsDecorator(b)
    const result = calculateLayerNumbers(g)
    expect(result.size).toBe(5)
    expect(result.get('Start')).toBe(0)
    expect(result.get('X0')).toBe(0)
    expect(result.get('N1')).toBe(1)
    expect(result.get('N2')).toBe(1)
    expect(result.get('X1')).toBe(1)
  })

  it('A cycle is ignored because no root node is found on the cycle', () => {
    const b = getSimplePlusDisjointEdge()
    connect('X1', 'X0', b)
    const g = new GraphConnectionsDecorator(b)
    const result = calculateLayerNumbers(g)
    expect(result.size).toBe(3)
    expect([ ... result.keys()].sort()).toEqual(['N1', 'N2', 'Start'])
  })

  it('Edge order controls order of layer assignment (1)', () => {
    const b = getSimpleNodesForGraph()
    connect('Start', 'N1', b)
    connect('Start', 'N2', b)
    connect('N1', 'N2', b)
    const g = new GraphConnectionsDecorator(b)
    const result = calculateLayerNumbers(g)
    expect(result.get('N1')).toBe(1)
    expect(result.get('N2')).toBe(2)
  })

  it('Edge order controls order of layer assignment (2)', () => {
    const b = getSimpleNodesForGraph()
    connect('Start', 'N2', b)
    connect('Start', 'N1', b)
    connect('N1', 'N2', b)
    const g = new GraphConnectionsDecorator(b)
    const result = calculateLayerNumbers(g)
    expect(result.get('N2')).toBe(1)
    expect(result.get('N1')).toBe(2)
  })

  function newNode(id: string): Node {
    return new ConcreteNode(0, id, '', '')
  }
  
  function connect(idFrom: string, idTo: string, g: ConcreteGraphBase) {
    g.connect(g.getNodeById(idFrom)!, g.getNodeById(idTo)!)
  }

  function getSimpleNodesForGraph() {
    const b = new ConcreteGraphBase()
    b.addExistingNode(newNode('Start'))
    b.addExistingNode(newNode('N1'))
    b.addExistingNode(newNode('N2'))
    return b
  }

  function getSimpleGraph(): ConcreteGraphBase {
    const b = getSimpleNodesForGraph()
    connect('Start', 'N1', b)
    connect('Start', 'N2', b)
    return b
  }

  function getSimplePlusDisjointEdge(): ConcreteGraphBase {
    const b = getSimpleGraph()
    b.addExistingNode(newNode('X0'))
    b.addExistingNode(newNode('X1'))
    connect('X0', 'X1', b)
    return b
  }
})

  /*
    Test calculating layer numbers:
    - One non-trivial graph should be enough.

    Test NodeSequenceEditorBuilder:
    - Original edge on same layer.
    - Intermediate edge down two layers.
    - Intermediate edge up two layers.
    - Intermediate edge that passes three layers up.
    - Intermediate edge that passes three layers down.
  */
