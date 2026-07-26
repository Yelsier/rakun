import z from "zod";

import { mentionUser } from "./users";

export const listNotificationsInput = z
  .object({
    contentType: z.string().min(1).optional(),
    documentId: z.string().min(1).optional(),
    unreadOnly: z.boolean().optional(),
    limit: z.number().int().positive().max(100).optional(),
  })
  .optional();

export const notificationItem = z.object({
  _id: z.string(),
  kind: z
    .enum([
      "comment_mention",
      "review_requested",
      "review_approved",
      "review_changes_requested",
      "review_feedback",
    ])
    .optional(),
  commentId: z.string().optional(),
  reviewId: z.string().optional(),
  contentType: z.string(),
  documentId: z.string(),
  title: z.any().optional(),
  text: z.string(),
  createdAt: z.date().optional(),
  author: mentionUser,
  read: z.boolean(),
});

export const listNotificationsOutput = z.object({
  notifications: z.array(notificationItem),
  totalUnread: z.number().int().nonnegative(),
});

export const markNotificationsReadInput = z.object({
  contentType: z.string().min(1),
  documentId: z.string().min(1),
  notificationId: z.string().min(1).optional(),
});

export const markNotificationsReadOutput = z.object({
  markedRead: z.number().int().nonnegative(),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsInput>;
export type ListNotificationsOutput = z.infer<typeof listNotificationsOutput>;
export type MarkNotificationsReadInput = z.infer<
  typeof markNotificationsReadInput
>;
export type MarkNotificationsReadOutput = z.infer<
  typeof markNotificationsReadOutput
>;
