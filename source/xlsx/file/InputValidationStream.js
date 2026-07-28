import { Transform } from 'node:stream'

import createFileTypeDetector from './createFileTypeDetector.js'
import { validateByte, noFileTypeCouldBeDetermined } from './validateLeadingBytes.js'

import InvalidInputError from './InvalidInputError.js'

/**
 * Verifies that an input stream represents a valid `.xlsx` file.
 *
 * Throws an `InvalidInputError` when the input isn't an `.xlsx` file.
 */
export default class InputValidationStream extends Transform {
  constructor() {
    super()
    this.d = createFileTypeDetector()
    this.i = 0
    this.chunks = []
  }

  _transform(chunk, encoding, callback) {
    if (this.d) {
      // Don't send this chunk to the unzipper stream yet,
      // otherwise it might throw an invalid `.zip` archive error
      // before it has detected an `.xls` file.
      this.chunks.push(chunk)
      // Validate the bytes of the chunk.
      for (const byte of chunk) {
        try {
          if (validateByte(byte, this.d)) {
            this.d = undefined
            chunk = Buffer.concat(this.chunks)
            this.chunks = undefined
            break
          }
        } catch (error) {
          // Destroy the stream with a validation error,
          // halt further processing and emit an "error" event.
          return callback(error)
        }
        this.i++
      }
      if (this.d) {
        return callback()
      }
    }

    // Pass the chunk down to the next stream destination
    this.push(chunk)
    callback()
  }

  // `_flush()` is called when there will be no more input, before the "end" event is emitted.
  _flush(callback) {
    // If it's still deciding on the file type and there will be no more bytes to read
    // then the file is too short and it should throw an error.
    if (this.d) {
      try {
        noFileTypeCouldBeDetermined(this.i)
      } catch (error) {
        // Destroy the stream with a validation error
        // and emit an "error" event instead of an "end" event.
        return callback(error)
      }
    }
    // Call the callback to signal that flushing is complete.
    callback()
  }
}