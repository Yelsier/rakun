export type CollaborationRoomReference = {
  roomId: string
  resource: 'content' | 'template'
  contentType: string
  documentId?: string
}

export const getContentCollaborationRoomId = (
  contentType: string,
  documentId: string,
) => `content:${encodeURIComponent(contentType)}:${encodeURIComponent(documentId)}`

export const getTemplateCollaborationRoomId = (contentType: string) =>
  `template:${encodeURIComponent(contentType)}`

export const getCollaborationRoomReferenceFromTopic = (
  topic: string,
): CollaborationRoomReference | null => {
  try {
    const value: unknown = JSON.parse(topic)
    if (
      !Array.isArray(value) ||
      value[0] !== 'collaboration' ||
      (value[1] !== 'content' && value[1] !== 'template') ||
      typeof value[2] !== 'string' ||
      !value[2]
    ) {
      return null
    }

    if (value[1] === 'content') {
      if (typeof value[3] !== 'string' || !value[3]) return null
      return {
        roomId: getContentCollaborationRoomId(value[2], value[3]),
        resource: 'content',
        contentType: value[2],
        documentId: value[3],
      }
    }

    return {
      roomId: getTemplateCollaborationRoomId(value[2]),
      resource: 'template',
      contentType: value[2],
    }
  } catch {
    return null
  }
}
