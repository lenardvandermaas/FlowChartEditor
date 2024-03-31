export class Interval {
  constructor(
    readonly minValue: number,
    readonly maxValue: number)
  {
    if(minValue > maxValue) {
      throw new Error(`Invalid interval: ${minValue} > ${maxValue}`)
    }
  }

  // Tests whether all values of this interval are before all values of the other
  before(other: Interval): boolean {
    return this.maxValue < other.minValue
  }

  // Create the smallest interval that contains this interval and the other interval
  toJoined(other: Interval): Interval {
    return new Interval(Math.min(this.minValue, other.minValue), Math.max(this.maxValue, other.maxValue))
  }

  static createFrom(values: number[]): Interval {
    if (values.length == 0) {
      throw new Error('Cannot create Interval from empty value list')
    }
    return new Interval(Math.min(... values), Math.max(... values))
  }
}