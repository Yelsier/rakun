import { ManagerUser } from "../../../../internal-content-types";
import { getMongoService } from "../../../../orm";
import type { MarkTourSeenInput } from "../../../../schemas/manager/auth/tutorials";
import { RakunRequestContext } from "../../../context";
import { populateRelations } from "../../../utils/populates/populateRelations";

export const markTourSeenHandler = async ({
  input,
  ctx,
}: {
  input: MarkTourSeenInput;
  ctx: RakunRequestContext;
}) => {
  const user = ctx.getUser();
  const db = await getMongoService();

  const updated = await db.update(ManagerUser, user._id, {
    seenTours: getUpdatedSeenTours(user.seenTours, input.tourId),
  });

  return await populateRelations<ManagerUser>(updated, {
    exposePrivateMedia: true,
  });
};

export const getUpdatedSeenTours = (
  seenTours: (string | undefined)[] | undefined,
  tourId: string,
) => Array.from(new Set([...(seenTours ?? []).filter(Boolean), tourId]));
