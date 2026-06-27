import z from "zod";

export const mentionUserAvatar = z
  .object({
    url: z.string().optional(),
    previewUrl: z.string().optional(),
  })
  .nullable();

export const mentionUser = z.object({
  _id: z.string(),
  name: z.string().optional(),
  user: z.string(),
  avatar: mentionUserAvatar,
});

export const listMentionUsersOutput = z.array(mentionUser);

export type MentionUser = z.infer<typeof mentionUser>;
export type ListMentionUsersOutput = z.infer<typeof listMentionUsersOutput>;
