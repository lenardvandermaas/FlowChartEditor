import { ConcreteLayerStructure, LayerStructure, NodeSequenceForLayerStructure } from "./layerDiagram";
import { ConcreteNode, Node, ConcreteEdge, Edge, getEdgeKey } from "../model/graph"

function getLayerStructureToCheckOrdering(): ConcreteLayerStructure {
  const instance = new ConcreteLayerStructure()
  instance.newLayer()
  // The digids are in the ids to check that sorting
  // is not done alphabetically
  instance.newPosition(0, newTestNode('1A'))
  instance.newPosition(0, newTestNode('5B'))
  instance.newLayer()
  instance.newPosition(1, newTestNode('4C'))
  instance.newPosition(1, newTestNode('3D'))
  instance.newPosition(0, newTestNode('2E'))
  instance.addEdge(newEdge(instance.getNodeById('1A')!, instance.getNodeById('4C')!))
  instance.addEdge(newEdge(instance.getNodeById('5B')!, instance.getNodeById('2E')!))
  return instance
}

function newTestNode(id: string): Node {
  return new ConcreteNode(0, id, '', '')
}

function newEdge(nodeFrom: Node, nodeTo: Node): Edge {
  return new ConcreteEdge(0, nodeFrom, nodeTo, '')
}

describe('ConcreteLayerStructure', () => {
  it('Cannot get nodes if not initialized - that would be confusing because order is changed on init()', () => {
    let caught = false
    try {
      getLayerStructureToCheckOrdering().getNodes()
    } catch(e) {
      caught = true
    }
    expect(caught).toBe(true)
  })

  it('Nodes are ordered by layer, within layer order is preserved', () => {
    let instance = getLayerStructureToCheckOrdering()
    instance.init()
    const newOrder = instance.getNodes()
    const theIds = newOrder.map(n => n.getId())
    expect(theIds).toEqual(['1A', '5B', '2E', '4C', '3D'])
  })

  it('Get node by id', () => {
    let instance = getLayerStructureToCheckOrdering()
    instance.init()
    expect(instance.getNodeById('1A')?.getId()).toBe('1A')
    expect(instance.getNodeById('xxx')).toBeNull
  })

  it('Get edges', () => {
    let instance = getLayerStructureToCheckOrdering()
    instance.init()
    expect(instance.getEdges().map(edge => getEdgeKey(edge.getFrom(), edge.getTo())))
      .toEqual(['1A-4C', '5B-2E'])
  })

  it('Get edge by key', () => {
    let instance = getLayerStructureToCheckOrdering()
    instance.init()
    expect(instance.getEdgeByKey('1A-4C')?.getFrom().getId()).toEqual('1A')
    expect(instance.getEdgeByKey('xxx')).toBeUndefined
  })

  it('Member functions on layers', () => {
    let instance = getLayerStructureToCheckOrdering()
    instance.init()
    expect(instance.getNumLayers()).toBe(2)
    expect(instance.getPositionsInLayer(0)).toEqual([0, 1, 2])
    expect(instance.getPositionsInLayer(1)).toEqual([3, 4])
    expect([0, 1, 2, 3, 4].map(i => instance.getLayerOfPosition(i)))
      .toEqual([0, 0, 0, 1, 1])
  })
})

function getSimpleLayerStructure(): ConcreteLayerStructure {
  const instance = new ConcreteLayerStructure()
  instance.newLayer()
  // The digids are in the ids to check that sorting
  // is not done alphabetically
  instance.newPosition(0, newTestNode('A'))
  instance.newPosition(0, newTestNode('B'))
  instance.newLayer()
  instance.newPosition(1, newTestNode('C'))
  instance.newPosition(1, newTestNode('D'))
  instance.newPosition(0, newTestNode('E'))
  instance.addEdge(newEdge(instance.getNodeById('A')!, instance.getNodeById('C')!))
  instance.addEdge(newEdge(instance.getNodeById('B')!, instance.getNodeById('E')!))
  return instance
}

describe('ConcreteNodeSequence', () => {
  it('Check properly initialized', () => {
    const base: ConcreteLayerStructure = getSimpleLayerStructure()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    expect(instance.getLayerStructure()).toEqual(base)
    expect(instance.getSequence().map(n => n!.getId())).toEqual(['A', 'B', 'E', 'C', 'D'])
    expect(instance.getSequenceInLayer(0).map(n => n!.getId())).toEqual(['A', 'B', 'E'])
    expect(instance.getSequenceInLayer(1).map(n => n!.getId())).toEqual(['C', 'D'])
    const cell03 = instance.getCell(0, 3)
    expect(cell03.getFromPosition()).toEqual(0)
    expect(cell03.getToPosition()).toEqual(3)
    expect(cell03.getLayerFrom()).toEqual(0)
    expect(cell03.getLayerTo()).toEqual(1)
    expect(cell03.getEdgeIfConnected()!.getFrom().getId()).toBe('A')
    expect(cell03.getEdgeIfConnected()!.getTo().getId()).toBe('C')
  })
})