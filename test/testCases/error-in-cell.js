export default async function({ readSheetFromFile, expect }) {
	const data = await readSheetFromFile()
	expect(data.length).to.equal(1)
	// A1 cell has an error: "#NAME?" (unknown function used in the formula)
	expect(data[0][0]).to.equal(null)
	expect(data[0][1]).to.equal('B1')
}