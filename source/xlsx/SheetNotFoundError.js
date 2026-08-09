export default class SheetNotFoundError extends Error {
	constructor(sheet, sheets) {
		super(`Sheet not found: ${
			typeof sheet === 'number'
			? sheet + '. Sheet count: ' + sheets.length
			: sheet + '. Available sheets: ' + sheets.join(', ')
		}`)

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
		this.name = 'SheetNotFoundError'

		// Sheet name or sheet number.
		this.sheet = sheet

		// Available sheet names.
		this.sheets = sheets
	}
}
