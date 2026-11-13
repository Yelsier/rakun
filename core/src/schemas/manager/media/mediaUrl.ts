import z from 'zod'

// Local media adapters can return same-origin paths instead of absolute URLs.
export const mediaUrl = z.union([
  z.url(),
  z.string().regex(/^\/(?![\\/])[^\s\u0000-\u001f\u007f]*$/),
])
