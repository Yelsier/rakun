export const createRealtimeTopic = (...parts: Array<string | number | null | undefined>): string =>
  JSON.stringify(parts)

export const collaborationRealtimeTopic = (
  resource: 'content' | 'template',
  contentType: string,
  documentId?: string
): string => createRealtimeTopic('collaboration', resource, contentType, documentId)

export const contentCommentsRealtimeTopic = (contentType: string, documentId: string): string =>
  createRealtimeTopic('content-comments', contentType, documentId)

export const managerNotificationsRealtimeTopic = (): string =>
  createRealtimeTopic('manager-notifications')
