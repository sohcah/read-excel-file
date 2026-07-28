export default async function({ readSheetFromFile, expect }) {
	const data = await readSheetFromFile()
	expect(data).to.deep.equal([[1, 2], [3, 4]])
}