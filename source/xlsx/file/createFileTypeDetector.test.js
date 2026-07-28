import { describe, it } from 'mocha'
import { expect } from 'chai'

import createFileTypeDetector, { XLSX_FILE_TYPE, XLS_FILE_TYPE } from './createFileTypeDetector.js'
import InvalidInputError from './InvalidInputError.js'

describe('createFileTypeDetector', () => {
	it('should not throw when ZIP file signature is present', () => {
		// "PK\x03\x04" — a normal ZIP file signature.
		const XLSX_FILE_FIRST_BYTES = [0x50, 0x4B, 0x03, 0x04]
		const fileTypeDetector = createFileTypeDetector()
		expect(fileTypeDetector(XLSX_FILE_FIRST_BYTES[0])).to.be.undefined
		expect(fileTypeDetector(XLSX_FILE_FIRST_BYTES[1])).to.equal(XLSX_FILE_TYPE)
		expect(fileTypeDetector(XLSX_FILE_FIRST_BYTES[2])).to.equal(XLSX_FILE_TYPE)
		expect(fileTypeDetector(XLSX_FILE_FIRST_BYTES[3])).to.equal(XLSX_FILE_TYPE)
	})

	it('should throw when it detects a legacy binary `.xls` file (CFB signature)', () => {
		const XLS_FILE_FIRST_BYTES = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]
		const fileTypeDetector = createFileTypeDetector()
		expect(fileTypeDetector(XLS_FILE_FIRST_BYTES[0])).to.be.undefined
		expect(fileTypeDetector(XLS_FILE_FIRST_BYTES[1])).to.be.undefined
		expect(fileTypeDetector(XLS_FILE_FIRST_BYTES[2])).to.be.undefined
		expect(fileTypeDetector(XLS_FILE_FIRST_BYTES[3])).to.equal(XLS_FILE_TYPE)
		expect(fileTypeDetector(XLS_FILE_FIRST_BYTES[4])).to.equal(XLS_FILE_TYPE)
		expect(fileTypeDetector(XLS_FILE_FIRST_BYTES[5])).to.equal(XLS_FILE_TYPE)
		expect(fileTypeDetector(XLS_FILE_FIRST_BYTES[6])).to.equal(XLS_FILE_TYPE)
		expect(fileTypeDetector(XLS_FILE_FIRST_BYTES[6])).to.equal(XLS_FILE_TYPE)
	})

	it('should throw when it encounters a non-ZIP file signature', () => {
		const NOT_A_ZIP_FILE_FIRST_BYTES = [0x00, 0x01, 0x02, 0x03]
		const fileTypeDetector = createFileTypeDetector()
		expect(fileTypeDetector(NOT_A_ZIP_FILE_FIRST_BYTES[0])).to.equal(-1)
		expect(fileTypeDetector(NOT_A_ZIP_FILE_FIRST_BYTES[1])).to.equal(-1)
		expect(fileTypeDetector(NOT_A_ZIP_FILE_FIRST_BYTES[2])).to.equal(-1)
		expect(fileTypeDetector(NOT_A_ZIP_FILE_FIRST_BYTES[3])).to.equal(-1)
	})
})
