import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import {
  ListVersionsInput,
  ListVersionsOutput,
} from "../../../../schemas/manager/versions";

export const listVersionsHandler = async ({
  input,
  ctx,
}: {
  input: ListVersionsInput;
  ctx: RakunRequestContext;
}): Promise<ListVersionsOutput> => {
  ctx.getUser();
  const db = await getMongoService();
  const versions = await db.versions.list(input);
  return versions;
};
