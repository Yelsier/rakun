export type CollaborativeRootFieldState = {
  fieldName: string
  nested: boolean
  state: unknown
}

export const resolveCollaborativeRootFieldState = ({
  fieldId,
  readRootFieldState,
  rootId,
  state,
}: {
  fieldId: string
  readRootFieldState: (fieldName: string) => unknown
  rootId: string
  state: unknown
}): CollaborativeRootFieldState | null => {
  const prefix = `${rootId}.`
  const relativeFieldId = fieldId.startsWith(prefix) ? fieldId.slice(prefix.length) : fieldId
  const separatorIndex = relativeFieldId.indexOf('.')
  const fieldName =
    separatorIndex === -1 ? relativeFieldId : relativeFieldId.slice(0, separatorIndex)

  if (!fieldName) return null
  if (separatorIndex === -1) {
    return { fieldName, nested: false, state }
  }

  const rootFieldState = readRootFieldState(fieldName)
  return rootFieldState === undefined ? null : { fieldName, nested: true, state: rootFieldState }
}
