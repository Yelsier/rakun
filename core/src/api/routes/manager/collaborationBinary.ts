export const encodeBinary = (value: Uint8Array) =>
  Buffer.from(value).toString('base64')

export const decodeBinary = (value: string | undefined) =>
  value === undefined ? undefined : new Uint8Array(Buffer.from(value, 'base64'))
