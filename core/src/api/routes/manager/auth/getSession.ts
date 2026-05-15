import { RakunRequestContext } from "../../../context";

export const getSessionHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext;
}) => ctx.user || null;
