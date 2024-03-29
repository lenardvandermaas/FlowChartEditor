import { FlowChartEditorComponent } from './flow-chart-editor/flow-chart-editor.component';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { RxState } from '@rx-angular/state';
import {RxPush} from '@rx-angular/template/push';

import { CellMouseOverEvent, CellValueChangedEvent, ColumnMovedEvent, ColumnState, GridApi, GridOptions, IRowNode, createGrid } from 'ag-grid-community';
import 'ag-grid-community/styles//ag-grid.css';
import 'ag-grid-community/styles//ag-theme-quartz.css';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import mermaid from 'mermaid';
import { map } from 'rxjs';
import { filterNullish } from './FilterNullish';

type FlatGraphType = {
  startNodes: string[]
  nodes: Node[],
  edges: Edge[],
  nodeStyles: Record<string, string>,
  edgeStyles: string[]
}

type LayeredGraphType = {
  layers: {
    nodes: Node[],
    edges: Edge[]
  }[],
  nodeStyles: Record<string, string>,
  edgeStyles: string[],
  nodeById: Record<string, Node>;
  edgesPerNode: Record<string, Edge[]>;
}

class Node {
  id!: string;
  level: number = 0;
  text: string = '';
  style: string = '';
  x: number = 0;
  y: number = 0;
  width: number = 60;
  height: number = 40;
  intermediate: boolean = false;
  index: number = -1;

  constructor(init: Partial<Node>) {
    Object.assign(this, init);
  }
}

class Edge {
  from!: string;
  to!: string;
  intermediate?: string;
  text?: string;
  style?: number;
  reverse: boolean = false;
  x1: number = 0;
  x2: number = 0;
  y1: number = 0;
  y2: number = 0;

  constructor(init: Partial<Edge>) {
    Object.assign(this, init);
  }
}

interface AppState {
  graphInput: FlatGraphType;
  graphNoDoubleEdges: FlatGraphType;
  graphLayered: LayeredGraphType;
  graphLayeredNoLoops: LayeredGraphType;
  graphLayeredWithIntermediates: LayeredGraphType;
  mermaidWithIntermediates: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FlowChartEditorComponent, CommonModule, RouterOutlet, FormsModule, ReactiveFormsModule, RxPush],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [RxState]
})
export class AppComponent implements OnInit {
  readonly state: RxState<AppState> = inject(RxState<AppState>);

  graphInput$           = this.state.select('graphInput');
  graphNoDoubleEdges$   = this.state.select('graphNoDoubleEdges');
  graphLayered$         = this.state.select('graphLayered');
  graphLayeredNoLoops$  = this.state.select('graphLayeredNoLoops');
  graphLayeredWithIntermediates$  = this.state.select('graphLayeredWithIntermediates');
  mermaidWithIntermediates$  = this.state.select('mermaidWithIntermediates');

  form: FormGroup<{graphInput: FormControl<string|null>}> = new FormGroup({
    graphInput: new FormControl<string|null>(null)
  });

  title = 'FlowChartEditor';
  api!: GridApi;
  columnGroups: string[][] = [['A'], ['B', 'C', 'D'], ['E', 'F', 'G'], ['H']];
  columns: string[] = this.columnGroups.flat();
  // nodeLevels: { [key: string]: number } = {};
  rows: { [key: string]: string|boolean }[] = [];
  nodes: Record<string, Node> = {};
  maxLayerSize: number = 0;
  biggestLayerIndex: number = -1;
  columnState!: ColumnState[];
  // oldNodes: { [key: string]: string } = {};
  startNodes: string[] = [];
  edgesPerNode: { [key: string]: Edge[] } = {};
  parentIdsPerNode: Record<string, string[]> = {};
  classDefs: Record<string, string> = {};
  linkStyles: Record<string, string> = {};
  linkStylesPerEdge: Record<number, number> = {};
  currentHoverId = '';
  currentFromHoverId = '';
  currentToHoverId = '';
  _rendererSwitch = false;
  set rendererSwitch(bool: boolean) {
    this._rendererSwitch = bool;
    if (this.rendererSwitch) {
      setTimeout(() => this.processNewMermaid(), 10);
    }
  };
  get rendererSwitch(): boolean {
    return this._rendererSwitch;
  }

  NODE_SPACING = 100;
  NODE_WIDTH = 60;
  NODE_HEIGHT = 40;
  
  set input(str: string) {
    this._input = str;
    if (this.input.length !== 0) {
      this.parseMermaidOld(str);
      this.columnGroups = this.orderNodes();
      this.columns = this.columnGroups.flat();
      this.replaceColumnDefs();
      this.replaceRowData();
      this.medianHeuristic();
      this.computePositions();
      this.mermaidOutput = this.generateNewMermaid();
      this.processNewMermaid();
      // this.generateNewSvg(nodes);
    }
  }
  get input(): string {
    return this._input;
  }
  _input: string = "";

  mermaidOutput: string = '';

  constructor() {
    this.state.connect('graphInput', this.form.controls.graphInput.valueChanges.pipe(filterNullish(), map(input => this.parseMermaid(input))));
    this.state.connect('graphNoDoubleEdges', this.graphInput$.pipe(map(input => this.combineDoubleEdges(input))));
    this.state.connect('graphLayered', this.graphNoDoubleEdges$.pipe(map(input => this.layerNodes(input))));
    this.state.connect('graphLayeredNoLoops', this.graphLayered$.pipe(map(layeredGraph => this.flipReverseEdges(layeredGraph))));
    //somewhere here something goes wrong because no intermediates are added. Also linkstyles are wrong
    this.state.connect('graphLayeredWithIntermediates', this.graphLayeredNoLoops$.pipe(map(layeredGraph => this.addIntermediates(layeredGraph))));
    this.state.connect('mermaidWithIntermediates', this.graphLayeredWithIntermediates$.pipe(map(layeredGraph => this.generateMermaid(layeredGraph))));

    this.graphLayeredWithIntermediates$.subscribe(graph => console.log(graph));

    mermaid.initialize({
      startOnLoad: false,
      flowchart: {
        curve: 'monotoneX',
        // defaultRenderer: 'elk'
      }
    });
    this.loadMermaid();
  }

  async loadMermaid() {
    const mermaid = await fetch("assets/mermaid.txt");
    const mermaidText = await mermaid.text();
    this.input = mermaidText;
  }

  ngOnInit() {
    let data: boolean[][] = [
      [false, false, false, true, true, false, false, false],
      [true, false, false, false, false, true, false, false],
      [true, true, false, true, false, false, false, true],
      [true, true, true, false, false, false, true, false],
      [false, false, false, false, false, false, false, false],
      [false, false, false, false, true, false, true, false],
      [false, false, true, true, false, false, false, false],
      [false, true, false, true, false, true, false, false]
    ];
    //diagonally mirror data
    data = data.map((row, y) => row.map((value, x) => y > x ? data[x][y] : value));
    data.forEach((row, index) => {
      const obj: { [key: string]: string|boolean } = {rowHeader: this.columns[index]};
      this.columns.forEach((col, idx) => obj[col] = row[idx]);
      this.rows[index] = obj;
    });

    const gridOptions: GridOptions = {
      columnDefs: [
        { headerName: '⮦', field: 'rowHeader', cellDataType: 'text', type: 'rowHeader', lockPosition: true, cellClass: 'locked-col'},
        ...this.columnGroups.map((group, index) => ({
          marryChildren: true,
          headerName: index.toString(),
          children: group.map(header => (
            { 
              headerName: header,
              field: header
            }
          ))
        })
      )],
      rowData: this.rows,
      getRowId: params => params.data.rowHeader,
      defaultColDef: {
        width: 41,
        resizable: false,
        cellStyle: params => {
          const colGroupNum = this.columnGroups.findIndex(val => val.includes(params.column.getColId()||''));
          const rowGroupNum = this.columnGroups.findIndex(val => val.includes(this.columns[params.rowIndex]||''));
          const isEvenCol = colGroupNum % 2 === 0;
          const isEvenRow = rowGroupNum % 2 === 0;
          const cellStyle: { [key: string]: string|number } = {};
          if (this.columns.indexOf(params.column.getColId()) === -1) {
            cellStyle['text-align'] = 'end';
          } else if (colGroupNum === rowGroupNum || params.rowIndex === this.columns.indexOf(params.column.getColId())) {
            cellStyle['backgroundColor']= 'black';
          } else if (isEvenCol && isEvenRow) {
            cellStyle['backgroundColor']= '#DDDDDD';
          } else if (isEvenCol || isEvenRow) {
            cellStyle['backgroundColor']= '#EEEEEE';
          }
          return cellStyle;
        },
        editable: params => {
          return params.node.rowIndex !== null && params.node.rowIndex < this.columns.indexOf(params.column.getColId())
        },
        sortable: false,
        cellDataType: 'boolean'
      },
      columnTypes: {
        rowHeader: {
          width: 120,
          editable: false,
          sort: 'asc',
          comparator: (valueA, valueB) => this.columns.indexOf(valueA) - this.columns.indexOf(valueB)
        }
      },
      suppressDragLeaveHidesColumns: true,
      columnHoverHighlight: true,
      onCellValueChanged: (e: CellValueChangedEvent) => {
        if (e.rowIndex !== null) {
          e.api.getRowNode(e.column.getColId())?.setDataValue(this.columns[e.rowIndex], e.newValue);
        }
      },
      onColumnMoved: (e: ColumnMovedEvent) => {
        if (e.column !== null && e.toIndex) {
          const colId = e.column.getColId();
          if (!(this.columnGroups.find(cols => cols.includes(colId))?.length !== 1)) {
            if (e.finished) e.api.applyColumnState({state: this.columnState, applyOrder: true});
            return;
          }
          if (e.finished) {
            const redrawRows: IRowNode<any>[] = [];
            const affectedLayerIndex = this.columnGroups.findIndex(cols => cols.includes(colId));
            const affectedLayer = affectedLayerIndex === -1 ? [] : this.columnGroups[affectedLayerIndex];
            const recomputeEdgesForLayer = affectedLayerIndex < 1 ? [] : this.columnGroups[affectedLayerIndex - 1];
            affectedLayer.forEach(col => {
              const rowNode = this.api.getRowNode(col);
              if (rowNode) {
                redrawRows.push(rowNode);
              }
            });
            e.api.redrawRows({rowNodes: redrawRows});
            this.generateNewMermaid();
            this.computePositions([affectedLayer], [recomputeEdgesForLayer]);
            return;
          }
         
          // move item to new spot in array
          const col: string = this.columns.splice(this.columns.indexOf(colId), 1)[0];
          this.columns.splice(e.toIndex - 1, 0, col);
          //save new column order
          this.columnState = e.api.getColumnState();
          e.api.onSortChanged();
        } else {
          e.api.applyColumnState({state: this.columnState, applyOrder: true});
        }
      },
      onCellMouseOver: (e: CellMouseOverEvent) => {
        const rowId = this.columns[e.rowIndex||-1]||'';
        const colId = e.column.getColId();
        // document.getElementById(this.currentHoverId)?.removeAttribute('filter');
        document.getElementById(this.currentHoverId)?.classList.remove('highlight');

        // let currentHoverFrom = document.getElementById(this.currentFromHoverId);
        // currentHoverFrom?.removeAttribute('filter');
        document.getElementById(this.currentFromHoverId)?.classList.remove('highlight');

        // let currentHoverTo = document.getElementById(this.currentToHoverId);
        // currentHoverTo?.removeAttribute('filter');
        document.getElementById(this.currentToHoverId)?.classList.remove('highlight');

        this.currentHoverId = `L-${rowId}-${colId}-0`;
        this.currentFromHoverId = `flowchart-${rowId}-${e.rowIndex}`;
        this.currentToHoverId = `flowchart-${colId}-${this.columns.indexOf(colId)}`;

        // document.getElementById(this.currentHoverId)?.setAttribute('filter', 'url(#filter1)');
        document.getElementById(this.currentHoverId)?.classList.add('highlight');

        // currentHoverFrom = document.getElementById(this.currentFromHoverId);
        // currentHoverFrom?.setAttribute('filter', 'url(#filter1)');
        const test = document.getElementById(this.currentFromHoverId);
        document.getElementById(this.currentFromHoverId)?.classList.add('highlight');

        // currentHoverTo = document.getElementById(this.currentToHoverId);
        // currentHoverTo?.setAttribute('filter', 'url(#filter1)');
        document.getElementById(this.currentToHoverId)?.classList.add('highlight');
      }
    };

    const gridDiv: HTMLElement|null = document.body.querySelector('#myGrid');
    if (gridDiv !== null) {
      this.api = createGrid(gridDiv, gridOptions);
      this.columnState = this.api.getColumnState();
    }
  }

  parseMermaid(str: string): FlatGraphType {
    const lines: string[] = str.split(/\r?\n/).map(line => line.trim());
    const nodeLines: string[] = lines.filter(line => line.search(/^[a-zA-Z0-9-]+\(/) === 0);
    const forwardLines: string[] = lines.filter(line => !(line.startsWith('classDef') || line.startsWith('linkStyle')) && line.search(/^[a-zA-Z0-9-]+ /) !== -1);
    const classDefLines = lines.filter(line => line.startsWith('classDef'));
    const linkStyleLines = lines.filter(line => line.startsWith('linkStyle'));

    const nodeStyles: Record<string, string> = {};
    classDefLines.forEach(line => {
      const firstSpaceIndex = line.indexOf(' ');
      const secondSpaceIndex = line.indexOf(' ', firstSpaceIndex + 1);
      nodeStyles[line.substring(firstSpaceIndex + 1, secondSpaceIndex)] = line.substring(secondSpaceIndex + 1);
    });

    const edgeToStyleMap: Record<number, number> = {};
    const edgeStyles: string[] = [];
    linkStyleLines.forEach((line, lineIndex) => {
      const lastSpaceIndex = line.lastIndexOf(' ');
      edgeStyles.push(line.substring(lastSpaceIndex + 1));
      line.substring(line.indexOf(' '), lastSpaceIndex)
        .split(',')
        .forEach(edge => edgeToStyleMap[Number.parseInt(edge)] = lineIndex);
    });

    const nodeHasParent: Record<string, boolean> = {};
    const nodes = nodeLines.map(line => {
      const id = line.substring(0, line.indexOf('('));
      nodeHasParent[id] = false;
      return new Node({
        id: id,
        text: line.substring(line.indexOf('(') + 2, line.lastIndexOf(')') - 1),
        style: line.substring(line.lastIndexOf(':::') + 3)
      });
    });

    const edges = forwardLines.map((line, index) => {
      const firstPipeIndex = line.indexOf('|');
      const to = line.substring(line.lastIndexOf(' ') + 1);
      nodeHasParent[to] = true;
      return new Edge({
        from: line.substring(0, line.indexOf(' ')),
        to: to,
        text: firstPipeIndex === -1 ? undefined : line.substring(firstPipeIndex + 1, line.lastIndexOf('|')),
        style: edgeToStyleMap[index]
      });
    });

    const startNodes = Object.entries(nodeHasParent).filter(([, hasParent]) => hasParent).map(([id,]) => id);

    return {startNodes, nodes, edges, nodeStyles, edgeStyles};
  }

  combineDoubleEdges(input: FlatGraphType): FlatGraphType {
    //return input but edges are grouped by from+style+to and then each group is mapped to a new Edge with text combined
    return {...input, edges: this.groupByToDoubleArray(
      input.edges, 
      edge => edge.from + '|' + edge.style + '|' + edge.to, 
      edge => edge
    ).map(edgeGroup => {
      //return new edge with all the same properties, except text is now all the texts joined together
      return new Edge({...edgeGroup[0], text: edgeGroup.map(({text}) => text).join('\n')})
    })};
  }

  parseMermaidOld(str: string) {
    const lines: string[] = str.split(/\r?\n/).map(line => line.trim());
    const nodeLines: string[] = lines.filter(line => line.search(/^[a-zA-Z0-9-]+\(/) === 0);
    const forwardLines: string[] = lines.filter(line => !(line.startsWith('classDef') || line.startsWith('linkStyle')) && line.search(/^[a-zA-Z0-9-]+ /) !== -1);
    const classDefLines = lines.filter(line => line.startsWith('classDef'));
    const linkStyleLines = lines.filter(line => line.startsWith('linkStyle'));

    classDefLines.forEach(line => {
      const firstSpaceIndex = line.indexOf(' ');
      const secondSpaceIndex = line.indexOf(' ', firstSpaceIndex + 1);
      this.classDefs[line.substring(firstSpaceIndex + 1, secondSpaceIndex)] = line.substring(secondSpaceIndex + 1);
    });

    linkStyleLines.forEach((line, lineIndex) => {
      const lastSpaceIndex = line.lastIndexOf(' ');
      this.linkStyles[lineIndex] = line.substring(lastSpaceIndex + 1);
      line
        .substring(line.indexOf(' '), lastSpaceIndex)
        .split(',')
        .forEach(edge => this.linkStylesPerEdge[Number.parseInt(edge)] = lineIndex)
    });

    nodeLines.forEach(line => {
      const id = line.substring(0, line.indexOf('('));
      this.parentIdsPerNode[id] = [];
      this.nodes[id] = new Node({
        id: id,
        text: line.substring(line.indexOf('(') + 2, line.lastIndexOf(')') - 1),
        style: line.substring(line.lastIndexOf(':::') + 3)
      });
      this.edgesPerNode[id] = [];
    });

    Object.entries(
      this.groupBy(
        forwardLines, 
        line => line.substring(0, line.indexOf(' ')), 
        (line, index) => {
          const firstSpaceIndex = line.indexOf(' ');
          const firstPipeIndex = line.indexOf('|');
          return new Edge({
            from: line.substring(0, firstSpaceIndex), 
            to: line.substring(line.lastIndexOf(' ') + 1), 
            text: firstPipeIndex === -1 ? undefined : line.substring(firstPipeIndex + 1, line.lastIndexOf('|')),
            style: this.linkStylesPerEdge[index]
          });
        }
      ))
      //map edges for each node
      .map(entry => {
        //group edges by target and style, this way we can eliminate double edges
        entry[1] = this.groupByToDoubleArray(entry[1], edge => edge.to + edge.style, edge => edge)
          .map((edgeGroup) => {
            //join all the edge texts and return a single edge with that text
            edgeGroup[0].text = edgeGroup.map(({text}) => text).filter(text => text).join('\n');
            return edgeGroup[0];
          });
        return entry;
      })
      .forEach(entry => {
        this.edgesPerNode[entry[0]] = entry[1];
        entry[1].forEach(edge => {
          if(!this.parentIdsPerNode[edge.to].includes(edge.from))
            this.parentIdsPerNode[edge.to].push(edge.from);
        });
      });

      this.startNodes = Object.entries(this.parentIdsPerNode).filter(([,val]) => val.length === 0)?.map(([id]) => id);
  }

  groupBy = <T, K extends keyof any, L>(arr: T[], key: (i: T) => K, value: (i: T, index: number) => L) =>
    arr.reduce((groups, item, index) => {
      (groups[key(item)] ||= []).push(value(item, index));
      return groups;
    }, {} as Record<K, L[]>);

  groupByToDoubleArray = <T, K extends keyof any, L>(arr: T[], key: (i: T) => K, value: (i: T, index: number) => L) =>
    Object.values<L[]>(this.groupBy(arr, key, value));

  orderNodes(): string[][] {
    let tree: string[][] = [];
    const compareEdge = this.edgesPerNode[this.startNodes[0]][0].to;
    if (this.startNodes.some(node => {
      const edges = this.edgesPerNode[node];
      return !(edges.length !== 1 || edges[0].to !== compareEdge);
    })) {
      //If any startNode has more than 1 edge or their edge doesn't go to the same node as the other startNodes` edge, then process them as separate trees
      tree = this.orderRecursive(this.edgesPerNode, '', [], this.startNodes.map(node => new Edge({from: '', to: node})));
    } else {
      //Else, we can start the recursive sorting at the node that all the startNodes point to, and then add the startNodes to the result
      tree = this.orderRecursive(this.edgesPerNode, compareEdge, this.startNodes);
      tree.unshift(this.startNodes);
    }
    const levelCount = tree.length - 1;
    const result: string[][] = [];
    let alreadyUsedDeeper: string[] = [];
    for (let i = levelCount; i >= 0; i--) {
      const nonVisitedNodes = tree[i].filter(val => !alreadyUsedDeeper.includes(val));
      if (nonVisitedNodes.length !== 0) {
        result.unshift([]);
        //add new unique elements from this branch to result
        const newRow = this.addUnique(result[0], nonVisitedNodes);
        if (this.maxLayerSize < newRow.length) {
          this.maxLayerSize = newRow.length;
          this.biggestLayerIndex = result[0].length;
        }
        alreadyUsedDeeper = result.flat();
      }
    }
    //store nodeLevel and compute y for each node
    result.forEach((level, levelIndex) => {
      level.forEach(nodeId => {
        const node = this.nodes[nodeId];
        node.level = levelIndex;
        node.y = node.level * 100;
      });
    });
    //invert edges whose target lives higher in the tree than their origin
    result.forEach((level, levelIndex) => {
      level.forEach(nodeId => this.edgesPerNode[nodeId]
        .filter(({to}) => this.nodes[to].level < levelIndex)
        .forEach((edge, _i, targetEdges) => {
          const newTarget = edge.from;
          const newSource = edge.to;
          edge.to = newTarget;
          edge.from = newSource;
          edge.reverse = true;
          //add newSource as parent of newTarget
          this.parentIdsPerNode[newTarget].push(newSource);
          //remove newTarget as parent from newSource
          const sourceParents = this.parentIdsPerNode[newSource];
          sourceParents.splice(sourceParents.indexOf(newTarget), 1);
          //add this edge to newSources edges
          this.edgesPerNode[newSource].push(edge);
          //remove this edge from oldSourceEdges
          this.edgesPerNode[nodeId].splice(targetEdges.indexOf(edge), 1);
        })
      )
    });
    //create intermediate nodes and edges for edges that span multiple levels
    let intermediateIndex = 0;
    result.forEach((level, levelIndex) => {
      level.forEach(nodeId => this.edgesPerNode[nodeId]
        .filter(({to}) => this.nodes[to].level > levelIndex + 1)
        .forEach(edge => {
          const target = edge.to;
          const intermediateId = `intermediate${intermediateIndex++}`;
          if (edge.intermediate === undefined) edge.intermediate = edge.to;
          edge.to = intermediateId;
          this.parentIdsPerNode[intermediateId] = [nodeId];
          const targetParents = this.parentIdsPerNode[target];
          targetParents[targetParents.indexOf(nodeId)] = intermediateId;
          this.nodes[intermediateId] = new Node({id: intermediateId, level: levelIndex + 1, intermediate: true, y: (levelIndex + 1) * 100, text: `${intermediateId}`});
          result[levelIndex + 1].push(intermediateId);
          this.nodes[intermediateId].level = levelIndex + 1;
          this.edgesPerNode[intermediateId] = [new Edge({from: intermediateId, to: target, style: edge.style, intermediate: '', text: edge.text, reverse: edge.reverse})];
        })
      )
    });
    //Set maxRowsize with intermediates included
    result.forEach((row, index) => {
      if (this.maxLayerSize < row.length) {
        this.maxLayerSize = row.length;
        this.biggestLayerIndex = index;
      }
    });
    return result;
  }

  layerNodes(input: FlatGraphType): LayeredGraphType {
    let tree: string[][] = [];
    const nodeById: Record<string, Node> = {};
    const edgesPerNode: Record<string, Edge[]> = {};
    input.nodes.forEach(node => {
      edgesPerNode[node.id] = [];
      nodeById[node.id] = node;
    });
    input.edges.forEach(edge => edgesPerNode[edge.from].push(edge));
    const compareEdge = edgesPerNode[input.startNodes[0]][0].to;
    if (this.startNodes.some(node => {
      const edges = edgesPerNode[node];
      return !(edges.length !== 1 || edges[0].to !== compareEdge);
    })) {
      //If any startNode has more than 1 edge or their edge doesn't go to the same node as the other startNodes` edge, then process them as separate trees
      tree = this.orderRecursive(edgesPerNode, '', [], this.startNodes.map(node => new Edge({from: '', to: node})));
    } else {
      //Else, we can start the recursive sorting at the node that all the startNodes point to, and then add the startNodes to the result
      tree = this.orderRecursive(edgesPerNode, compareEdge, this.startNodes);
      tree.unshift(this.startNodes);
    }
    const levelCount = tree.length - 1;
    const result: string[][] = [];
    let alreadyUsedDeeper: string[] = [];
    for (let i = levelCount; i >= 0; i--) {
      const nonVisitedNodes = tree[i].filter(val => !alreadyUsedDeeper.includes(val));
      if (nonVisitedNodes.length !== 0) {
        result.unshift([]);
        //add new unique elements from this branch to result
        const newRow = this.addUnique(result[0], nonVisitedNodes);
        if (this.maxLayerSize < newRow.length) {
          this.maxLayerSize = newRow.length;
          this.biggestLayerIndex = result[0].length;
        }
        alreadyUsedDeeper = result.flat();
      }
    }
    //store nodeLevel for each node
    result.forEach((level, levelIndex) => level.forEach(nodeId => nodeById[nodeId].level = levelIndex));
    return {
      layers: result.map(layer => ({nodes: layer.map(id => nodeById[id]), edges: layer.flatMap(id => edgesPerNode[id])})),
      nodeStyles: input.nodeStyles,
      edgeStyles: input.edgeStyles,
      nodeById,
      edgesPerNode
    };
  }

  orderRecursive(edgesPerNode: Record<string, Edge[]>, currentNode: string, alreadyVisited: string[] = [], initialEdges: Edge[] = edgesPerNode[currentNode]): string[][] {
    const newAlreadyVisited = [...alreadyVisited, currentNode];
    const branches = initialEdges
      .filter(({to}) => !newAlreadyVisited.includes(to))
      .map(edge => this.orderRecursive(edgesPerNode, edge.to, newAlreadyVisited));
    const result: string[][] = [];

    if (branches.length !== 0) {
      branches.sort((a, b) => b.length - a.length);
      const levelCount = branches[0].length - 1;
      for (let i = levelCount; i >= 0; i--) {
        result.unshift([]);
        for (let j = 0; j < branches.length; j++) {
          //if this branch has depth i
          if (branches[j].length <= i)
            break;
          result[0] = result[0].concat(branches[j][i]);
        }
      }
    }

    if (currentNode !== '') result.unshift([currentNode]);
    return result;
  }

  addUnique(arr1: string[], arr2: string[]) {
    for (let i = 0; i < arr2.length; i++) {
        const item = arr2[i];
        if (arr1.includes(item)) continue;
        arr1.push(item);
    }
    return arr1;
  }

  flipReverseEdges(input: LayeredGraphType): LayeredGraphType {
    Object.values(input.nodeById).forEach(({id, level}) => {
      input.edgesPerNode[id].forEach((edge, i, newTargetEdges) => {
        if (input.nodeById[edge.to].level < level) {
          const newTarget = edge.from;
          const newSource = edge.to;
          edge.to = newTarget;
          edge.from = newSource;
          edge.reverse = true;
          //add update edgesPerNode to reflect reversal
          newTargetEdges.splice(i, 1);
          input.edgesPerNode[newSource].push(edge);
        }
      });
      //remap edges for each layer
      input.layers.forEach(layer => layer.nodes.flatMap(({id}) => input.edgesPerNode[id]));
    });
    return input;
  }

  addIntermediates(input: LayeredGraphType): LayeredGraphType {
    let intermediateIndex = 0;
    input.layers.forEach((layer, layerIndex) => layer.edges.forEach(edge => {
      const nextLayerIndex = layerIndex + 1;
      if (input.nodeById[edge.to].level > nextLayerIndex) {
        //set properties of this edge to point to new intermediate node in the layer below
        const targetId = edge.to;
        const intermediateId = `intermediate${intermediateIndex++}`;
        edge.to = intermediateId;
        if (edge.intermediate === undefined) edge.intermediate = targetId;
        //create intermediate node, add it to nodeById and to the layer below
        const intermediateNode = new Node({id: intermediateId, level: nextLayerIndex, intermediate: true, text: `${intermediateId}`});
        input.nodeById[intermediateId] = intermediateNode;
        input.layers[nextLayerIndex].nodes.push(intermediateNode);
        //create new edge, add it to edgesPerNode and to the layer below
        const intermediateEdge = new Edge({from: intermediateId, to: targetId, style: edge.style, intermediate: '', text: edge.text, reverse: edge.reverse});
        input.edgesPerNode[intermediateId] = [intermediateEdge];
        input.layers[nextLayerIndex].edges.push(intermediateEdge);
      }
    }));
    return input;
  }

  replaceColumnDefs() {
    this.api.setGridOption('rowData', []);
    const columnDefs= [
      { headerName: '⮦', valueGetter: 'node.id', cellDataType: 'text', type: 'rowHeader', lockPosition: true, cellClass: 'locked-col'},
      ...this.columnGroups.map((group, index) => ({
        marryChildren: true,
        headerName: index.toString(),
        children: group.map(header => (
          { 
            headerName: header,
            field: header
          }
        ))
      }))
    ];
    this.api.setGridOption('columnDefs', columnDefs);
  }

  replaceRowData() {
    this.rows = this.columns.map((row, rowIndex) => {
      const obj: { [key: string]: string|boolean } = {rowHeader: row};
      this.columns.forEach((column, columnIndex) => {
        obj[column] = this.edgesPerNode[rowIndex < columnIndex ? row: column].findIndex(({to}) => to === (rowIndex < columnIndex ? column : row)) !== -1;
      });
      return obj;
    })
    this.api.setGridOption('rowData', this.rows);
  }

  generateNewMermaid(): string {
    let newMermaid: string = 'flowchart\n';
    //filter out intermediate nodes and map to mermaid
    newMermaid += this.columns
      .map(nodeId => this.nodes[nodeId])
      // .filter(node => !node.intermediate)
      .map(node => {
      const mermaidStyle = node.style !== '' ? `:::${node.style}` : ''
      return `${node.id}("${node.text}")${mermaidStyle}\n`;
    }).join('');
    newMermaid += Object.entries(this.classDefs).map(([className, style]) => `classDef ${className} ${style}\n`).join('');
    const linesPerLinkStyle: Record<string, number[]> = {};
    Object.keys(this.linkStyles).forEach(linkStyle => linesPerLinkStyle[linkStyle] = []);
    let currentLineIndex = 0;
    newMermaid += this.columns
      .map((nodeId, nodeIndex) => this.edgesPerNode[nodeId]
        //filter out forwards that go to nodes that live higher in the tree, also filter out forwards that come from intermediates
        .filter(({to, intermediate}) => 
          nodeIndex < this.columns.indexOf(to) 
          // && intermediate !== ''
        )
        //sort forwards so the first forward goes to an element that lives closer to the left of the layer below
        .sort((a, b) => this.columns.indexOf(a.to) - this.columns.indexOf(b.to))
        .map(({from, to, text, intermediate, style, reverse}) => {
          //if the forward goes to an intermediate, replace target with intermediate value, which is the target of the intermediate chain
          // if (intermediate) to = intermediate;
          if (style) linesPerLinkStyle[style].push(currentLineIndex++);
          const mermaidText = text ? `|${text}|` : '';
          const mermaidArrow = reverse ? '<-->' : '-->';
          return `${from} ${mermaidArrow}${mermaidText} ${to}\n`;
        }).join('')
      ).join('');
    newMermaid += Object.entries(linesPerLinkStyle).map(([styleName, lineIndexes]) => `linkStyle ${lineIndexes} ${this.linkStyles[styleName]}\n`).join('');
    return newMermaid;
  }

  generateMermaid(input: LayeredGraphType, filterIntermediates: boolean = false): string {
    let newMermaid: string = 'flowchart\n';
    //optionally filter out intermediate nodes, and map to mermaid
    newMermaid += Object.values(input.nodeById)
      .filter(node => !filterIntermediates || !node.intermediate)
      .map(node => {
      const mermaidStyle = node.style !== '' ? `:::${node.style}` : '';
      return `${node.id}("${node.text}")${mermaidStyle}\n`;
    }).join('');
    newMermaid += Object.entries(input.nodeStyles).map(([className, style]) => `classDef ${className} ${style}\n`).join('');
    const edgesPerLinkStyle: number[][] = [];
    input.edgeStyles.forEach((_v, index) => {
      edgesPerLinkStyle[index] = [];
    });
    let currentLineIndex = 0;
    const flatOrderedNodes = input.layers.flatMap(({nodes}) => nodes.map(({id}) => id));
    newMermaid += Object.values(input.edgesPerNode).flat()
      //optionally filter out forwards that come from intermediates
      .filter(({intermediate}) => !filterIntermediates || intermediate !== '')
      //sort forwards so the first forward goes to an element that lives closer to the left of the layer below
      .sort((a, b) => flatOrderedNodes.indexOf(a.to) - flatOrderedNodes.indexOf(b.to))
      .map(({from, to, text, intermediate, style, reverse}) => {
        //if filtering intermediates and the forward goes to an intermediate, replace target with intermediate value, which is the target of the intermediate chain
        if (filterIntermediates && intermediate) to = intermediate;
        if (style) edgesPerLinkStyle[style].push(currentLineIndex++);
        const mermaidText = text ? `|${text}|` : '';
        const mermaidArrow = reverse ? '<-->' : '-->';
        return `${from} ${mermaidArrow}${mermaidText} ${to}\n`;
      }).join('');
    newMermaid += edgesPerLinkStyle.map((edgeIndices, index) => `linkStyle ${edgeIndices.join(',')} ${input.edgeStyles[index]}\n`).join('');
    return newMermaid;
  }

  processNewMermaid() {
    const mermaidEl = document.getElementById('mermaid');
    if (mermaidEl !== null) {
      mermaidEl.innerHTML = this.mermaidOutput;
      mermaidEl.removeAttribute('data-processed');
      mermaid.run();
    }
  }

  //TODO: implement cost function to help smoothen sorting. current way of sorting causes ossilating effect that won't improve towards it's average
  medianHeuristic(): string[][]  {
    const layers: string[][] = [];
    this.columnGroups.forEach(() => layers.push([]));
    //Populate rows
    this.columns.forEach(nodeId => {
      const level = this.nodes[nodeId].level;
      layers[level].push(nodeId);
    });

    let improved = true;
    let count = 0;
    let currentCrossings = this.countCrossings(layers);
    let newColumns: string[] = [];
    let newLayers: string[][] = [];
    while (improved && count < 100) {
      improved = false;
      
      //Sweep layers from top to bottom, starting with the second layer, because the first layer doensn't have parents to base the sorting on
      for (let i = 1; i < layers.length; i++) {
        //Sort layer on nodes median of their parents' visual position
        this.medianSortLayer(layers, i, i-1, nodeId => this.parentIdsPerNode[nodeId]);
      }
      //Sweep layers from bottom to top, starting with the second to last layer, because the last layer doesn't have children to base the sorting on
      for (let i = layers.length - 2; i >= 0; i--) {
        //Sort layer on nodes median of their parents' visual position
        this.medianSortLayer(layers, i, i+1, nodeId => this.edgesPerNode[nodeId].map(({to}) => to));
      }
      let newCrossings = this.countCrossings(layers);
      improved = currentCrossings > newCrossings;
      currentCrossings = newCrossings;
      //if crossing count is the same, calculate the average edge length for the previous and the new layers,
      //if the average edge length is smaller, set improved=true
      if (!improved) {
        //compute final position for every node
        this.computeNodePositions(newLayers);
        const oldAverageEdgeLength = this.calculateAverageEdgeLength(newLayers);
        this.computeNodePositions(layers);
        let newAverageEdgeLength = this.calculateAverageEdgeLength(layers);
        improved = oldAverageEdgeLength > newAverageEdgeLength;
      }
      if (improved) {
        count++;
        newLayers = [...layers];
        newColumns = layers.flat();
      }
    }

    console.log(`local maximum for sorting graph found with ${currentCrossings} line crossings, after ${count} iterations.`);

    // newLayers
      //filter intermediates
      // .map(row => row.filter(nodeId => !this.nodes[nodeId].intermediate))
    //   .forEach(row => row.forEach((nodeId, nodeIndex) => {
    //   this.nodes[nodeId].x = (this.computeZeroCenteredPosition(row.length, nodeIndex) + (this.maxRowSize / 2 - 0.5)) * 100;
    // }));
    this.columnGroups = newLayers;
    this.columns = newColumns;
    this.columnState = this.api.getColumnState();
    this.columnState.sort((a, b) => this.columns.indexOf(a.colId) - this.columns.indexOf(b.colId));
    this.api.applyColumnState({state: this.columnState, applyOrder: true});
    this.api.onSortChanged();
    return newLayers;
  }

  medianSortLayer(nodes: string[][], layerIndex: number, adjecentLayerIndex: number, getConnections: (nodeId: string) => string[]) {
    const medians: Record<string, number> = {};
    const currentLayer = nodes[layerIndex];
    const adjecentLayer = nodes[adjecentLayerIndex];
    currentLayer.forEach(nodeId => {
      const adjecentVisualPositions = getConnections(nodeId).map(adjecentId => this.computeZeroCenteredPosition(adjecentLayer.length, adjecentLayer.indexOf(adjecentId)));
      medians[nodeId] = this.computeMedian(adjecentVisualPositions);
    });
    currentLayer.sort((a, b) => medians[a] - medians[b]);
  }

  getNeighbors(layer: String[], nodeId: string): String[] {
    const index = layer.indexOf(nodeId);
    return [layer[index-1],layer[index+1]];
  }
  
  computeMedian(values: number[]): number {
    values.sort((a, b) => a - b);
    if (values.length % 2 === 0) {
      const mid = values.length / 2;
      return (values[mid - 1] + values[mid]) / 2;
    } else {
      const mid = Math.floor(values.length / 2);
      return values[mid];
    }
  }

  computeZeroCenteredPosition(layerLength: number, index: number) {
    //convert index to position range: -0.5*layerLength - 0.5*layerLength
    return index - (layerLength / 2 - 0.5);
  }
  
  setIndex(layer: string[], nodeId: string, position: number): void {
    layer.splice(layer.indexOf(nodeId), 1);
    layer.splice(position, 0, nodeId);
  }
  
  countCrossings(layers: string[][]): number {
    let crossings = 0;
    for (let i = 0; i < layers.length - 1; i++) {
      const currentLayer = layers[i];
      const adjecentLayer = layers[i + 1];
      const nodeIndexes: Record<string, number> = {};
      const edgeCrossingCounts: Record<string, number> = {};
      adjecentLayer.forEach((id, index) => {
        edgeCrossingCounts[id] = 0;
        nodeIndexes[id] = index;
      });
      //First node in layer won't have any crossing, because the other nodes` edges haven't been indexed yet,
      //therefore just register first nodes crossings and then skip it in the loop
      this.edgesPerNode[currentLayer[0]].forEach(({to}) => edgeCrossingCounts[to] += 1);
      //for each node in currentLayer:
      for (let j = 1; j < currentLayer.length; j++) {
        //get the edges, and for each of them:
        this.edgesPerNode[currentLayer[j]].forEach(({to}) => {
          //get the target, and for each node that has an index that is higher than targetIndex:
          for (let h = nodeIndexes[to] + 1; h < adjecentLayer.length; h++) {
            //get the amount of lines that go to node and add it to the total crossing count
            crossings += edgeCrossingCounts[adjecentLayer[h]];
          }
          //then add 1 to the line count of the target node
          edgeCrossingCounts[to] += 1;
        });
      }
    }
    return crossings;
  }

  calculateAverageEdgeLength(layers: string[][]): number {
    let divider = 0
    let total = 0;
    for (let i = 0; i < layers.length - 1; i++) {
      const adjecentLayer = layers[i + 1];
      adjecentLayer.forEach(nodeId => {
        const nodePos = this.nodes[nodeId].x;
        const parents = this.parentIdsPerNode[nodeId];
        parents.forEach(parentNodeId => {
          total += Math.abs(this.nodes[parentNodeId].x - nodePos);
          divider++;
        });
      });
    }
    return total / divider;
  }

  computePositions(layers: string[][] = this.columnGroups, recomputeEdgesForLayer: string[][] = [], biggestLayerIndex: number = this.biggestLayerIndex) {
    //TODO: get biggest layer index for the layers to be computed, not the global biggest layer index
    if (biggestLayerIndex === -1 || layers.length !== this.columnGroups.length) {
      let maxLayerSize = -1;
      layers.forEach((layer, index) => {
        if (layer.length > maxLayerSize) {
          biggestLayerIndex = index;
          maxLayerSize = layer.length;
        }
      });
    }
    this.computeNodePositions(layers, biggestLayerIndex);
    layers.concat(recomputeEdgesForLayer).flat().map(nodeId => this.nodes[nodeId]).forEach((from, index) => {
      //TODO: move this to a more logical place
      //index stuff should be updated whenever it actually changes, that way it can also be used by other processes
      //or it should not be part of the Node class
      from.index = index;
      this.edgesPerNode[from.id].forEach(edge => {
        const to = this.nodes[edge.to];
        edge.x1 = from.x + this.NODE_WIDTH / 2;
        edge.x2 = to.x + this.NODE_WIDTH / 2;
        edge.y1 = from.y + this.NODE_HEIGHT;
        edge.y2 = to.y;
      })
    });
  }

  //TODO: figure out how to do the node positioning if there is not 1 biggest layer or another situation with similar complexity
  computeNodePositions(layers: string[][], biggestLayerIndex: number = this.biggestLayerIndex) {
    //evenly space all nodes in the layer containing the most nodes
    layers[biggestLayerIndex].forEach((nodeId, nodeIndex) => {
      this.nodes[nodeId].x = (this.computeZeroCenteredPosition(biggestLayerIndex, nodeIndex) + (biggestLayerIndex / 2 - 0.5)) * 100;
    });
    //from the biggest layer, propagate up and down the layers, placing nodes at their optimal location,
    //as long as their order doesn't change
    for (let i = biggestLayerIndex - 1; i >= 0; i--) {
      this.computePositionsForLayer(layers, i, i + 1, nodeId => this.edgesPerNode[nodeId].map(({to}) => to));
    }
    for (let i = biggestLayerIndex + 1; i < layers.length; i++) {
      this.computePositionsForLayer(layers, i, i - 1, nodeId => this.parentIdsPerNode[nodeId]);
    }
  }

  computePositionsForLayer(layers: string[][], currentLayerIndex: number, adjecentLayerIndex: number, getConnections: (nodeId: string) => string[]) {
    const currentLayer = layers[currentLayerIndex];
    const adjecentPositions: Record<string, number[]> = {};
    //first, give each node their ideal position
    currentLayer.forEach(nodeId => {
      adjecentPositions[nodeId] = getConnections(nodeId).map(adjecentId => this.nodes[adjecentId].x);
      this.nodes[nodeId].x = this.computeMedian(adjecentPositions[nodeId]);
    });

    //then get sets of neighboring nodes whose positions interfere with each other,
    //and treat each set as 1 node, joining their adjecents
    //compute ideal position for each of these combined nodes, then evenly spread the individual nodes around that position
    //repeat this whole process until there are no more interfering nodes.
    let conflicts: boolean = true;
    let loopFailSafe = 100;
    let conflictRanges: {from: number, to: number, nodes: string[], fromIndex: number, toIndex: number}[] = [];
    while(conflicts && loopFailSafe > 0) {
      const nodeRanges: {from: number, to: number, nodes: string[], fromIndex: number, toIndex: number}[] = [];
      loopFailSafe--;
      //group nodes that interfere:
      const layerSortedByX = currentLayer.map((nodeId, index) => ({nodeId, index, x: this.nodes[nodeId].x})).sort((a, b) => a.x - b.x);
      let conflictRange: {from: number, to: number, nodes: string[], fromIndex: number, toIndex: number}|undefined = undefined;
      layerSortedByX.forEach(nodeRep => {
        const lastRange = nodeRanges[nodeRanges.length - 1];
        if (lastRange) {
          if (lastRange.toIndex > nodeRep.index) {
            lastRange.to = nodeRep.x;
            lastRange.nodes.push(nodeRep.nodeId);
            lastRange.fromIndex = Math.min(lastRange.fromIndex, nodeRep.index)
            return;
          }
          if (nodeRep.x - lastRange.to < this.NODE_SPACING) {
            lastRange.to = nodeRep.x;
            lastRange.nodes.push(nodeRep.nodeId);
            lastRange.toIndex = nodeRep.index;
            return;
          }
        }
        //if there is a lastRange and conflictRange was filled by an earlier node and it contains this node index:
        if (conflictRange && lastRange && conflictRange.fromIndex <= nodeRep.index && conflictRange.toIndex >= nodeRep.index) {
          //add this node to lastRange
          lastRange.to = nodeRep.x;
          lastRange.nodes.push(nodeRep.nodeId);
          lastRange.toIndex = Math.max(lastRange.toIndex, nodeRep.index);
          lastRange.fromIndex = Math.min(lastRange.fromIndex, nodeRep.index);
          return;
        }
        //if none of the if statements above were matched, then make a new nodeRange
        nodeRanges.push({from: nodeRep.x, to: nodeRep.x, nodes: [nodeRep.nodeId], fromIndex: nodeRep.index, toIndex: nodeRep.index});
        //update conflictRange
        conflictRange = conflictRanges.find(range => range.fromIndex <= nodeRep.index && range.toIndex >= nodeRep.index)||conflictRange;
      });
      //for each group of interfering nodes:
      conflictRanges = nodeRanges.filter(({nodes}) => nodes.length !== 1);
      conflicts = conflictRanges.length !== 0;
      conflictRanges.forEach(range => {
        //sort the nodes by original order
        range.nodes.sort((a, b) => currentLayer.indexOf(a) - currentLayer.indexOf(b));
        //join nodes' adjecent positions
        const collectiveAdjecentPositions = range.nodes.flatMap(nodeId => adjecentPositions[nodeId]);
        //compute the collective median of the node group based on their combined adjecents' positions
        const collectiveMedian = this.computeMedian(collectiveAdjecentPositions);
        //then equally spread the nodes around the median
        range.nodes.forEach((nodeId, index) => {
          this.nodes[nodeId].x = this.computeZeroCenteredPosition(range.nodes.length, index) * 100 + collectiveMedian;
        });
      });
    }
  }

  getNodes(): Node[] {
    return Object.values(this.nodes);
  }

  getEdges(): Edge[] {
    const test = Object.values(this.edgesPerNode).flat();
    return test;
  }
}
