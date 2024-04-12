import { Node, Edge, ConcreteGraphBase, Graph, GraphConnectionsDecorator, ConcreteNode, NodeCaptionChoice, getCaption } from './graph'

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
    const successors: readonly Node[] = g.getSuccessors(fromId)
    expect(successors.map(n => n.getId())).toEqual(toIds)
  }

  function checkNodeReachedFrom(toId: string, fromIds: string[], g: Graph) {
    let predecessors: readonly Node[] = g.getPredecessors(toId)
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
