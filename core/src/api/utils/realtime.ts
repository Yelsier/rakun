import {
  collaborationRealtimeTopic,
  contentCommentsRealtimeTopic,
  contentVersionsRealtimeTopic,
  getPlatform,
  localeVariantsRealtimeTopic,
  managerNotificationsRealtimeTopic,
} from '../../platform'

export const publishLocaleVariantChanges = (contentType: string): void => {
  const realtime = getPlatform().realtime
  realtime.publish(localeVariantsRealtimeTopic(contentType))
  realtime.publish(contentVersionsRealtimeTopic(contentType))
}

export const publishDeletedContentChanges = (
  contentType: string,
  documentIds: readonly string[]
): void => {
  const realtime = getPlatform().realtime

  for (const documentId of documentIds) {
    realtime.publish(collaborationRealtimeTopic('content', contentType, documentId))
    realtime.publish(contentCommentsRealtimeTopic(contentType, documentId))
  }

  realtime.publish(managerNotificationsRealtimeTopic())
}
