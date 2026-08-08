export const getPreviewApiBaseUrl = () =>
  process.env.RAKUN_API_URL ?? 'http://127.0.0.1:3000/api'

export const getPreviewRevalidateToken = () =>
  process.env.RAKUN_REVALIDATE_TOKEN ?? 'rakun-preview-revalidate'
