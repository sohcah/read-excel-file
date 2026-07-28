import parseSpreadsheetInfo from './parseSpreadsheetInfo.js'
import parseFilePaths from './parseFilePaths.js'
import parseStyles from './parseStyles.js'
import parseSharedStrings from './parseSharedStrings.js'
import parseSheet from './parseSheet.js'

import convertValuesFromUint8ArraysToStrings from '../utility/convertValuesFromUint8ArraysToStrings.js'
import checkpoint from '../utility/checkpoint.js'
import isPromise from '../utility/isPromise.js'

import InvalidSpreadsheetError from './InvalidSpreadsheetError.js'
import SheetNotFoundError from './SheetNotFoundError.js'

// These exports are only used in `worker-f` dependencies:
// import parseXmlStream '../xml/parseXmlStream.js'
// import { decodeUtf8String, strFromU8 } from '../utility/convertValuesFromUint8ArraysToStrings.js'
// import parseExcelDate from './parseExcelDate.js'
// import parseExcelTimestamp from './parseExcelTimestamp.js'
// import isDateFormat, { DATE_FORMAT_SPECIFIC_LOCALE_PREFIX, DATE_FORMAT_ALLOW_ANY_OTHER_TEXT_SUFFIX, IS_DATE_FORMAT_CACHE, DATE_TEMPLATE_TOKENS } from './isDateFormat.js'
// import isDateFormatStyle, { BUILT_IN_DATE_FORMAT_IDS } from './isDateFormatStyle.js'
// import parseCell, { EMPTY_CELL } from './parseCell.js'
// import parseCellAddress, { LETTERS } from './parseCellAddress.js'
// import convertArrayOfCellsTo2dArrayOfValues from './convertArrayOfCellsTo2dArrayOfValues.js'
// import dropEmptyTrailingRows from './dropEmptyTrailingRows.js'
// import dropEmptyTrailingColumns from './dropEmptyTrailingColumns.js'
// import { latestCheckpointTimestamp } from '../utility/checkpoint.js'

// `worker-f` is not used because passing cells data from the worker thread
// to the main thread was a lengthy-enough operation. For example, when running
// the benchmark, the output latency was: `10` ms on "1mb.xlsx", `70` ms on "10mb.xlsx"
// and `500` ms on "50mb.xlsx", meaning that it would still have issues with
// blocking the main thread when passing the result back to it from the worker thread,
// negating the effect of using `worker-f` in the first place.
//
// As a way to work around the slow "structured clone" algorithm for input/output data,
// I played around with implementing a `serializeCells()` function that would serialize
// sheet data into an `ArrayBuffer` in order for it to be "transferred" instantly
// to the main thread, but this serialization itself was even slower, meaning that it would
// still block the main thread when deserializing that `ArrayBuffer` back to sheet data,
// so the entire idea of using `worker-f` was eventually dismissed.
//
// Instead of that, I submitted a PR in `saxen` repo that added "streaming mode" to the XML parser.
// https://github.com/nikku/saxen/pull/27
// That PR got merged, so a simple alternative now is to parse sheet data chunk-by-chunk,
// spacing it out with `setTimeout(0)` interrupts.
//
// In case of re-enabling `worker-f`, uncomment the relevant code above and below,
// and also replace `import { Parser } from 'saxen'` with an copy-paste of `saxen`'s code
// in `parseXmlStream.saxen.js`, otherwise it'll throw: "Parser is not defined".
// Also, in `convertValuesFromUint8ArraysToStrings.js`, replace `import { strFromU8 } from 'fflate'`
// with a copy-paste of the `strFromU8()` function code from `fflate`'s repo,
// because otherwise it'd throw: "td is not defined".
//
const CAN_USE_WORKER = false

/**
 * Reads data from an `.xlsx` file.
 * @param  {function} parseXml — SAX XML parser.
 * @param  {Record<string,Uint8Array>} contents - A map of `.xml` files inside the `.xlsx` file (which itself is just a zipped directory).
 * @param  {object} [options]
 * @return {Promise<Sheet[]>}
 */
function parseSpreadsheetContents(parseXml, contents_, options = {}) {
  // For an introduction in reading `.xlsx` files see "The minimum viable XLSX reader":
  // https://www.brendanlong.com/the-minimum-viable-xlsx-reader.html

  // Convert the values in `contents_` from `Uint8Array`s to `string`s.
  //
  // This function is a bit of a bottleneck on large `.xlsx` files.
  // For example, when running the benchmark, the time of calling this function is:
  //
  // * "1mb.xlsx" — 2
  // * "10mb.xlsx" — 7
  // * "50mb.xlsx" — 35
  //
  // When running this code in a worker, it's no longer a "bottleneck"
  // because in that case it doesn't block the main thread.
  //
  const contents = convertValuesFromUint8ArraysToStrings(contents_)

  // Because of how `.xlsx` file contents are defined in the specification,
  // it will have to be read in 3 passes:
  // * First pass — read the actual file paths
  // * Second pass — read "shared strings" and "styles"
  // * Thirs pass — read the sheets data

  checkpoint('parse spreadsheet info and file paths')

  // Get spreadsheet info and the paths to files.
  return readFiles(
    getXmlFilesAtFixedPaths(),
    contents,
    parseXml
  ).then(({ spreadsheetInfo, filePaths }) => {
    checkpoint('parse "shared strings" and "styles"')

    // Parse "shared strings" and "styles".
    return readFiles(
      getXmlFilesAtNonFixedPaths(filePaths),
      contents,
      parseXml
    ).then(({ sharedStrings, styles }) => {
      const sheetRelationIdsToRead = options.sheets
        ? options.sheets.map(sheet => getSheetRelationId(sheet, spreadsheetInfo.sheets))
        : spreadsheetInfo.sheets.map(_ => _.relationId)

      checkpoint(`parse sheet${sheetRelationIdsToRead.length === 1 ? '' : 's'} data`)

      // Parse sheets data.
      return readFiles(
        getSheetDataXmlFiles(filePaths, sheetRelationIdsToRead, {
          sharedStrings,
          styles,
          epoch1904: spreadsheetInfo.epoch1904,
          options
        }),
        contents,
        parseXml
      ).then((sheetsData) => {
        checkpoint('end')
        // Return sheets data.
        return sheetRelationIdsToRead.map((sheetRelationId) => ({
          sheet: getSheetNameByRelationId(sheetRelationId, spreadsheetInfo.sheets),
          data: sheetsData[sheetRelationId]
        }))
      })
    })
  })
}

/**
 * Reads data from an `.xlsx` file in a worker.
 * @param  {function} [createWorkerFunction] — Creates a worker function.
 * @param  {function} parseXml — SAX XML parser.
 * @param  {Record<string,Uint8Array>} contents - A map of `.xml` files inside the `.xlsx` file (which itself is just a zipped directory).
 * @param  {object} [options]
 * @return {Promise<Sheet[]>}
 */
export default function parseSpreadsheetContentsInWorker(createWorkerFunction, parseXml, contents, options) {
  // Assign a default value of `null` to `parseNumber()` function in the `options`.
  // The reason is that the worker code requires it to be non-`undefined`.
  // Otherwise, it would throw "parseNumber is not defined".
  if (!(options && options.parseNumber)) {
    options = {
      ...options,
      parseNumber: null
    }
  }

  // If the environment doesn't support "workers", parse spreadsheet contents "synchronously".
  // This will "block" the main thread while parsing.
  if (!createWorkerFunction || !CAN_USE_WORKER) {
    return parseSpreadsheetContents(parseXml, contents, options)
  }

  // // Any functions have to be removed from the `options` in order for them to be "serializable"
  // // before sending them to the worker thread.
  // const { parseNumber: parseNumber_, ...optionsJson } = options
  //
  // // Create a worker from a function.
  // const workerFn = createWorkerFunction(
  //   (data) => {
  //     // Reconstruct the `options`.
  //     const options = {
  //       ...data.optionsJson,
  //       parseNumber: parseNumber_
  //     }
  //     // Parse sheet data from the `.xml` files.
  //     return parseSpreadsheetContents(parseXml, data.contents, options)
  //   }
  // )
  //
  // workerFn.addDependencies(
  //   // Any "outside" dependencies that're referenced from the function body.
  //   () => [
  //     parseXml,
  //     parseXmlStream,
  //     parseNumber,
  //     parseNumber_,
  //     parseExcelDate,
  //     parseExcelTimestamp,
  //     parseCell,
  //     EMPTY_CELL,
  //     parseCellAddress,
  //     LETTERS,
  //     convertArrayOfCellsTo2dArrayOfValues,
  //     convertValuesFromUint8ArraysToStrings,
  //     strFromU8,
  //     decodeUtf8String,
  //     dropEmptyTrailingRows,
  //     dropEmptyTrailingColumns,
  //     isDateFormat,
  //     DATE_FORMAT_SPECIFIC_LOCALE_PREFIX,
  //     DATE_FORMAT_ALLOW_ANY_OTHER_TEXT_SUFFIX,
  //     IS_DATE_FORMAT_CACHE, DATE_TEMPLATE_TOKENS,
  //     isDateFormatStyle,
  //     BUILT_IN_DATE_FORMAT_IDS,
  //     parseSpreadsheetContents,
  //     parseFilePaths,
  //     parseSpreadsheetInfo,
  //     parseSharedStrings,
  //     parseStyles,
  //     parseSheet,
  //     getSheetRelationId,
  //     getSheetNameByRelationId,
  //     getXmlFilesAtFixedPaths,
  //     getXmlFilesAtNonFixedPaths,
  //     getSheetDataXmlFiles,
  //     readFiles,
  //     checkpoint,
  //     latestCheckpointTimestamp,
  //     isPromise
  //   ]
  // )
  //
  // workerFn.inputTransferList(({ optionsJson, contents }) => Object.keys(contents).map(key => contents[key].buffer))
  //
  // return workerFn.callOnce({ optionsJson, contents }).then((result) => {
  //   console.log('~ Input latency', workerFn.inputLatency)
  //   console.log('~ Output latency', workerFn.outputLatency)
  //   return result
  // })
}

function getSheetRelationId(sheet, sheets) {
  if (typeof sheet === 'string') {
    for (const _sheet of sheets) {
      if (_sheet.name === sheet) {
        return _sheet.relationId
      }
    }
		throw new SheetNotFoundError(`Sheet "${sheet}" not found. Available sheets: ${sheets.map(({ name }) => `"${name}"`).join(', ')}`)
  } else {
		if (sheet <= sheets.length) {
      return sheets[sheet - 1].relationId
    }
    throw new SheetNotFoundError(`Sheet number out of bounds: ${sheet}. Available sheets count: ${sheets.length}`)
  }
}

function getSheetNameByRelationId(sheetRelationId, sheets) {
  for (const sheet of sheets) {
    if (sheet.relationId === sheetRelationId) {
      return sheet.name
    }
  }
  // The only way of getting `sheetRelationId` here is from the `sheets`,
  // so this error is not technically possible. And if it is thrown
  // then it means that there's a bug in the code because it's not
  // supposed to get `sheetRelationId` from anywhere other than the `sheets`.
  throw new Error(`Sheet relation ID not found: ${sheetRelationId}`)
}

function getXmlFilesAtFixedPaths() {
  return {
    // Read the paths to certain files inside the `.xlsx` file, which is itself just a `.zip` archive.
    // These paths aren't standardized between different spreadsheet editors.
    // https://github.com/tidyverse/readxl/issues/104
    'xl/_rels/workbook.xml.rels': {
      name: 'filePaths',
      parse: parseFilePaths
    },

    // General info on the spreadsheet.
    'xl/workbook.xml': {
      name: 'spreadsheetInfo',
      parse: parseSpreadsheetInfo
    }
  }
}

function getXmlFilesAtNonFixedPaths(filePaths) {
  return {
    // The usual file path for "shared strings" is "xl/sharedStrings.xml".
    [filePaths.sharedStrings || 'xl/sharedStrings.xml']: {
      name: 'sharedStrings',
      // `parseSharedStrings()` returns a `Promise`.
      parse: parseSharedStrings,
      // It seems that "sharedStrings.xml" is not required to exist.
      // For example, that could be the case when a spreadsheet doesn't contain any strings.
      // https://github.com/catamphetamine/read-excel-file/issues/85
      fallback: []
    },

    // The usual file path for "styles" is "xl/styles.xml".
    [filePaths.styles || 'xl/styles.xml']: {
      name: 'styles',
      parse: parseStyles,
      fallback: {}
    }
  }
}

// Returns the list of sheet data `.xml` files.
function getSheetDataXmlFiles(filePaths, sheetRelationIdsToRead, sheetDataParserParameters) {
  return Object.keys(filePaths.sheets)
    .filter((sheetRelationId) => sheetRelationIdsToRead.includes(sheetRelationId))
    .reduce((filesInfo, sheetRelationId) => ({
      ...filesInfo,
      [filePaths.sheets[sheetRelationId]]: {
        name: sheetRelationId,
        // `parseSheet()` returns a `Promise`.
        parse: (content, parseXml) => parseSheet(content, parseXml, sheetDataParserParameters)
      }
    }), {})
}

// In case of converting `.zip` file reader from a "read-and-return" one to a "streaming" one,
// this function could be modified to process the files as they come rather than all-at-once.

// Reads files from inside an `.xlsx` archive by file paths.
//
// In case of converting `.zip` file reader from a "read-and-return" one to a "streaming" one,
// this function could be modified to process the files as they come rather than all-at-once.
//
// But there's a catch: inside an `.xlsx` file, some file paths are not fixed
// and are instead defined in "xl/_rels/workbook.xml.rels" file,
// which presents a "chicken and an egg" dilemma: how could one possibly
// read an `.xlsx` file in one go when the order of the files inside it isn't fixed
// and could be random. Most likely, in the majority of cases, "xl/_rels/workbook.xml.rels"
// file is gonna be one of the first in a given `.xlsx` archive, but still it's not guaranteed.
// A solution would be reading an `.xlsx` file in two passes: one pass would be just to read
// the "xl/_rels/workbook.xml.rels" and ignore decompressing anything else,
// and then the second pass would be to read all other files whose paths are now known.
//
// Returns:
// * If none of the `parse()` functions returned a `Promise`, it returns a map of files' contents.
// * If any of the `parse()` functions returned a `Promise`, it returns a `Promise` that resolves to a map of files' contents.
//
function readFiles(filesInfo, contents, parseXml) {
  // Get files' contents.
  const results = {}
  for (const filePath of Object.keys(filesInfo)) {
    const fileInfo = filesInfo[filePath]
    results[fileInfo.name] = contents[filePath] === undefined
      ? (
        fileInfo.fallback === undefined
          ? (() => { throw new InvalidSpreadsheetError(`"${filePath}" file not found inside the \`.xlsx\` file`) })()
          : fileInfo.fallback
      )
      : fileInfo.parse(contents[filePath], parseXml)
  }
  // Resolve any `Promise`s.
  const promises = []
  for (const name of Object.keys(results)) {
    if (isPromise(results[name])) {
      promises.push(results[name].then((result) => {
        results[name] = result
      }))
    }
  }
  if (promises.length > 0) {
    return Promise.all(promises).then(() => results)
  }
  return results
}