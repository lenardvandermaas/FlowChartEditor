import { getRange, roundedMedian } from './util'

describe('Util test', () => {
  it('Get range', () => {
    expect(getRange(3, 5)).toEqual([3, 4])
  })

  it('Get singleton range', () => {
    expect(getRange(2, 3)).toEqual([2])
  })

  it('Get empty range', () => {
    expect(getRange(1, 1)).toEqual([])
  })

  it('Reverse range not supported', () => {
    let caught = false
    try {
      getRange(3, 2)
    } catch(e) {
      caught = true
    }
    expect(caught).toBe(true)
  })

  it('Median of list of odd length', () => {
    const input = [4, 3, 10]
    expect(roundedMedian(input)).toBe(4)
    // Check original items were not sorted
    expect(input).toEqual([4, 3, 10])
  })

  it('Median of list of even length - no rounding needed', () => {
    const input = [4, 3, 6, 10]
    expect(roundedMedian(input)).toBe(5)
  })

  it('Median of list of even length - rounding needed', () => {
    const input = [10, 100, 201, 500]
    expect(roundedMedian(input)).toBe(150)
  })

  it('Median of singleton', () => {
    expect(roundedMedian([3])).toBe(3)
  })

  it('Median of two elements', () => {
    expect(roundedMedian([3, 5])).toBe(4)
  })
})