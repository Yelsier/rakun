export type IcuVariableKind =
  | 'argument'
  | 'plural'
  | 'select'
  | 'selectordinal'

export type IcuVariable = {
  name: string
  kind: IcuVariableKind
}

const normalizeKind = (kind?: string): IcuVariableKind => {
  if (kind === 'plural') return 'plural'
  if (kind === 'select') return 'select'
  if (kind === 'selectordinal') return 'selectordinal'
  return 'argument'
}

const isIdentifierStart = (char: string | undefined) =>
  !!char && /[a-zA-Z_]/.test(char)

const isIdentifierPart = (char: string | undefined) =>
  !!char && /[a-zA-Z0-9_]/.test(char)

const skipWs = (value: string, index: number) => {
  let i = index
  while (i < value.length && /\s/.test(value[i] || '')) i++
  return i
}

const readIdentifier = (
  value: string,
  index: number,
): { token: string; next: number } | null => {
  let i = index
  const first = value[i]
  if (!isIdentifierStart(first)) return null
  i++
  while (isIdentifierPart(value[i])) i++
  return { token: value.slice(index, i), next: i }
}

const findMatchingBrace = (value: string, openIndex: number): number => {
  let depth = 0
  for (let i = openIndex; i < value.length; i++) {
    const char = value[i]
    if (char === '{') depth++
    if (char === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

const addVariable = (
  map: Map<string, IcuVariableKind>,
  name: string,
  kind: IcuVariableKind,
) => {
  const current = map.get(name)
  if (!current) {
    map.set(name, kind)
    return
  }
  if (current === 'argument' && kind !== 'argument') {
    map.set(name, kind)
  }
}

const parseOptions = (
  optionsText: string,
  map: Map<string, IcuVariableKind>,
  walkMessage: (message: string, map: Map<string, IcuVariableKind>) => void,
) => {
  let i = 0

  while (i < optionsText.length) {
    i = skipWs(optionsText, i)
    if (i >= optionsText.length) break

    while (optionsText[i] === ',') i++
    i = skipWs(optionsText, i)
    if (i >= optionsText.length) break

    if (optionsText[i] === '=') {
      i++
      while (/[0-9]/.test(optionsText[i] || '')) i++
    } else {
      const id = readIdentifier(optionsText, i)
      if (!id) {
        i++
        continue
      }
      i = id.next
    }

    i = skipWs(optionsText, i)
    if (optionsText[i] !== '{') continue

    const end = findMatchingBrace(optionsText, i)
    if (end < 0) break

    const optionBody = optionsText.slice(i + 1, end)
    walkMessage(optionBody, map)
    i = end + 1
  }
}

const parseExpression = (
  expression: string,
  map: Map<string, IcuVariableKind>,
  walkMessage: (message: string, map: Map<string, IcuVariableKind>) => void,
) => {
  let i = skipWs(expression, 0)
  const id = readIdentifier(expression, i)
  if (!id) return

  const variableName = id.token
  i = skipWs(expression, id.next)

  if (i >= expression.length || expression[i] !== ',') {
    addVariable(map, variableName, 'argument')
    return
  }

  i = skipWs(expression, i + 1)
  const typeToken = readIdentifier(expression, i)?.token
  const normalizedKind = normalizeKind(typeToken)
  addVariable(map, variableName, normalizedKind)

  if (normalizedKind === 'plural' || normalizedKind === 'select' || normalizedKind === 'selectordinal') {
    const typeEnd = readIdentifier(expression, i)?.next ?? i
    i = skipWs(expression, typeEnd)
    if (expression[i] === ',') {
      i++
      parseOptions(expression.slice(i), map, walkMessage)
    }
  }
}

export const extractIcuVariables = (message: string): IcuVariable[] => {
  const map = new Map<string, IcuVariableKind>()

  const walkMessage = (
    value: string,
    targetMap: Map<string, IcuVariableKind>,
  ) => {
    for (let i = 0; i < value.length; i++) {
      if (value[i] !== '{') continue
      const end = findMatchingBrace(value, i)
      if (end < 0) break
      const expression = value.slice(i + 1, end)
      parseExpression(expression, targetMap, walkMessage)
      i = end
    }
  }

  walkMessage(message, map)

  return [...map.entries()].map(([name, kind]) => ({ name, kind }))
}

export const validateIcuVariables = ({
  source,
  translation,
}: {
  source: string
  translation: string
}) => {
  const required = extractIcuVariables(source)
  const provided = extractIcuVariables(translation)

  const requiredMap = new Map(required.map((variable) => [variable.name, variable]))
  const providedMap = new Map(provided.map((variable) => [variable.name, variable]))

  const missing = required.filter((variable) => !providedMap.has(variable.name))

  const kindMismatch = required.filter((variable) => {
    const candidate = providedMap.get(variable.name)
    return !!candidate && candidate.kind !== variable.kind
  })

  const extra = provided.filter((variable) => !requiredMap.has(variable.name))

  return {
    missing,
    kindMismatch,
    extra,
    isValid: missing.length === 0 && kindMismatch.length === 0,
  }
}
