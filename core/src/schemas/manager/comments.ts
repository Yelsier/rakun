import z from "zod";

import { mentionUser } from "./users";

export const commentReferenceInput = z.object({
  contentType: z.string().min(1),
  documentId: z.string().min(1),
});

export const listCommentsInput = commentReferenceInput.extend({
  limit: z.number().int().positive().max(200).optional(),
});

export const commentReactionEmoji = z.string().trim().min(1).max(64);

export const commentReactionRecord = z.object({
  emoji: commentReactionEmoji,
  users: z.array(mentionUser),
});

export const commentRecord = z.object({
  _id: z.string(),
  text: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  author: mentionUser,
  mentions: z.array(mentionUser),
  reactions: z.array(commentReactionRecord),
});

export const listCommentsOutput = z.object({
  totalItems: z.number(),
  comments: z.array(commentRecord),
  lastReadCommentId: z.string().optional(),
});

export const createCommentInput = commentReferenceInput.extend({
  text: z.string().trim().min(1).max(5000),
  mentions: z.array(z.string().min(1)).max(20).optional(),
});

export const createCommentOutput = z.object({
  comment: commentRecord,
});

export const toggleCommentReactionInput = commentReferenceInput.extend({
  commentId: z.string().min(1),
  emoji: commentReactionEmoji,
});

export const toggleCommentReactionOutput = z.object({
  comment: commentRecord,
});

export const markCommentsReadInput = commentReferenceInput.extend({
  commentId: z.string().min(1),
});

export const markCommentsReadOutput = z.object({
  lastReadCommentId: z.string(),
});

export const unreadCommentsCountOutput = z.object({
  count: z.number().int().nonnegative(),
});

export type CommentReferenceInput = z.infer<typeof commentReferenceInput>;
export type ListCommentsInput = z.infer<typeof listCommentsInput>;
export type CommentReactionEmoji = z.infer<typeof commentReactionEmoji>;
export type CommentReactionRecord = z.infer<typeof commentReactionRecord>;
export type CommentRecord = z.infer<typeof commentRecord>;
export type ListCommentsOutput = z.infer<typeof listCommentsOutput>;
export type CreateCommentInput = z.infer<typeof createCommentInput>;
export type CreateCommentOutput = z.infer<typeof createCommentOutput>;
export type ToggleCommentReactionInput = z.infer<typeof toggleCommentReactionInput>;
export type ToggleCommentReactionOutput = z.infer<typeof toggleCommentReactionOutput>;
export type MarkCommentsReadInput = z.infer<typeof markCommentsReadInput>;
export type MarkCommentsReadOutput = z.infer<typeof markCommentsReadOutput>;
export type UnreadCommentsCountOutput = z.infer<
  typeof unreadCommentsCountOutput
>;
