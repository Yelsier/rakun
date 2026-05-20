import type { FieldCondition } from '@rakun-kit/core/client'

export const evaluateFieldCondition = (
  condition: FieldCondition | undefined,
  data: Record<string, unknown>,
) => {
  if (!condition) {
    return true
  }

  const value = data[condition.field]

  if ('equals' in condition) {
    return value === condition.equals
  }

  if ('notEquals' in condition) {
    return value !== condition.notEquals
  }

  if ('gt' in condition) {
    return typeof value === 'number' && value > condition.gt
  }

  if ('gte' in condition) {
    return typeof value === 'number' && value >= condition.gte
  }

  if ('lt' in condition) {
    return typeof value === 'number' && value < condition.lt
  }

  if ('lte' in condition) {
    return typeof value === 'number' && value <= condition.lte
  }

  if ('includes' in condition) {
    return Array.isArray(value) && value.includes(condition.includes)
  }

  if ('notIncludes' in condition) {
    return Array.isArray(value) && !value.includes(condition.notIncludes)
  }

  if ('length' in condition) {
    if (!Array.isArray(value) && typeof value !== 'string') {
      return false
    }

    const { length } = value
    const checks = condition.length

    return (
      (checks.equals === undefined || length === checks.equals) &&
      (checks.gt === undefined || length > checks.gt) &&
      (checks.gte === undefined || length >= checks.gte) &&
      (checks.lt === undefined || length < checks.lt) &&
      (checks.lte === undefined || length <= checks.lte)
    )
  }

  return condition.exists
    ? value !== undefined && value !== null
    : value === undefined || value === null
}
