// This can be done in a more concise way, see StackOverflow:
// https://stackoverflow.com/questions/36947847/how-to-generate-range-of-numbers-from-0-to-n-in-es2015-only
// However, the syntax applied there does not look so clear.
export function getRange(start: number, endNotIncluded: number): number[] {
  if (endNotIncluded < start) {
	throw new Error(`Cannot generate range if end = ${endNotIncluded} < start = ${start}`)
  }
  let result: number[] = []
  for(let i = start; i < endNotIncluded; ++i) {
	result.push(i)
  }
  return result
}
