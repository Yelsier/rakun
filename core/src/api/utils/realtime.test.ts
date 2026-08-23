import { expect, test } from 'bun:test'

import { createPlatform, getPlatform, setPlatform, sseRealtime } from '../../platform'
import {
  collaborationRealtimeTopic,
  contentCommentsRealtimeTopic,
  contentVersionsRealtimeTopic,
  localeVariantsRealtimeTopic,
  managerNotificationsRealtimeTopic,
} from '../../platform/realtimeTopics'
import { publishDeletedContentChanges, publishLocaleVariantChanges } from './realtime'

test('publishes every invalidation affected by content lifecycle changes', () => {
  const previousPlatform = getPlatform()
  const realtime = sseRealtime()
  const changes = new Map<string, number>()
  const topics = [
    localeVariantsRealtimeTopic('Page'),
    contentVersionsRealtimeTopic('Page'),
    collaborationRealtimeTopic('content', 'Page', 'page-1'),
    contentCommentsRealtimeTopic('Page', 'page-1'),
    managerNotificationsRealtimeTopic(),
  ]
  const unsubscribe = topics.map((topic) =>
    realtime.subscribe(topic, () => changes.set(topic, (changes.get(topic) ?? 0) + 1))
  )

  try {
    setPlatform(createPlatform({ realtime }))

    publishLocaleVariantChanges('Page')
    publishDeletedContentChanges('Page', ['page-1'])

    expect(Object.fromEntries(changes)).toEqual(
      Object.fromEntries(topics.map((topic) => [topic, 1]))
    )
  } finally {
    for (const stop of unsubscribe) stop()
    setPlatform(previousPlatform)
  }
})
