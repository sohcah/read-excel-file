import { describe, it } from 'mocha'
import { expect } from 'chai'

import parseXml from './parseXml.js'

describe('parseXmlStream', () => {
	it('should decode numeric character references in text', async () => {
		// Some tools (e.g. `openpyxl`) escape non-ASCII characters when writing XML.
		expect(await parseXmlTextContent('<r><t>Caf&#233; &#xE9;t&#xE9;</t></r>')).to.equal('Café été')
	})

	it('should decode predefined XML entities in text', async () => {
		expect(await parseXmlTextContent('<r><t>&lt;a&gt; &amp; &quot;b&quot; &apos;c&apos;</t></r>')).to.equal('<a> & "b" \'c\'')
	})

	it('should pass text without character references through unchanged', async () => {
		expect(await parseXmlTextContent('<r><t>abc</t></r>')).to.equal('abc')
	})

	it('should decode character references in attribute values', async () => {
		// Sheet names are read from the `name` attribute
		// in `xl/workbook.xml` file: `<sheet name="P&amp;L"/>`.
		const state = { names: [] }
		const onOpenTag = (tagName, attributes, state) => {
			if (tagName === 'sheet') {
				state.names.push(attributes.name)
			}
		}
		await parseXml(
			'<sheets><sheet name="P&amp;L &#233;t&#xE9;"/></sheets>',
			state,
			onOpenTag,
			null,
			null
		)
		expect(state.names).to.deep.equal(['P&L été'])
	})
})

function parseXmlTextContent(xml) {
	const state = { text: '' }
	const onText = (text, state) => {
		state.text += text
	}
	return parseXml(
		xml,
		state,
		null,
		null,
		onText
	).then(() => state.text)
}
