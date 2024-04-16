import { getGraphFromMermaid } from './mermaid-parser';
import { GraphBase, Graph, GraphConnectionsDecorator } from '../model/graph'
import { calculateLayerNumbers, NodeSequenceEditorBuilder, NodeForEditor, CreationReason, calculateLayerNumbersFirstOccuringPath, LayerNumberAlgorithm } from '../model/horizontalGrouping';
import { NodeSequenceEditor } from '../model/nodeSequenceEditor';
import { FlowChartEditorComponent } from '../components/flow-chart-editor/flow-chart-editor.component';
import { Dimensions } from '../graphics/edge-layout';

describe('Integration', () => {
  it('Read Mermaid text and create NodeSequenceEditor', () => {
    const input: string = `
flowchart
Start(""):::normal
N1(""):::normal
N2(""):::normal
End(""):::normal
X1(""):::normal
X2(""):::normal
Start --> |success| N1
Start --> |success| N2
N1 --> |success| End
N2 --> |success| End
X1 --> |success| X2
X2 --> |success| X1
`
    const b: GraphBase = getGraphFromMermaid(input)
    // For each node, summarize incoming and outgoing edges
    const g: Graph = new GraphConnectionsDecorator(b)
    // Calculate the layer numbers
    const nodeIdToLayer: Map<string, number> = calculateLayerNumbersFirstOccuringPath(g)
    // Create intermediate nodes and wrap existing nodes and edges
    // into new nodes and edges. These provide the CreationReason,
    // whether they are intermediate or original.
    const editorBuilder: NodeSequenceEditorBuilder = new NodeSequenceEditorBuilder(nodeIdToLayer, g)
    // If some nodes could not be reached from the root nodes,
    // we have them here.
    expect(editorBuilder.orderedOmittedNodes.map(n => n.getId())).toEqual(['X1', 'X2'])
    expect(editorBuilder.graph.getNodes().map(n => n.getId())).toEqual(['Start', 'N1', 'N2', 'End'])
    // Verify that we have the wrapper nodes, not the originals
    expect( (editorBuilder.graph.getNodes()[0] as NodeForEditor).getCreationReason()).toBe(CreationReason.ORIGINAL)
    // Having NodeSequenceEditorBuilder as a separate step is useful for testing
    expect(editorBuilder.graph.getNodes().map(n => editorBuilder.nodeIdToLayer.get(n.getId())))
      .toEqual([0, 1, 1, 2])
    // This is the object that should back up the table view.
    // The table view in which the user manipulates the node
    // order within each layer.
    const editor: NodeSequenceEditor = editorBuilder.build()
    expect(editor.getNumLayers()).toBe(3)
    expect(editor.getSequence().map(n => n?.getId())).toEqual(['Start', 'N1', 'N2', 'End'])
  })

  // Test was created by feeding the mermaid text to the GUI and checking
  // the number of crossing lines visually.
  it('Read Mermaid text and find 1 crossing line', () => {
    const flowChartEditor = new FlowChartEditorComponent()
    flowChartEditor.layerNumberAlgorithm = LayerNumberAlgorithm.FIRST_OCCURING_PATH
    const graphOrError = FlowChartEditorComponent.mermaid2graph(getTestMermaid())
    if (graphOrError.error !== null) {
      expect(true).toBeFalse()
      return
    }
    const graph = graphOrError.graph!
    flowChartEditor.graph = graph
    const modelOrError = flowChartEditor.graph2Model()
    if (modelOrError.error !== null) {
      expect(true).toBeFalse()
      return
    }
    const model = modelOrError.model!
    expect(model.getSequence().map(n => n?.getId())).toEqual(['Start', 'N1', 'intermediate1', 'N2', 'intermediate2', 'End'])
    expect(FlowChartEditorComponent.model2layout(model, getTestDimensions()).getNumCrossingLines()).toBe(1)
  })

  it('Adjust model of previous test to have no crossing lines anymore', () => {
    const flowChartEditor = new FlowChartEditorComponent()
    flowChartEditor.layerNumberAlgorithm = LayerNumberAlgorithm.FIRST_OCCURING_PATH
    const graphOrError = FlowChartEditorComponent.mermaid2graph(getTestMermaid())
    if (graphOrError.error !== null) {
      expect(true).toBeFalse()
      return
    }
    const graph = graphOrError.graph!
    flowChartEditor.graph = graph
    const modelOrError = flowChartEditor.graph2Model()
    if (modelOrError.error !== null) {
      expect(true).toBeFalse()
      return
    }
    const model = modelOrError.model!
    model.rotateToSwap(2, 1)
    expect(model?.getSequence().map(n => n?.getId())).toEqual(['Start', 'intermediate1', 'N1', 'N2', 'intermediate2', 'End'])
    expect(FlowChartEditorComponent.model2layout(model, getTestDimensions()).getNumCrossingLines()).toBe(0)
  })
})

function getTestMermaid(): string {
  return `
    flowchart
    Start("Start"):::normal
    N1("N1"):::normal
    N2("N2"):::normal
    End("End"):::normal
    Start --> |success| N1
    Start --> |success| N2
    N1 --> |success| N2
    N1 --> |success| End
    N2 --> |success| End
`
}

function getTestDimensions(): Dimensions {
  return {
    layerHeight: 50,
    layerDistance: 120,
    nodeBoxHeight: 40,
    intermediateWidth: 60,
    nodeWidth: 120,
    omittedPlaceholderWidth: 90,
    nodeBoxWidth: 110,
    // Do not test spreading the edge connection points.
    // Otherwise the test is incomprehensible.
    boxConnectorAreaPerc: 0
  }
}