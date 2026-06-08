import { ManagerUser } from "../../../../internal-content-types";
import { getMongoService } from "../../../../orm";
import type { UpdateTutorialPreferencesInput } from "../../../../schemas/manager/auth/tutorials";
import { RakunRequestContext } from "../../../context";
import { populateRelations } from "../../../utils/populates/populateRelations";

export const updateTutorialPreferencesHandler = async ({
  input,
  ctx,
}: {
  input: UpdateTutorialPreferencesInput;
  ctx: RakunRequestContext;
}) => {
  const user = ctx.getUser();
  const db = await getMongoService();

  const updated = await db.update(
    ManagerUser,
    user._id,
    createTutorialPreferencesUpdate(input),
  );

  return await populateRelations<ManagerUser>(updated, {
    exposePrivateMedia: true,
  });
};

export const createTutorialPreferencesUpdate = (
  input: UpdateTutorialPreferencesInput,
  now = new Date(),
) => ({
  tutorialsEnabled: input.enabled,
  tutorialsPromptedAt: now,
});
