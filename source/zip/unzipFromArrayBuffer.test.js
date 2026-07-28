import { describe, it } from 'mocha'
import { expect } from 'chai'

import { zipSync, strToU8 } from 'fflate'

import unzipFromArrayBuffer from './unzipFromArrayBuffer.js'

describe('unzipFromArrayBuffer', () => {
	it('should read a `.zip` archive', async () => {
		const zip = zipSync({ 'a.xml': strToU8('<a/>') })
		const files = await unzipFromArrayBuffer(zip)
		expect(Object.keys(files)).to.deep.equal(['a.xml'])
	})
})