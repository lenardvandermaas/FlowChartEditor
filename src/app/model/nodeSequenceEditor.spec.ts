import { NodeSequenceEditor, ConcreteNodeSequenceEditor, UpdateResponse, NodeOrEdgeSelection } from "./nodeSequenceEditor";
import { ConcreteNode, Node, ConcreteEdge, Edge, ConcreteGraphBase, GraphBase, GraphConnectionsDecorator, Graph  } from "./graph"
import { NodeSequenceEditorBuilder } from "./horizontalGrouping";

function getInstanceToCheckOrdering(): ConcreteNodeSequenceEditor {
  const g = new ConcreteGraphBase()
  g.addExistingNode(newTestNode('1A'))
  g.addExistingNode(newTestNode('5B'))
  g.addExistingNode(newTestNode('4C'))
  g.addExistingNode(newTestNode('3D'))
  g.addExistingNode(newTestNode('2E'))
  g.addEdge(createNewEdge(g.getNodeById('1A')!, g.getNodeById('4C')!))
  g.addEdge(createNewEdge(g.getNodeById('5B')!, g.getNodeById('2E')!))
  const m = new Map<string, number>([
    ['1A', 0],
    ['5B', 0],
    ['4C', 1],
    ['3D', 1],
    ['2E', 0]
  ])
  return new ConcreteNodeSequenceEditor(new GraphConnectionsDecorator(g), m)
}

function newTestNode(id: string): Node {
  return new ConcreteNode(0, id, '', '')
}

function createNewEdge(nodeFrom: Node, nodeTo: Node): Edge {
  return new ConcreteEdge(0, nodeFrom, nodeTo, '')
}

function getSimpleInstance(): ConcreteNodeSequenceEditor {
  const g = new ConcreteGraphBase()
  addEdgesToSimple(g)
  return new ConcreteNodeSequenceEditor(new GraphConnectionsDecorator(g), simpleNodeToLayerMap())
}

function addEdgesToSimple(g: ConcreteGraphBase) {
  g.addExistingNode(newTestNode('A'))
  g.addExistingNode(newTestNode('B'))
  g.addExistingNode(newTestNode('C'))
  g.addExistingNode(newTestNode('D'))
  g.addExistingNode(newTestNode('E'))
  g.addEdge(createNewEdge(g.getNodeById('A')!, g.getNodeById('C')!))
  g.addEdge(createNewEdge(g.getNodeById('B')!, g.getNodeById('E')!))
}

function simpleNodeToLayerMap(): Map<string, number> {
  return new Map<string, number>([
    ['A', 0],
    ['B', 0],
    ['C', 1],
    ['D', 1],
    ['E', 0]
  ])
}

describe('NodeSequenceEditor', () => {
  it('Nodes are ordered by layer, within layer order is preserved', () => {
    let instance = getInstanceToCheckOrdering()
    const newOrder = instance.getSequence()
    const theIds = newOrder.map(n => n!.getId())
    expect(theIds).toEqual(['1A', '5B', '2E', '4C', '3D'])
  })

  it('If map nodeIdToLayer omits id then error', () => {
    const g = new ConcreteGraphBase()
    addEdgesToSimple(g)
    const m: Map<string, number> = simpleNodeToLayerMap()
    m.delete('A')
    expectInstanceCreationFails(g, m)  
  })

  function expectInstanceCreationFails(g: GraphBase, m: Map<string, number>) {
    let caught = false
    try {
      new ConcreteNodeSequenceEditor(new GraphConnectionsDecorator(g), m)  
    } catch(e) {
      caught = true
    }
    expect(caught).toBe(true)
  }

  it('If map nodeIdToLayer refers nonexistent node then error', () => {
    const g = new ConcreteGraphBase()
    addEdgesToSimple(g)
    const m: Map<string, number> = simpleNodeToLayerMap()
    m.set('X', 0)
    expectInstanceCreationFails(g, m)
  })

  it('If layer 0 is empty then error', () => {
    const g = new ConcreteGraphBase()
    addEdgesToSimple(g)
    const m: Map<string, number> = simpleNodeToLayerMap()
    const keysLayerZero: string[] = [ ... m.keys()].filter(k => m.get(k) == 0)
    keysLayerZero.forEach(k => m.set(k, 1))
    expectInstanceCreationFails(g, m)
  })

  it('If layer 1 is empty and there is a layer 2, then error', () => {
    const g = new ConcreteGraphBase()
    addEdgesToSimple(g)
    const m: Map<string, number> = simpleNodeToLayerMap()
    const keysLayerOne: string[] = [ ... m.keys()].filter(k => m.get(k) == 1)
    keysLayerOne.forEach(k => m.set(k, 2))
    expectInstanceCreationFails(g, m)
  })

  it('Member functions on layers', () => {
    let instance = getInstanceToCheckOrdering()
    expect(instance.getNumLayers()).toBe(2)
    expect(instance.getPositionsInLayer(0)).toEqual([0, 1, 2])
    expect(instance.getPositionsInLayer(1)).toEqual([3, 4])
    expect([0, 1, 2, 3, 4].map(i => instance.getLayerOfPosition(i)))
      .toEqual([0, 0, 0, 1, 1])
    expect(instance.getLayerOfNode(instance.graph.getNodeById('1A')!)).toBe(0)
    expect(instance.getLayerOfNode(instance.graph.getNodeById('4C')!)).toBe(1)
  })

  it('Check properly initialized', () => {
    const instance: ConcreteNodeSequenceEditor = getSimpleInstance()
    checkInitialState(instance)
  })

  function checkInitialState(instance: NodeSequenceEditor) {
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
    const instance: ConcreteNodeSequenceEditor = getSimpleInstance()
    expect(instance.rotateToSwap(0, 2)).toBe(UpdateResponse.ACCEPTED)
    expect(instance.getSequenceInLayer(0).map(n => n!.getId())).toEqual(['B', 'E', 'A'])
    expect(instance.getSequenceInLayer(1).map(n => n!.getId())).toEqual(['C', 'D'])
    expect(instance.getSequence().map(n => n!.getId())).toEqual(['B', 'E', 'A', 'C', 'D'])
    expect(instance.getCell(2, 3).getEdgeIfConnected()!.getFrom().getId()).toBe('A')
    expect(instance.getCell(2, 3).getEdgeIfConnected()!.getTo().getId()).toBe('C')
  })

  it('Move node downward, rotating the nodes in between', () => {
    const instance: ConcreteNodeSequenceEditor = getSimpleInstance()
    expect(instance.rotateToSwap(2, 0)).toBe(UpdateResponse.ACCEPTED)
    expect(instance.getSequenceInLayer(0).map(n => n!.getId())).toEqual(['E', 'A', 'B'])
    expect(instance.getSequenceInLayer(1).map(n => n!.getId())).toEqual(['C', 'D'])
    expect(instance.getSequence().map(n => n!.getId())).toEqual(['E', 'A', 'B', 'C', 'D'])
    expect(instance.getCell(1, 3).getEdgeIfConnected()!.getFrom().getId()).toBe('A')
    expect(instance.getCell(1, 3).getEdgeIfConnected()!.getTo().getId()).toBe('C')
  })

  it('Move node up to swap with adjacent', () => {
    const instance: ConcreteNodeSequenceEditor = getSimpleInstance()
    expect(instance.rotateToSwap(3, 4)).toBe(UpdateResponse.ACCEPTED)
    checkAfterSwapping(instance)
  })

  function checkAfterSwapping(instance: NodeSequenceEditor) {
    expect(instance.getSequenceInLayer(0).map(n => n!.getId())).toEqual(['A', 'B', 'E'])
    expect(instance.getSequenceInLayer(1).map(n => n!.getId())).toEqual(['D', 'C'])
    expect(instance.getSequence().map(n => n!.getId())).toEqual(['A', 'B', 'E', 'D', 'C'])
    expect(instance.getCell(0, 4).getEdgeIfConnected()!.getFrom().getId()).toBe('A')
    expect(instance.getCell(0, 4).getEdgeIfConnected()!.getTo().getId()).toBe('C')
  }

  it('Move node down to swap with adjacent', () => {
    const instance: ConcreteNodeSequenceEditor = getSimpleInstance()
    expect(instance.rotateToSwap(4, 3)).toBe(UpdateResponse.ACCEPTED)
    checkAfterSwapping(instance)
  })

  it('Omit node that is from node of edge', () => {
    const instance: ConcreteNodeSequenceEditor = getSimpleInstance()
    instance.omitNodeFrom(0)
    checkStateAfterOmittingPositionZero(instance)
  })

  function checkStateAfterOmittingPositionZero(instance: NodeSequenceEditor) {
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
    const instance: ConcreteNodeSequenceEditor = getSimpleInstance()
    instance.omitNodeFrom(3)
    const cell03 = instance.getCell(0, 3)
    expect(cell03.getEdgeIfConnected()).toBe(null)
  })

  it('Check order of omitted nodes and reintroducing', () => {
    const instance: ConcreteNodeSequenceEditor = getInstanceToCheckOrdering()
    instance.omitNodeFrom(0)
    instance.omitNodeFrom(1)
    instance.omitNodeFrom(2)
    instance.omitNodeFrom(3)
    // Omitted nodes are not in the editor, use their original order
    expect(instance.getOrderedOmittedNodes().map(n => n.getId())).toEqual(['1A', '5B', '4C', '2E'])
    expect(instance.getOrderedOmittedNodesInLayer(0).map(n => n.getId())).toEqual(['1A', '5B', '2E'])
    expect(instance.reintroduceNode(0, instance.graph.getNodeById('1A')!))
    expect(instance.getOrderedOmittedNodes().map(n => n.getId())).toEqual(['5B', '4C', '2E'])
    expect(instance.getOrderedOmittedNodesInLayer(0).map(n => n.getId())).toEqual(['5B', '2E'])
    expect(instance.getSequence()[0]!.getId()).toBe('1A')
    // Rejected because position already filled and wrong layer
    expect(instance.reintroduceNode(0, instance.graph.getNodeById('4C')!)).toBe(UpdateResponse.REJECTED)
    expect(instance.getCell(0, 3).getEdgeIfConnected()).toBe(null)
    expect(instance.reintroduceNode(3, instance.graph.getNodeById('4C')!)).toBe(UpdateResponse.ACCEPTED)
    expect(instance.getCell(0, 3).getEdgeIfConnected()).not.toBe(null)
  })

  it('Check rotateToSwap swapping same node does nothing', () => {
    const instance: ConcreteNodeSequenceEditor = getSimpleInstance()
    expect(instance.rotateToSwap(0, 0)).toBe(UpdateResponse.ACCEPTED)
    checkInitialState(instance)
  })

  it('Check rotateToSwap swapping nodes from different layers is rejected', () => {
    const instance: ConcreteNodeSequenceEditor = getSimpleInstance()
    expect(instance.rotateToSwap(0, 3)).toBe(UpdateResponse.REJECTED)
    checkInitialState(instance)
  })

  it('Cannot reintroduce node at position that is filled', () => {
    const instance: ConcreteNodeSequenceEditor = getSimpleInstance()
    expect(instance.omitNodeFrom(0)).toBe(UpdateResponse.ACCEPTED)
    checkStateAfterOmittingPositionZero(instance)
    const node: Node = instance.graph.getNodeById('A')!
    expect(node.getId()).toBe('A')
    expect(instance.reintroduceNode(1, node)).toBe(UpdateResponse.REJECTED)
    checkStateAfterOmittingPositionZero(instance)
  })

  it('Cannot duplicate node by reintroducing it in an empty spot', () => {
    const instance: ConcreteNodeSequenceEditor = getSimpleInstance()
    expect(instance.omitNodeFrom(0)).toBe(UpdateResponse.ACCEPTED)
    checkStateAfterOmittingPositionZero(instance)
    expect(instance.reintroduceNode(0, instance.getSequence()[1]!)).toBe(UpdateResponse.REJECTED)
    checkStateAfterOmittingPositionZero(instance)
  })

  it('Cannot reintroduce node that belongs to different layer', () => {
    const instance: ConcreteNodeSequenceEditor = getSimpleInstance()
    expect(instance.omitNodeFrom(0)).toBe(UpdateResponse.ACCEPTED)
    expect(instance.omitNodeFrom(3)).toBe(UpdateResponse.ACCEPTED)
    checkStateAfterOmittingPositionsZeroAndThree(instance)
    const node: Node = instance.graph.getNodeById('A')!
    expect(node.getId()).toBe('A')
    expect(instance.reintroduceNode(3, node)).toBe(UpdateResponse.REJECTED)
    checkStateAfterOmittingPositionsZeroAndThree(instance)
  })

  function checkStateAfterOmittingPositionsZeroAndThree(instance: NodeSequenceEditor) {
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

describe('NodeOrEdgeSelection', () => {
  it ('Select node and undo again', () => {
    const m = getSelectionTestModel()
    expect(m.getSequence().map(n => n!.getId())).toEqual(['Start', 'N1', 'N2', 'End'])
    let instance = new NodeOrEdgeSelection()
    checkNothingSelected(instance, m)
    instance.selectPosition(1, m)
    checkNodeN1SelectedCorrectly(instance, m)
    instance.selectPosition(2, m)
    expect(instance.isFromPositionHighlightedInEditor(2, m)).toBe(true)
    instance.selectPosition(2, m)
    checkNothingSelected(instance, m)
  })

  it('Select edge and undo again', () => {
    const m = getSelectionTestModel()
    expect(m.getSequence().map(n => n!.getId())).toEqual(['Start', 'N1', 'N2', 'End'])
    let instance = new NodeOrEdgeSelection()
    checkNothingSelected(instance, m)
    instance.selectCell(0, 1, m)
    checkEdgeStartN1SelectedCorrectly(instance, m)
    instance.selectPosition(1, m)
    checkNodeN1SelectedCorrectly(instance, m)
    instance.selectCell(0, 1, m)
    checkEdgeStartN1SelectedCorrectly(instance, m)
    instance.selectCell(0, 1, m)
    checkNothingSelected(instance, m)
  })
})

function getSelectionTestModel(): NodeSequenceEditor {
  const b = new ConcreteGraphBase()
  newNode('Start', b)
  newNode('N1', b)
  newNode('N2', b)
  newNode('End', b)
  insertNewEdge('Start', 'N1', b)
  insertNewEdge('Start', 'N2', b)
  insertNewEdge('N1', 'End', b)
  insertNewEdge('N2', 'End', b)
  const layerMap: Map<string, number> = new Map([
    ['Start', 0],
    ['N1', 1],
    ['N2', 1],
    ['End', 2]
  ])
  const builder = new NodeSequenceEditorBuilder(layerMap, b)
  return builder.build()
}

function checkNothingSelected(instance: NodeOrEdgeSelection, m: NodeSequenceEditor) {
  ['Start', 'N1', 'N2', 'End'].forEach(nodeId => {
    expect(instance.isNodeHighlightedInDrawing(nodeId, m)).toBe(false)
  });
  ['Start-N1', 'Start-N2', 'N1-End', 'N2-End'].forEach(edgeKey => {
    expect(instance.isEdgeHighlightedInDrawing(edgeKey, m)).toBe(false)
  })
}

function checkNodeN1SelectedCorrectly(instance: NodeOrEdgeSelection, m: NodeSequenceEditor) {
  ['Start', 'N2', 'End'].forEach(nodeId => {
    expect(instance.isNodeHighlightedInDrawing(nodeId, m)).toBe(false)
  });
  expect(instance.isNodeHighlightedInDrawing('N1', m)).toBe(true);
  ['Start-N1', 'N1-End'].forEach(edgeKey => {
    expect(instance.isEdgeHighlightedInDrawing(edgeKey, m)).toBe(true)
  });
  ['Start-N2', 'N2-End'].forEach(edgeKey => {
    expect(instance.isEdgeHighlightedInDrawing(edgeKey, m)).toBe(false)
  });
}

function checkEdgeStartN1SelectedCorrectly(instance: NodeOrEdgeSelection, m: NodeSequenceEditor) {
  ['Start', 'N1'].forEach(nodeId => {
    expect(instance.isNodeHighlightedInDrawing(nodeId, m)).toBe(true)
  });
  ['N2', 'End'].forEach(nodeId => {
    expect(instance.isNodeHighlightedInDrawing(nodeId, m)).toBe(false)
  });
  expect(instance.isEdgeHighlightedInDrawing('Start-N1', m)).toBe(true);
  ['Start-N2', 'N1-End', 'N2-End'].forEach(edgeKey => {
    expect(instance.isEdgeHighlightedInDrawing(edgeKey, m)).toBe(false)
  })
}

function newNode(id: string, g: ConcreteGraphBase) {
  g.addNode(id, '', '')
}

function insertNewEdge(fromId: string, toId: string, b: ConcreteGraphBase) {
  const from: Node | undefined = b.getNodeById(fromId)
  const to: Node | undefined = b.getNodeById(toId)
  if (from === undefined) {
    throw new Error(`Invalid test case, node with id ${fromId} does not exist`)
  }
  if (to === undefined) {
    throw new Error(`Invalid test case, node with id ${toId} does not exist`)
  }
  b.connect(from!, to!, '')
}
