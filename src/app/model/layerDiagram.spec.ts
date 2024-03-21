import { ConcreteLayerStructure, LayerStructure, NodeSequenceForLayerStructure, UpdateResponse } from "./layerDiagram";
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
    // Do not use .toBeUndefined, because that does not check anything.
    expect(instance.getNodeById('xxx')).toBe(undefined)
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
    expect(instance.getEdgeByKey('xxx')).toBe(undefined)
  })

  it('Member functions on layers', () => {
    let instance = getLayerStructureToCheckOrdering()
    instance.init()
    expect(instance.getNumLayers()).toBe(2)
    expect(instance.getPositionsInLayer(0)).toEqual([0, 1, 2])
    expect(instance.getPositionsInLayer(1)).toEqual([3, 4])
    expect([0, 1, 2, 3, 4].map(i => instance.getLayerOfPosition(i)))
      .toEqual([0, 0, 0, 1, 1])
    expect(instance.getLayerOfNode(instance.getNodeById('1A')!)).toBe(0)
    expect(instance.getLayerOfNode(instance.getNodeById('4C')!)).toBe(1)
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
    checkInitialState(instance)
  })

  function checkInitialState(instance: NodeSequenceForLayerStructure) {
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
    expect(instance.getOrderedOmittedNodes()).toEqual([])
    expect(instance.getOrderedOmittedNodesInLayer(0)).toEqual([])
    expect(instance.getOrderedOmittedNodesInLayer(1)).toEqual([])
  }

  it('Move node upward, rotating the nodes in between', () => {
    const base: ConcreteLayerStructure = getSimpleLayerStructure()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    expect(instance.rotateToSwap(0, 2)).toBe(UpdateResponse.ACCEPTED)
    expect(instance.getSequenceInLayer(0).map(n => n!.getId())).toEqual(['B', 'E', 'A'])
    expect(instance.getSequenceInLayer(1).map(n => n!.getId())).toEqual(['C', 'D'])
    expect(instance.getSequence().map(n => n!.getId())).toEqual(['B', 'E', 'A', 'C', 'D'])
    expect(instance.getCell(2, 3).getEdgeIfConnected()!.getFrom().getId()).toBe('A')
    expect(instance.getCell(2, 3).getEdgeIfConnected()!.getTo().getId()).toBe('C')
  })

  it('Move node downward, rotating the nodes in between', () => {
    const base: ConcreteLayerStructure = getSimpleLayerStructure()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    expect(instance.rotateToSwap(2, 0)).toBe(UpdateResponse.ACCEPTED)
    expect(instance.getSequenceInLayer(0).map(n => n!.getId())).toEqual(['E', 'A', 'B'])
    expect(instance.getSequenceInLayer(1).map(n => n!.getId())).toEqual(['C', 'D'])
    expect(instance.getSequence().map(n => n!.getId())).toEqual(['E', 'A', 'B', 'C', 'D'])
    expect(instance.getCell(1, 3).getEdgeIfConnected()!.getFrom().getId()).toBe('A')
    expect(instance.getCell(1, 3).getEdgeIfConnected()!.getTo().getId()).toBe('C')
  })

  it('Move node up to swap with adjacent', () => {
    const base: ConcreteLayerStructure = getSimpleLayerStructure()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    expect(instance.rotateToSwap(3, 4)).toBe(UpdateResponse.ACCEPTED)
    checkAfterSwapping(instance)
  })

  function checkAfterSwapping(instance: NodeSequenceForLayerStructure) {
    expect(instance.getSequenceInLayer(0).map(n => n!.getId())).toEqual(['A', 'B', 'E'])
    expect(instance.getSequenceInLayer(1).map(n => n!.getId())).toEqual(['D', 'C'])
    expect(instance.getSequence().map(n => n!.getId())).toEqual(['A', 'B', 'E', 'D', 'C'])
    expect(instance.getCell(0, 4).getEdgeIfConnected()!.getFrom().getId()).toBe('A')
    expect(instance.getCell(0, 4).getEdgeIfConnected()!.getTo().getId()).toBe('C')
  }

  it('Move node down to swap with adjacent', () => {
    const base: ConcreteLayerStructure = getSimpleLayerStructure()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    expect(instance.rotateToSwap(4, 3)).toBe(UpdateResponse.ACCEPTED)
    checkAfterSwapping(instance)
  })

  it('Omit node that is from node of edge', () => {
    const base: ConcreteLayerStructure = getSimpleLayerStructure()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    instance.omitNodeFrom(0)
    checkStateAfterOmittingPositionZero(instance)
  })

  function checkStateAfterOmittingPositionZero(instance: NodeSequenceForLayerStructure) {
    expect(instance.getSequence()[0]).toBe(null)
    expect(instance.getSequence().slice(1, 5).map(n => n!.getId())).toEqual(['B', 'E', 'C', 'D'])
    expect(instance.getSequenceInLayer(0)[0]).toBe(null)
    expect(instance.getSequenceInLayer(0).length).toBe(3)
    expect(instance.getSequenceInLayer(0).slice(1, 3).map(n => n!.getId())).toEqual(['B', 'E'])
    expect(instance.getSequenceInLayer(1).map(n => n!.getId())).toEqual(['C', 'D'])
    const cell03 = instance.getCell(0, 3)
    expect(cell03.getFromPosition()).toBe(0)
    expect(cell03.getToPosition()).toBe(3)
    expect(cell03.getLayerFrom()).toBe(0)
    expect(cell03.getLayerTo()).toBe(1)
    expect(cell03.getEdgeIfConnected()).toBe(null)
    expect(instance.getCell(1, 2).getEdgeIfConnected()).not.toBe(null)
    expect(instance.getOrderedOmittedNodes().map(n => n.getId())).toEqual(['A'])
    expect(instance.getOrderedOmittedNodesInLayer(0).map(n => n.getId())).toEqual(['A'])
    expect(instance.getOrderedOmittedNodesInLayer(1).length).toBe(0)
  }

  it('Omit node that is to node of edge', () => {
    const base: ConcreteLayerStructure = getSimpleLayerStructure()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    instance.omitNodeFrom(3)
    const cell03 = instance.getCell(0, 3)
    expect(cell03.getEdgeIfConnected()).toBe(null)
  })

  it('Check order of omitted nodes and reintroducing', () => {
    const base: ConcreteLayerStructure = getLayerStructureToCheckOrdering()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    instance.omitNodeFrom(0)
    instance.omitNodeFrom(1)
    instance.omitNodeFrom(2)
    instance.omitNodeFrom(3)
    expect(instance.getOrderedOmittedNodes().map(n => n.getId())).toEqual(['1A', '5B', '2E', '4C'])
    expect(instance.getOrderedOmittedNodesInLayer(0).map(n => n.getId())).toEqual(['1A', '5B', '2E'])
    expect(instance.reintroduceNode(0, instance.getLayerStructure().getNodeById('1A')!))
    expect(instance.getOrderedOmittedNodes().map(n => n.getId())).toEqual(['5B', '2E', '4C'])
    expect(instance.getOrderedOmittedNodesInLayer(0).map(n => n.getId())).toEqual(['5B', '2E'])
    expect(instance.getSequence()[0]!.getId()).toBe('1A')
    // Rejected because position already filled and wrong layer
    expect(instance.reintroduceNode(0, instance.getLayerStructure().getNodeById('4C')!)).toBe(UpdateResponse.REJECTED)
    expect(instance.getCell(0, 3).getEdgeIfConnected()).toBe(null)
    expect(instance.reintroduceNode(3, instance.getLayerStructure().getNodeById('4C')!)).toBe(UpdateResponse.ACCEPTED)
    expect(instance.getCell(0, 3).getEdgeIfConnected()).not.toBe(null)
  })

  it('Check rotateToSwap swapping same node does nothing', () => {
    const base: ConcreteLayerStructure = getSimpleLayerStructure()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    expect(instance.rotateToSwap(0, 0)).toBe(UpdateResponse.ACCEPTED)
    checkInitialState(instance)
  })

  it('Check rotateToSwap swapping nodes from different layers is rejected', () => {
    const base: ConcreteLayerStructure = getSimpleLayerStructure()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    expect(instance.rotateToSwap(0, 3)).toBe(UpdateResponse.REJECTED)
    checkInitialState(instance)
  })

  it('Cannot reintroduce node at position that is filled', () => {
    const base: ConcreteLayerStructure = getSimpleLayerStructure()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    expect(instance.omitNodeFrom(0)).toBe(UpdateResponse.ACCEPTED)
    checkStateAfterOmittingPositionZero(instance)
    const node: Node = instance.getLayerStructure().getNodeById('A')!
    expect(node.getId()).toBe('A')
    expect(instance.reintroduceNode(1, node)).toBe(UpdateResponse.REJECTED)
    checkStateAfterOmittingPositionZero(instance)
  })

  it('Cannot duplicate node by reintroducing it in an empty spot', () => {
    const base: ConcreteLayerStructure = getSimpleLayerStructure()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    expect(instance.omitNodeFrom(0)).toBe(UpdateResponse.ACCEPTED)
    checkStateAfterOmittingPositionZero(instance)
    expect(instance.reintroduceNode(0, instance.getSequence()[1]!)).toBe(UpdateResponse.REJECTED)
    checkStateAfterOmittingPositionZero(instance)
  })

  it('Cannot reintroduce node that belongs to different layer', () => {
    const base: ConcreteLayerStructure = getSimpleLayerStructure()
    base.init()
    const instance: NodeSequenceForLayerStructure = base.getInitialSequence()
    expect(instance.omitNodeFrom(0)).toBe(UpdateResponse.ACCEPTED)
    expect(instance.omitNodeFrom(3)).toBe(UpdateResponse.ACCEPTED)
    checkStateAfterOmittingPositionsZeroAndThree(instance)
    const node: Node = instance.getLayerStructure().getNodeById('A')!
    expect(node.getId()).toBe('A')
    expect(instance.reintroduceNode(3, node)).toBe(UpdateResponse.REJECTED)
    checkStateAfterOmittingPositionsZeroAndThree(instance)
  })

  function checkStateAfterOmittingPositionsZeroAndThree(instance: NodeSequenceForLayerStructure) {
    expect(instance.getSequence().length).toBe(5)
    expect(instance.getSequence()[0]).toBe(null)
    expect(instance.getSequence()[1]!.getId()).toBe('B')
    expect(instance.getSequence()[2]!.getId()).toBe('E')
    expect(instance.getSequence()[3]).toBe(null)
    expect(instance.getSequence()[4]!.getId()).toBe('D')
    expect(instance.getSequenceInLayer(0).length).toBe(3)
    expect(instance.getSequenceInLayer(0)[0]).toBe(null)
    expect(instance.getSequenceInLayer(0)[1]!.getId()).toBe('B')
    expect(instance.getSequenceInLayer(0)[2]!.getId()).toBe('E')
    expect(instance.getSequenceInLayer(1).length).toBe(2)
    expect(instance.getSequenceInLayer(1)[0]).toBe(null)
    expect(instance.getSequenceInLayer(1)[1]!.getId()).toBe('D')
    expect(instance.getOrderedOmittedNodes().map(n => n.getId())).toEqual(['A', 'C'])
    expect(instance.getOrderedOmittedNodesInLayer(0).map(n => n.getId())).toEqual(['A'])
    expect(instance.getOrderedOmittedNodesInLayer(1).map(n => n.getId())).toEqual(['C'])
  }
})

/*
  getLayerStructure(): LayerStructure
  getSequence(): readonly OptionalNode[]
  getSequenceInLayer(layerNumber: number): readonly OptionalNode[]
  rotateToSwap(posFrom: number, posTo: number): UpdateResponse
  omitNodeFrom(position: number): UpdateResponse
  reintroduceNode(position: number, node: Node): UpdateResponse
  getOrderedOmittedNodes(): readonly Node[]
  getOrderedOmittedNodesInLayer(layerNumber: number): readonly Node[]
  getCell(positionFrom: number, positionTo: number): NodeSequenceCell
*/
