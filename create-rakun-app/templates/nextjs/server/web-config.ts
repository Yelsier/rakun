export const getRakunApiBaseUrl = () => {
  const value = process.env.RAKUN_API_URL?.trim()
  if (!value) throw new Error('RAKUN_API_URL is required')
  return value
}

export const getRakunRevalidateToken = () => {
  const value = process.env.RAKUN_REVALIDATE_TOKEN?.trim()
  if (!value) throw new Error('RAKUN_REVALIDATE_TOKEN is required')
  return value
}

export const getRakunRevalidateUrl = () => {
  const value = process.env.RAKUN_REVALIDATE_URL?.trim()
  if (!value) throw new Error('RAKUN_REVALIDATE_URL is required')
  return value
}
