import { Node, Edge, ConcreteGraphBase, Graph, GraphConnectionsDecorator, ConcreteNode, NodeCaptionChoice, getCaption, NodeOrEdgeSelection } from './graph'

describe('Graph test', () => {
  it('Calculation of outgoing and incoming edges', () => {
    const b: ConcreteGraphBase = new ConcreteGraphBase()
    newNode('Start', b)
    newNode('Unconnected', b)
    newNode('N1', b)
    newNode('N2', b)
    newNode('N3', b)
    newNode('End', b)
    newEdge('Start', 'N1', b)
    newEdge('Start', 'N2', b)
    newEdge('N1', 'N3', b)
    newEdge('N2', 'N3', b)
    newEdge('N3', 'N2', b)
    newEdge('N3', 'End', b)
    const g: Graph = new GraphConnectionsDecorator(b)
    checkNodePointsTo("Start", ["N1", "N2"], g)
    checkNodeReachedFrom("Start", [], g)
    checkNodePointsTo("N1", ["N3"], g)
    checkNodeReachedFrom("N1", ["Start"], g)
    checkNodePointsTo("N2", ["N3"], g)
    checkNodeReachedFrom("N2", ["Start", "N3"], g)
    checkNodePointsTo("N3", ["N2", "End"], g)
    checkNodeReachedFrom("N3", ["N1", "N2"], g)
    checkNodePointsTo("End", [], g)
    checkNodeReachedFrom("End", ["N3"], g)
    checkNodePointsTo("Unconnected", [], g)
    checkNodeReachedFrom("Unconnected", [], g)
  })

  function checkNodePointsTo(fromId: string, toIds: string[], g: Graph) {
    const from: Node = g.getNodeById(fromId)!
    const successors: readonly Node[] = g.getSuccessors(from)
    expect(successors.map(n => n.getId())).toEqual(toIds)
  }

  function checkNodeReachedFrom(toId: string, fromIds: string[], g: Graph) {
    let to: Node = g.getNodeById(toId)!
    let predecessors: readonly Node[] = g.getPredecessors(to)
    expect(predecessors.map(n => n.getId())).toEqual(fromIds)
  }

  it('getCaption', () => {
    const n = new ConcreteNode(0, 'myId', 'My text', '')
    expect(getCaption(n, NodeCaptionChoice.ID)).toBe('myId')
    expect(getCaption(n, NodeCaptionChoice.TEXT)).toBe('My text')
  })
})

function newNode(id: string, g: ConcreteGraphBase) {
  g.addNode(id, '', '')
}

function newEdge(fromId: string, toId: string, g: ConcreteGraphBase) {
  const from: Node | undefined = g.getNodeById(fromId)
  const to: Node | undefined = g.getNodeById(toId)
  if (from === undefined) {
    throw new Error(`Invalid test case, node with id ${fromId} does not exist`)
  }
  if (to === undefined) {
    throw new Error(`Invalid test case, node with id ${toId} does not exist`)
  }
  g.connect(from!, to!, '')
}

describe('NodeOrEdgeSelection', () => {
  it ('Select node and undo again', () => {
    const g = getSelectionTestGraph()
    let instance = new NodeOrEdgeSelection()
    checkNothingSelected(instance, g)
    instance.selectNode('N1', g)
    checkNodeN1SelectedCorrectly(instance, g)
    instance.selectNode('N2', g)
    expect(instance.isNodeSelectedInGraph('N2', g)).toBe(true)
    instance.selectNode('N2', g)
    checkNothingSelected(instance, g)
  })

  it('Select edge and undo again', () => {
    const g = getSelectionTestGraph()
    let instance = new NodeOrEdgeSelection()
    checkNothingSelected(instance, g)
    instance.selectEdge('Start-N1', g)
    checkEdgeStartN1SelectedCorrectly(instance, g)
    instance.selectNode('N1', g)
    checkNodeN1SelectedCorrectly(instance, g)
    instance.selectEdge('Start-N1', g)
    checkEdgeStartN1SelectedCorrectly(instance, g)
    instance.selectEdge('Start-N1', g)
    checkNothingSelected(instance, g)
  })
})

function getSelectionTestGraph(): Graph {
  const b = new ConcreteGraphBase()
  newNode('Start', b)
  newNode('N1', b)
  newNode('N2', b)
  newNode('End', b)
  newEdge('Start', 'N1', b)
  newEdge('Start', 'N2', b)
  newEdge('N1', 'End', b)
  newEdge('N2', 'End', b)
  return new GraphConnectionsDecorator(b)
}

function checkNothingSelected(instance: NodeOrEdgeSelection, g: Graph) {
  ['Start', 'N1', 'N2', 'End'].forEach(nodeId => {
    expect(instance.isNodeSelectedInGraph(nodeId, g)).toBe(false)
  });
  ['Start-N1', 'Start-N2', 'N1-End', 'N2-End'].forEach(edgeKey => {
    expect(instance.isEdgeSelectedInGraph(edgeKey, g)).toBe(false)
  })
}

function checkNodeN1SelectedCorrectly(instance: NodeOrEdgeSelection, g: Graph) {
  ['Start', 'N2', 'End'].forEach(nodeId => {
    expect(instance.isNodeSelectedInGraph(nodeId, g)).toBe(false)
  });
  expect(instance.isNodeSelectedInGraph('N1', g)).toBe(true);
  ['Start-N1', 'N1-End'].forEach(edgeKey => {
    expect(instance.isEdgeSelectedInGraph(edgeKey, g)).toBe(true)
  });
  ['Start-N2', 'N2-End'].forEach(edgeKey => {
    expect(instance.isEdgeSelectedInGraph(edgeKey, g)).toBe(false)
  });
}

function checkEdgeStartN1SelectedCorrectly(instance: NodeOrEdgeSelection, g: Graph) {
  ['Start', 'N1'].forEach(nodeId => {
    expect(instance.isNodeSelectedInGraph(nodeId, g)).toBe(true)
  });
  ['N2', 'End'].forEach(nodeId => {
    expect(instance.isNodeSelectedInGraph(nodeId, g)).toBe(false)
  });
  expect(instance.isEdgeSelectedInGraph('Start-N1', g)).toBe(true);
  ['Start-N2', 'N1-End', 'N2-End'].forEach(edgeKey => {
    expect(instance.isEdgeSelectedInGraph(edgeKey, g)).toBe(false)
  })
}