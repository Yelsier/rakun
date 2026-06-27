import { ManagerUser } from "../../../internal-content-types";
import { getMongoService } from "../../../orm";
import type { ListMentionUsersOutput, MentionUser } from "../../../schemas/manager/users";
import type { RakunRequestContext } from "../../context";

type ManagerUserMentionRecord = {
  _id: string;
  name?: string;
  user: string;
  avatarUrl?: string;
  avatarPreviewUrl?: string;
};

export const toMentionUser = (user: ManagerUserMentionRecord): MentionUser => ({
  _id: user._id,
  name: user.name,
  user: user.user,
  avatar:
    user.avatarUrl || user.avatarPreviewUrl
      ? {
          url: user.avatarUrl,
          previewUrl: user.avatarPreviewUrl,
        }
      : null,
});

export const fallbackMentionUser = (id: string): MentionUser => ({
  _id: id,
  user: "Unknown user",
  avatar: null,
});

export const listMentionUsersHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext;
}): Promise<ListMentionUsersOutput> => {
  ctx.getUser();

  const db = await getMongoService();
  const result = await db.list(ManagerUser, {
    filter: {},
    options: {
      fields: ["name", "user", "avatarUrl", "avatarPreviewUrl"],
      limit: "all",
      sort: { user: "asc" } as never,
    },
  });

  return result.items.map((user) => toMentionUser(user));
};
