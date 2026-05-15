import { Logger } from "../../../../lib/Logger";
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
  Logger.addTrace("manager.versions.get: handler success", {
    found: !!version,
    contentType: version?.contentType,
    documentId: version?.documentId,
    revision: version?.revision,
  });
  return version;
};
