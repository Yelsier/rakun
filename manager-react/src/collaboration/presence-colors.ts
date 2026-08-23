const presenceColors = [
  '#0284c7',
  '#7c3aed',
  '#db2777',
  '#059669',
  '#d97706',
  '#dc2626',
]

const hashValue = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

export const getCollaborationPresenceColor = (clientId: string) =>
  presenceColors[hashValue(clientId) % presenceColors.length] ?? presenceColors[0]
