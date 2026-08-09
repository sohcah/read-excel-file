// `strict.xlsx` and `strict.transitional.xlsx` files were copied from some github repo:
// https://github.com/pjfanning/ooxml-strict-converter
export default async function({ readSheetsFromFile, expect }) {
	const sheets = await readSheetsFromFile()
	expect(sheets.length).to.equal(3)

	expect(sheets[0].sheet).to.equal('Sheet1')
	expect(sheets[0].data.length).to.equal(10)
	expect(sheets[0].data[0].length).to.equal(2)
	expect(sheets[0].data[0][0]).to.equal('Lorem')
	expect(sheets[0].data[0][1]).to.equal(111)

	expect(sheets[1].sheet).to.equal('rich test')
	expect(sheets[1].data.length).to.equal(6)
	expect(sheets[1].data[0].length).to.equal(4)
	expect(sheets[1].data[0][0]).to.equal('The quick brown fox jumps over the lazy dog')
	expect(sheets[1].data[0][1]).to.equal(null)
	expect(sheets[1].data[0][2]).to.equal(null)
	expect(sheets[1].data[0][3]).to.equal(null)

	expect(sheets[2].sheet).to.equal('Sheet3')
	expect(sheets[2].data.length).to.equal(0)
}