// This code was originally submitted by Etienne Prothon.
// https://gitlab.com/catamphetamine/read-excel-file/-/merge_requests/11

import InvalidInputError from './InvalidInputError.js'
import createFileTypeDetector, { XLS_FILE_TYPE } from './createFileTypeDetector.js'

export default function validateLeadingBytes(bytes) {
	const fileTypeDetector = createFileTypeDetector()

	for (const byte of bytes) {
		if (validateByte(byte, fileTypeDetector)) {
			return
		}
	}

	noFileTypeCouldBeDetermined(bytes.length)
}

export function validateByte(byte, fileTypeDetector) {
	const fileType = fileTypeDetector(byte)
	if (fileType !== undefined) {
		// If it has determined that the file type is `.xls`.
		if (fileType === XLS_FILE_TYPE) {
			throw new InvalidInputError('XLS_FILE_NOT_SUPPORTED')
		}
		// If it has determined that the file type is none of the known ones.
		if (fileType < 0) {
			throw new InvalidInputError('FILE_NOT_SUPPORTED')
		}
		return true
	}
}

export function noFileTypeCouldBeDetermined(byteCount) {
	// The file type couldn't be determined — not enough bytes.
	throw new InvalidInputError(byteCount === 0 ? 'NO_DATA' : 'FILE_NOT_SUPPORTED')
}