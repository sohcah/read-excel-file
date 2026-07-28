export default async function({ readFile, readSheet, expect }) {
	const contentsBuffer = await readFile()

	const contentsBlob = new Blob([contentsBuffer])

	const data = await readSheet(contentsBlob)

	expect(data).to.deep.equal([
		// ['String'],
		['Test 123']
	])

	// should handle empty blob input
	let thrown
	try {
		await readSheet(new Blob())
	} catch (error) {
		thrown = error
	}
	expect(thrown).to.be.an('error')
	expect(thrown.code).to.equal('NO_DATA')
}