import { describe, it } from 'mocha'
import { expect } from 'chai'

import { Readable } from 'node:stream'

import InputValidationStream from './InputValidationStream.js'

describe('InputValidationStream', () => {
	it('should not throw when ZIP file signature is present', (done) => {
		// "PK\x03\x04" — a normal ZIP file signature.
		const XLSX_FILE_FIRST_BYTES = Buffer.from([0x50, 0x4B, 0x03, 0x04])

		const input = createReadableStreamFromBuffer(XLSX_FILE_FIRST_BYTES)
		const inputValidator = new InputValidationStream()

		input.pipe(inputValidator)
			.on('error', (error) => {
				done(error)
			})
			.on('finish', () => {
				done()
			})
	})

	it('should throw when it detects a legacy binary `.xls` file (CFB signature)', (done) => {
		const XLS_FILE_FIRST_BYTES = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])

		const input = createReadableStreamFromBuffer(XLS_FILE_FIRST_BYTES)
		const inputValidator = new InputValidationStream()

		input.pipe(inputValidator)
			.on('error', (error) => {
				expect(error).to.have.property('name', 'InvalidInputError')
				expect(error).to.have.property('code', 'XLS_FILE_NOT_SUPPORTED')
				done()
			})
			.on('finish', () => {
				done(new Error('Expected to throw `InvalidInputError`'))
			})
	})

	it('should throw when it encounters a non-ZIP file signature', (done) => {
		const NOT_A_ZIP_FILE_FIRST_BYTES = Buffer.from([0x00, 0x01, 0x02, 0x03])

		const input = createReadableStreamFromBuffer(NOT_A_ZIP_FILE_FIRST_BYTES)
		const inputValidator = new InputValidationStream()

		input.pipe(inputValidator)
			.on('error', (error) => {
				expect(error).to.have.property('name', 'InvalidInputError')
				expect(error).to.have.property('code', 'FILE_NOT_SUPPORTED')
				done()
			})
			.on('finish', () => {
				done(new Error('Expected to throw `InvalidInputError`'))
			})
	})

	it('should throw when the input is shorter than the ZIP file signature (0 bytes)', (done) => {
		const XLSX_FILE_FIRST_BYTES = Buffer.from([0x50, 0x4B, 0x03, 0x04])

		const input = createReadableStreamFromBuffer(XLSX_FILE_FIRST_BYTES.slice(0, 0))
		const inputValidator = new InputValidationStream()

		input.pipe(inputValidator)
			.on('error', (error) => {
				expect(error).to.have.property('name', 'InvalidInputError')
				expect(error).to.have.property('code', 'NO_DATA')
				done()
			})
			.on('finish', () => {
				done(new Error('Expected to throw `InvalidInputError`'))
			})
	})

	it('should throw when the input is shorter than the ZIP file signature (1 byte)', (done) => {
		const XLSX_FILE_FIRST_BYTES = Buffer.from([0x50, 0x4B, 0x03, 0x04])

		const input = createReadableStreamFromBuffer(XLSX_FILE_FIRST_BYTES.slice(0, 1))
		const inputValidator = new InputValidationStream()

		input.pipe(inputValidator)
			.on('error', (error) => {
				expect(error).to.have.property('name', 'InvalidInputError')
				expect(error).to.have.property('code', 'FILE_NOT_SUPPORTED')
				done()
			})
			.on('finish', () => {
				done(new Error('Expected to throw `InvalidInputError`'))
			})
	})

	it('should not throw when the input is not shorter than a bare minimum ZIP file signature (2 bytes)', (done) => {
		const XLSX_FILE_FIRST_BYTES = Buffer.from([0x50, 0x4B, 0x03, 0x04])

		const input = createReadableStreamFromBuffer(XLSX_FILE_FIRST_BYTES.slice(0, 2))
		const inputValidator = new InputValidationStream()

		input.pipe(inputValidator)
			.on('error', (error) => {
				done(error)
			})
			.on('finish', () => {
				done()
			})
	})
})

// Creates a readable stream from a `Buffer`.
function createReadableStreamFromBuffer(buffer) {
	return Readable.from(buffer)
}
