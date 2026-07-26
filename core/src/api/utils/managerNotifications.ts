import {
  ManagerNotification,
  ManagerUser,
} from '../../internal-content-types'
import { getMongoService } from '../../orm'
import { relation } from './reviews'

export type ManagerNotificationKind =
  | 'comment_mention'
  | 'review_requested'
  | 'review_approved'
  | 'review_changes_requested'
  | 'review_feedback'

export const createManagerNotification = async ({
  userId,
  authorId,
  eventId,
  kind,
  reviewId,
  contentType,
  documentId,
  text,
}: {
  userId: string
  authorId: string
  eventId: string
  kind: ManagerNotificationKind
  reviewId?: string
  contentType: string
  documentId: string
  text: string
}) => {
  if (userId === authorId) return null

  const db = await getMongoService()
  return await db.create(
    ManagerNotification,
    {
      _type: ManagerNotification.name,
      user: relation(ManagerUser.name, userId),
      author: relation(ManagerUser.name, authorId),
      commentId: eventId,
      ...(kind === 'comment_mention' ? {} : { kind }),
      reviewId,
      contentType,
      documentId,
      text,
      read: false,
      createdBy: authorId,
      updatedBy: authorId,
    },
    { actorId: authorId },
  )
}
