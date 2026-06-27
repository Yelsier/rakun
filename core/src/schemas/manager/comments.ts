import z from "zod";

import { mentionUser } from "./users";

export const commentReferenceInput = z.object({
  contentType: z.string().min(1),
  documentId: z.string().min(1),
});

export const listCommentsInput = commentReferenceInput.extend({
  limit: z.number().int().positive().max(200).optional(),
});

export const commentRecord = z.object({
  _id: z.string(),
  text: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  author: mentionUser,
  mentions: z.array(mentionUser),
});

export const listCommentsOutput = z.object({
  totalItems: z.number(),
  comments: z.array(commentRecord),
});

export const createCommentInput = commentReferenceInput.extend({
  text: z.string().trim().min(1).max(5000),
  mentions: z.array(z.string().min(1)).max(20).optional(),
});

export const createCommentOutput = z.object({
  comment: commentRecord,
});

export type CommentReferenceInput = z.infer<typeof commentReferenceInput>;
export type ListCommentsInput = z.infer<typeof listCommentsInput>;
export type CommentRecord = z.infer<typeof commentRecord>;
export type ListCommentsOutput = z.infer<typeof listCommentsOutput>;
export type CreateCommentInput = z.infer<typeof createCommentInput>;
export type CreateCommentOutput = z.infer<typeof createCommentOutput>;
