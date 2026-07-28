export default async function({ readSheetFromFile, expect }) {
	const data = await readSheetFromFile()
	expect(data.length).to.equal(4)
	expect(data[0][1]).to.equal(1)
	expect(data[0][2]).to.equal('Value2')
	expect(data[0][3]).to.equal('Value3')
	// String formula
	expect(data[2][1]).to.equal('Value2Value3')
	// Numeric formula
	expect(data[3][1]).to.equal(0.8414709848078965)
}