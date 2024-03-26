import { getRange } from './util'

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
})