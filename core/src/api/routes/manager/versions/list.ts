import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import {
  ListVersionsInput,
  ListVersionsOutput,
} from "../../../../schemas/manager/versions";
import { checkPermissions } from "../../../utils/checkPermissions";

export const listVersionsHandler = async ({
  input,
  ctx,
}: {
  input: ListVersionsInput;
  ctx: RakunRequestContext;
}): Promise<ListVersionsOutput> => {
  const user = ctx.getUser();
  checkPermissions(user, ["manager.versions.readAny"]);
  const db = await getMongoService();
  return db.versions.list(input);
};
