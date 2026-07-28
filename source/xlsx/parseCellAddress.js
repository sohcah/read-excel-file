/**
 * Parses XLSX cell address into a row number and a column number.
 * @param {string} coordinatesString
 * @returns {number[]} Returns `[rowNumber, columnNumber]`
 */
export default function parseCellAddress(coordinatesString) {
  // Coordinate examples: "AA2091", "R988", "B1".
  const [columnLetters, rowNumberString] = coordinatesString.split(/(\d+)/)

  // Converts a letter coordinate to a digit coordinate.
  // Examples: "A" -> 1, "B" -> 2, "Z" -> 26, "AA" -> 27, etc.
  //
  // This function is inlined only to avoid passing it in `worker-f` dependencies.
  // Otherwise, it would throw: "getColumnNumberFromColumnLetters is not defined".
  //
  let n = 0
  let i = 0
  while (i < columnLetters.length) {
    n *= 26
    n += LETTERS.indexOf(columnLetters[i])
    i++
  }
  const columnNumberFromColumnLetters = n

  return [
    // Row number (starting at `1`).
    Number(rowNumberString),
    // Column number (starting at `1`).
    columnNumberFromColumnLetters
  ]
}

// Maps "A1"-like coordinates to `{ row, column }` numeric coordinates.
//
// This is `export`ed only to be passed in `worker-f` dependencies.
// Otherwise, it would throw: "LETTERS is not defined".
//
export const LETTERS = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
