const pad = (value: number) => String(value).padStart(2, '0')

export const dateTimeToInputValue = (
  value?: string | Date | null,
  includeTime = false,
) => {
  if (!value) return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())

  if (!includeTime) {
    return `${yyyy}-${mm}-${dd}`
  }

  const hh = pad(date.getHours())
  const min = pad(date.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}
