import { expect, test } from 'bun:test'

import { isMissingStorageObjectError } from './uploadBinary'

test('only treats missing storage objects as available upload keys', () => {
  expect(isMissingStorageObjectError({ name: 'UnknownError', $metadata: { httpStatusCode: 404 } })).toBe(true)
  expect(isMissingStorageObjectError({ name: 'NoSuchKey' })).toBe(true)
  expect(isMissingStorageObjectError({ name: 'UnknownError', $metadata: { httpStatusCode: 503 } })).toBe(false)
  expect(isMissingStorageObjectError(new Error('Network unavailable'))).toBe(false)
})
