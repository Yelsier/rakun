export const formatDate = (date: Date) => {
  const value = date instanceof Date ? date : new Date(date)

  const pad = (input: number) => String(input).padStart(2, '0')

  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate(),
  )} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(
    value.getSeconds(),
  )}`
}
