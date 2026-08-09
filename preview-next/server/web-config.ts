export const getPreviewRevalidateToken = () =>
  process.env.RAKUN_REVALIDATE_TOKEN ?? 'rakun-preview-revalidate'
