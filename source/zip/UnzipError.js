export default class UnzipError extends Error {}

export function createUnzipError(error) {
	const unzipError = new UnzipError(error.message)
	// Keep original stack if it exists
	if (error.stack) {
		unzipError.stack = error.stack
	}
	// Clean up stack trace a bit in Node.js/V8 environments
	if (Error.captureStackTrace) {
		Error.captureStackTrace(unzipError, createUnzipError)
	}
	// `Error.prototype.cause` property indicates the specific, original reason
	// a given error occurred. Standardized in ES2022, it allows you to chain errors
	// by catching a low-level exception and re-throwing a meaningful, high-level error
	// without wiping out the diagnostic context or stack trace of the original failure.
	//
	// Adding a `.cause` property mimics modern error chaining for environments that support it
	// while remaining completely harmless in older systems.
	//
	unzipError.cause = error
	// Return the error.
	return unzipError
}