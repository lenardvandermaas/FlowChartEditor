import { Interval } from './interval'

describe('Interval', () => {
  it('Creating invalid interval fails', () => {
    let caught = false
    try {
      new Interval(4, 3)
    } catch(e) {
      caught = true
    }
    expect(caught).toBe(true)
  })

  it('Can create interval with minValue == maxValue', () => {
    const interval = new Interval(2, 2)
    expect(interval.minValue).toBe(2)
    expect(interval.maxValue).toBe(2)
  })

  it('Can create normal interval', () => {
    const interval = new Interval(2, 3)
    expect(interval.minValue).toBe(2)
    expect(interval.maxValue).toBe(3)
  })

  it('Creating interval from empty array fails', () => {
    let caught = false
    try {
      Interval.createFrom([])
    } catch(e) {
      caught = true
    }
    expect(caught).toBe(true)
  })

  it('Can create interval from singleton array', () => {
    const interval = Interval.createFrom([3])
    expect(interval.minValue).toBe(3)
    expect(interval.maxValue).toBe(3)
  })

  it('Unordered list of values produces the right interval', () => {
    const interval = Interval.createFrom([3, 4, 1, 2, 5])
    expect(interval.minValue).toBe(1)
    expect(interval.maxValue).toBe(5)
  })

  it('Interval.before works as expected', () => {
    expect(new Interval(1, 2).before(new Interval(3, 4))).toBe(true)
    expect(new Interval(3, 4).before(new Interval(1, 2))).toBe(false)
    expect(new Interval(2, 3).before(new Interval(3, 4))).toBe(false)
    expect(new Interval(3, 4).before(new Interval(2, 3))).toBe(false)
    expect(new Interval(1, 5).before(new Interval(2, 3))).toBe(false)
    expect(new Interval(2, 3).before(new Interval(1, 5))).toBe(false)
  })

  it('Interval.toJoined works as expected', () => {
    expect(new Interval(1, 2).toJoined(new Interval(3, 4))).toEqual(new Interval(1, 4))
    expect(new Interval(3, 4).toJoined(new Interval(1, 2))).toEqual(new Interval(1, 4))
    expect(new Interval(2, 3).toJoined(new Interval(3, 4))).toEqual(new Interval(2, 4))
    expect(new Interval(3, 4).toJoined(new Interval(2, 3))).toEqual(new Interval(2, 4))
    expect(new Interval(1, 5).toJoined(new Interval(2, 3))).toEqual(new Interval(1, 5))
    expect(new Interval(2, 3).toJoined(new Interval(1, 5))).toEqual(new Interval(1, 5))
  })
})