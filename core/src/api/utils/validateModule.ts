import z, { ZodError } from "zod";
import { Logger } from "../../lib/Logger";
import { getContentTypeByName } from "../../lib/Registry";
import { PageModule } from "../../schemas/web/page";
import { ErrorModule } from "../../lib/types";

export const validateModule = (module: PageModule): PageModule => {
  const ct = getContentTypeByName(module._type);

  try {
    ct.validateOutput(module);
    return module;
  } catch (error) {
    Logger.error("Module validation failed", {
      moduleId: module._id,
      moduleType: module._type,
      error:
        error instanceof ZodError
          ? z.prettifyError(error)
          : (error as Error).message,
    });
    return {
      _id: module._id,
      _type: "ErrorModule",
      recived: module,
      error:
        error instanceof ZodError
          ? z.prettifyError(error)
          : (error as Error).message,
    } as ErrorModule;
  }
};
