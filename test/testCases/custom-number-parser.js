export default async function({ readSheetFromFile, expect }) {
	const data = await readSheetFromFile({
		parseNumber: (string) => Number(string) + 1000
	})

	expect(data).to.deep.equal([
		[
			'START DATE',
			'NUMBER OF STUDENTS',
			'IS FREE',
			'COST',
			'COURSE TITLE',
			'CONTACT'
		],
		[
			new Date(Date.UTC(2018, 3 - 1, 24)),
			1000 + 123,
			false,
			1000 + 210.45,
			'Chemistry',
			'(123) 456-7890'
		]
	])
}