// This code was originally submitted by Etienne Prothon.
// https://gitlab.com/catamphetamine/read-excel-file/-/merge_requests/11

import { describe, it } from 'mocha'
import { expect } from 'chai'

import validateLeadingBytes from './validateLeadingBytes.js'

import InvalidInputError from './InvalidInputError.js'

describe('validateLeadingBytes', () => {
	it('should not throw when ZIP file signature is present', () => {
		// "PK\x03\x04" — a normal ZIP file signature.
		const XLSX_FILE_FIRST_BYTES = [0x50, 0x4B, 0x03, 0x04]
		expect(() => validateLeadingBytes(XLSX_FILE_FIRST_BYTES)).to.not.throw()
	})

	it('should throw when it detects a legacy binary `.xls` file (CFB signature)', () => {
		const XLS_FILE_FIRST_BYTES = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]
		expect(() => validateLeadingBytes(XLS_FILE_FIRST_BYTES)).to.throw(InvalidInputError).and.satisfy((error) => {
			expect(error).to.have.property('name', 'InvalidInputError')
			expect(error).to.have.property('code', 'XLS_FILE_NOT_SUPPORTED')
			// Must return `true` for `satisfy()` to pass.
			return true
		})
	})

	it('should throw when it encounters a non-ZIP file signature', () => {
		const NOT_A_ZIP_FILE_FIRST_BYTES = [0x00, 0x01, 0x02, 0x03]
		expect(() => validateLeadingBytes(NOT_A_ZIP_FILE_FIRST_BYTES)).to.throw(InvalidInputError).and.satisfy((error) => {
			expect(error).to.have.property('name', 'InvalidInputError')
			expect(error).to.have.property('code', 'FILE_NOT_SUPPORTED')
			// Must return `true` for `satisfy()` to pass.
			return true
		})
	})

	it('should throw when the input is shorter than the ZIP file signature', () => {
		const XLSX_FILE_FIRST_BYTES = [0x50, 0x4B, 0x03, 0x04]

		expect(() => validateLeadingBytes(XLSX_FILE_FIRST_BYTES.slice(0, 0))).to.throw(InvalidInputError).and.satisfy((error) => {
			expect(error).to.have.property('name', 'InvalidInputError')
			expect(error).to.have.property('code', 'NO_DATA')
			// Must return `true` for `satisfy()` to pass.
			return true
		})

		expect(() => validateLeadingBytes(XLSX_FILE_FIRST_BYTES.slice(0, 1))).to.throw(InvalidInputError).and.satisfy((error) => {
			expect(error).to.have.property('name', 'InvalidInputError')
			expect(error).to.have.property('code', 'FILE_NOT_SUPPORTED')
			// Must return `true` for `satisfy()` to pass.
			return true
		})

		expect(() => validateLeadingBytes(XLSX_FILE_FIRST_BYTES.slice(0, 2))).to.not.throw()
		expect(() => validateLeadingBytes(XLSX_FILE_FIRST_BYTES.slice(0, 3))).to.not.throw()
		expect(() => validateLeadingBytes(XLSX_FILE_FIRST_BYTES.slice(0, 4))).to.not.throw()
	})
})