import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import {
  ContentVersionRecord,
  GetVersionInput,
} from "../../../../schemas/manager/versions";
import { checkPermissions } from "../../../utils/checkPermissions";

export const getVersionHandler = async ({
  input,
  ctx,
}: {
  input: GetVersionInput;
  ctx: RakunRequestContext;
}): Promise<ContentVersionRecord | null> => {
  const user = ctx.getUser();
  checkPermissions(user, ["content.ContentVersion.readAny"]);
  const db = await getMongoService();
  return db.versions.get(input.versionId);
};
