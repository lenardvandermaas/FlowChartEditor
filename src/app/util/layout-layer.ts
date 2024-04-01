import { Interval } from "./interval"
import { getRange, roundedMedian, sortedUniqNumbers } from "./util"

export type SizeFunction = (index: number) => number
export type PredecessorXFunction = (index: number) => number[]

export class XCoordCalculation {
  constructor(
    private numPositions: number,
    private sizeFunction: SizeFunction,
    private predecessorXFunction: PredecessorXFunction) {}

  /*
  run(): number[] {
    let areaGroups: AreaGroup[] = getRange(0, this.numPositions).map(p => this.getAreaGroup([p]))
    let conflictCandidates = areaGroups.map(g => Conflict.createFromAreaGroup(g))
    let initialNumConflictGroups: number
    do {
      initialNumConflictGroups = conflictCandidates.length
      conflictCandidates.sort((a, b) => a.area.minValue - b.area.minValue)
      conflictCandidates = this.joinSortedConflicts(conflictCandidates)
      // At this point, we have Conflict objects that are spatially disjoint
      conflictCandidates.sort((a, b) => a.positionInterval.minValue - b.positionInterval.minValue)
      conflictCandidates = this.joinSortedConflicts(conflictCandidates)
      // The Conflict objects are disjoint by planned sequence indexes
      areaGroups = conflictCandidates.map(c => this.getAreaGroup(c.positions))
    } while (conflictCandidates.length < initialNumConflictGroups)
    areaGroups.sort((a, b) => a.area.minValue - b.area.minValue)
    return areaGroups.flatMap(g => this.getXPositionsOfAreaGroup(g))
  }
  */

  getAreaGroup(positions: number[]) {
    const center: number = roundedMedian(sortedUniqNumbers(
      positions.flatMap(p => this.predecessorXFunction(p))))
    const theSize: number = positions.map(p => this.sizeFunction(p)).reduce((acc, curSize) => acc + curSize, 0)
    return new AreaGroup(Interval.createFromCenterSize(center, theSize), [... positions].sort())
  }

  private joinSortedConflicts(inputConflicts: Conflict[]): Conflict[] {
    let result: Conflict[] = []
    inputConflicts.forEach(ic => {
      if (result.length == 0) {
        result.push(Conflict.copyFrom(ic))
        return
      }
      let lastConflict = result[-1]
      if (positionAreasConflict(lastConflict, ic)) {
        result[-1] = lastConflict.toMerged(ic)
      } else {
        result.push(Conflict.copyFrom(ic))
      }
    })
    return result
  }

  getXPositionsOfAreaGroup(areaGroup: AreaGroup): number[] {
    const result: number[] = []
    let offsetX: number = areaGroup.area.minValue
    areaGroup.positions.forEach(p => {
      const theSize: number = this.sizeFunction(p)
      result.push(offsetX + Math.floor(theSize / 2))
      offsetX += theSize
    })
    return result
  }
}

interface AbstractPositionsArea {
  readonly area: Interval,
  readonly positionInterval: Interval
  readonly positions: number[]
}

function positionAreasConflict(first: AbstractPositionsArea, second: AbstractPositionsArea): boolean {
  const goesBefore = (first.area.before(second.area) && first.positionInterval.before(second.positionInterval))
  const goesAfter = (second.area.before(first.area) && second.positionInterval.before(first.positionInterval))
  return ! (goesBefore || goesAfter)
}

function positionAreasDuplicatePositions(first: AbstractPositionsArea, second: AbstractPositionsArea): boolean {
  const firstPositions: Set<number> = new Set(first.positions)
  const duplicates: number[] = second.positions.filter(p => firstPositions.has(p))
  return duplicates.length > 0
}

export class AreaGroup implements AbstractPositionsArea {
  constructor(
    readonly area: Interval,
    readonly positions: number[]) {}

  get positionInterval(): Interval {
    return Interval.createFrom(this.positions)
  }
}


class Conflict implements AbstractPositionsArea {
  constructor(
    private areaGroups: AreaGroup[],
    readonly area: Interval,
    readonly positionInterval: Interval) {}

  get positions() {
    return this.areaGroups.flatMap(g => g.positions)
  }

  static createFromAreaGroup(areaGroup: AreaGroup) {
    return new Conflict(
      [areaGroup],
      areaGroup.area,
      areaGroup.positionInterval
    )
  }

  static copyFrom(conflict: Conflict) {
    return new Conflict(
      [ ... conflict.areaGroups],
      conflict.area,
      conflict.positionInterval
    )
  }

  toMerged(conflict: Conflict): Conflict {
    if (! positionAreasConflict(this, conflict)) {
      throw new Error('Programming error - trying to join conflicts that are not related')
    }
    if (positionAreasDuplicatePositions(this, conflict)) {
      throw new Error('Programming error - cannot duplicate positions in Conflict object from other Conflict')
    }
    let newAreaGroups = [ ... this.areaGroups]
    newAreaGroups.push( ... conflict.areaGroups)
    return new Conflict(
      newAreaGroups,
      this.area.toJoined(conflict.area),
      this.positionInterval.toJoined(conflict.positionInterval))
  }
}