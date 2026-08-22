import { describe, expect, test } from 'bun:test'

import { getTemplateCollaborationRoomId } from './templateCollaboration'

describe('template collaboration rooms', () => {
  test('uses one encoded room per content type', () => {
    expect(getTemplateCollaborationRoomId('Landing Page')).toBe(
      'template:Landing%20Page',
    )
    expect(getTemplateCollaborationRoomId('Landing Page')).toBe(
      getTemplateCollaborationRoomId('Landing Page'),
    )
    expect(getTemplateCollaborationRoomId('Article')).not.toBe(
      getTemplateCollaborationRoomId('Landing Page'),
    )
  })
})
