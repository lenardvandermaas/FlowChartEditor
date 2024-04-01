import { XCoordCalculation, AreaGroup } from "./layout-layer";
import { Interval } from "./interval";

describe('XCoordCalculation AreaGroup', () => {
  it('Single predecessor aligns vertically', () => {
    const xCalc = xCoordCalculation([50], new Map([
      [0, [150]]
    ]))
    const instance = xCalc.getAreaGroup([0])
    expect(instance.area).toEqual(Interval.createFromCenterSize(150, 50))
    expect(instance.positions).toEqual([0])
    expect(instance.positionInterval).toEqual(Interval.createFromMinMax(0, 0))
  })

  it('Non-unique predecessors center position around median of uniq', () => {
    const xCalc = xCoordCalculation([50], new Map([
      [0, [400, 100, 200, 100]]
    ]))
    const instance = xCalc.getAreaGroup([0])
    // Median of [100, 200, 400]
    expect(instance.area).toEqual(Interval.createFromCenterSize(200, 50))
    expect(instance.positions).toEqual([0])
    expect(instance.positionInterval).toEqual(Interval.createFromMinMax(0, 0))
  })

  it('AreaGroups from multiple positions', () => {
    const xCalc = xCoordCalculation([50, 50, 50, 50], new Map([
      [0, [600]],
      [1, [450]],
      [2, [200]],
      [3, [100]]
    ]))
    const instance12 = xCalc.getAreaGroup([2, 1])
    expect(instance12.area).toEqual(Interval.createFromCenterSize(325, 100))
    expect(instance12.positions).toEqual([1, 2])
    expect(instance12.positionInterval).toEqual(Interval.createFromMinMax(1, 2))
  })

  it('AreaGroups with intermediate position omitted, unequal sizes', () => {
    const positionSizes = [50, 50, 50, 75]
    const xCalc = xCoordCalculation(positionSizes, new Map([
      [0, [600]],
      [1, [450]],
      [2, [200]],
      [3, [100]]
    ]))
    const instance13 = xCalc.getAreaGroup([3, 1])
    // Center is rounded median of 100 and 450.
    // Size is just enough to contain intervals of size 50 and 75
    expect(instance13.area).toEqual(Interval.createFromCenterSize(275, 125))
    expect(instance13.positions).toEqual([1, 3])
    const xPositions: number[] = xCalc.getXPositionsOfAreaGroup(instance13)
    // The areas assigned to position 1 and position 3
    const subAreas = xPositions.map((p, index) => Interval.createFromCenterSize(p, positionSizes[ [1, 3][index] ]))
    expect(subAreas[0].minValue).toBe(instance13.area.minValue)
    expect(subAreas[0].size).toBe(50)
    expect(subAreas[1].minValue).toBe(subAreas[0].maxValue + 1)
    expect(subAreas[1].size).toBe(75)
    expect(subAreas[1].maxValue).toBe(instance13.area.maxValue)
    // This instance will produce a conflict when position 2 is eventually processed
    expect(instance13.positionInterval).toEqual(Interval.createFromMinMax(1, 3))
  })
})

function xCoordCalculation(sizes: number[], predecessorXCoords: Map<number, number[]>): XCoordCalculation {
  return new XCoordCalculation(
    sizes.length,
    p => sizes[p],
    p => predecessorXCoords.get(p)!
  )
}