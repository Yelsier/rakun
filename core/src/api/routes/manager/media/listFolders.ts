import { MediaFolder } from "../../../../internal-content-types";
import { hasPermissions } from "../../../../lib/Permissions";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import {
  ListFoldersInput,
  ListFoldersOutput,
} from "../../../../schemas/manager/media/listFolders";
import { checkAnyPermissions } from "../../../utils/checkPermissions";

export const listFoldersHandler = async ({
  input,
  ctx,
}: {
  input: ListFoldersInput;
  ctx: RakunRequestContext;
}): Promise<ListFoldersOutput> => {
  const user = ctx.getUser();
  const db = await getMongoService();

  checkAnyPermissions(user, ["content.Media.own", "content.Media.readAny"]);

  const filter: Record<string, unknown> = input.parentId
    ? { "parent._id": input.parentId }
    : { parent: { $exists: false } };

  if (!hasPermissions(user, ["content.Media.readAny"])) {
    filter.createdBy = user._id;
  }

  const result = await db.list(MediaFolder, {
    filter,
    options: {
      limit: "all",
    },
  });

  return {
    items: result.items.map((item) => ({
      _id: item._id,
      name: item.name,
      slug: item.slug,
      path: item.path,
      parentId: item.parent?._id,
      description: item.description ?? undefined,
    })),
  };
};
