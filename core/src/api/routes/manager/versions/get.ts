import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import {
  ContentVersionRecord,
  GetVersionInput,
} from "../../../../schemas/manager/versions";

export const getVersionHandler = async ({
  input,
  ctx,
}: {
  input: GetVersionInput;
  ctx: RakunRequestContext;
}): Promise<ContentVersionRecord | null> => {
  ctx.getUser();
  const db = await getMongoService();
  const version = await db.versions.get(input.versionId);
  return version;
};
