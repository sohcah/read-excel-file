export default async function({ readSheetFromFile, expect }) {
	const data = await readSheetFromFile()

	expect(data).to.deep.equal([
		[null, null, null],
		[null, 'B2', null],
		[null, null, null],
		[null, null, 'C4']
	])

	// expect(data).to.deep.equal([
	// 	[],
	// 	[undefined, 'B2'],
	// 	[],
	// 	[undefined, undefined, 'C4']
	// ])
}