// This code was originally submitted by Etienne Prothon.
// https://gitlab.com/catamphetamine/read-excel-file/-/merge_requests/11

// An error thrown when the input passed to `readXlsxFile()` is not a valid `.xlsx` file.
//
// Carries a documented, stable `code` property that consumers can reliably
// branch on — same convention as the schema-parsing `InvalidError` class
// (`error.code`) — instead of string-matching a low-level error message
// leaked from a transitive dependency (Hyrum's law).
//
// The `name` property is set so that the error type can also be detected via
// `error.name === 'InvalidInputError'` in setups where `instanceof` is unreliable
// (e.g. when both the ES-module and the CommonJS builds of this package end up
// being loaded in the same application).

const MESSAGES = {
	XLS_FILE_NOT_SUPPORTED:
		'You passed a legacy `.xls` file. Only `.xlsx` files are supported',
	FILE_NOT_SUPPORTED:
		'Doesn\'t look like an `.xlsx` file',
	INVALID_ZIP:
		'Couldn\'t unzip `.xlsx` file contents',
	NO_DATA:
		'No data'
}

// `.xlsx` files are just ZIP archives, so every valid `.xlsx` file starts with a
// ZIP local file header signature "PK" (`0x50 0x4B`). When the input isn't a ZIP
// archive, a 3rd-party unzipper library throws an obscure low-level error
// (for example `"invalid signature: 0xe011cfd0"` — the four leading bytes of a
// binary `.xls` file read in little-endian).
// That gives the caller nothing stable to branch on, and the exact wording can change
// depending on the 3rd-party unzipper library being used.
// This error standardizes the handling of cases when an invalid file is passed.
export default class InvalidInputError extends Error {
	/**
	 * Creates an `InvalidInputError` instance.
	 * @param {string} code
	 * @param {any} [cause]
	 */
	constructor(code, cause) {
		super(MESSAGES[code] || code)

		// Set `code` property.
		this.code = code

		// Set `name` property.
		//
		// This error could be detected either by `instanceof InvalidInputError`
		// or by comparing its `name` property value to "InvalidInputError".
		// Why use the `name` comparison when `instanceof` operator is available?
		// Google AI tells that it does make sense in the cases when an error is
		// "serialized" and then "deserialized" in a "distributed" environment such as
		// throwing an error in a worker thread and then handling it in a main thread,
		// or when throwing it in one "microservice" and then catching it in another one,
		// or just logging as in `sentry.io`. And in those cases, `error.constructor.name`
		// isn't always available for same reason of "serializing" and then "deserializing".
		//
		// For example, even if `InvalidInputError` is a named export of this package,
		// when later bunding the application code with a bundler it will still be minified and renamed.
		// That's when the `name` property could be used to find out the actual type of the error
		// in case it gets thrown and reported to a remote system like `sentry.io`.
		//
		// By the way, core Node.js errors themselves have a `name` property.
		//
		this.name = 'InvalidInputError'

		// Set `cause` property.
		//
		// `Error.prototype.cause` property indicates the specific, original reason
		// a given error occurred. Standardized in ES2022, it allows you to chain errors
		// by catching a low-level exception and re-throwing a meaningful, high-level error
		// without wiping out the diagnostic context or stack trace of the original failure.
		//
		// Adding a `.cause` property mimics modern error chaining for environments that support it
		// while remaining completely harmless in older systems.
		//
		this.cause = cause
	}
}
