import { Logger } from "../../../../lib/Logger";
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
  Logger.addTrace("manager.versions.list: handler start", {
    contentType: input.contentType,
    documentId: input.documentId,
  });
  ctx.getUser();
  const db = await getMongoService();
  const versions = await db.versions.list(input);
  Logger.addTrace("manager.versions.list: handler success", {
    versions: versions.length,
  });
  return versions;
};
