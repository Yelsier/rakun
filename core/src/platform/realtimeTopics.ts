export const createRealtimeTopic = (...parts: Array<string | number | null | undefined>): string =>
  JSON.stringify(parts)

export const collaborationRealtimeTopic = (
  resource: 'content' | 'template',
  contentType: string,
  documentId?: string
): string => createRealtimeTopic('collaboration', resource, contentType, documentId)

export const localeVariantsRealtimeTopic = (contentType: string): string =>
  createRealtimeTopic('locale-variants', contentType)

export const contentVersionsRealtimeTopic = (contentType: string): string =>
  createRealtimeTopic('content-versions', contentType)

export const contentCommentsRealtimeTopic = (contentType: string, documentId: string): string =>
  createRealtimeTopic('content-comments', contentType, documentId)

export const managerNotificationsRealtimeTopic = (): string =>
  createRealtimeTopic('manager-notifications')
