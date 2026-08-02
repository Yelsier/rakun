import { PreviewSnapshot, Route } from "../../../internal-content-types";
import { Logger } from "../../../lib/Logger";
import { getContentTypeByName } from "../../../lib/Registry";
import { getMongoService } from "../../../orm";
import { deepDeleteNulls } from "../../../orm/utils/deepDeleteNulls";
import type { PreviewPageInput } from "../../../schemas/web/previewPage";
import { getLanguages } from "../../utils/getLanguages";
import { parsePreviewData } from "../../utils/previewData";
import { hashPreviewToken } from "../../utils/previewToken";
import {
  buildPageOutput,
  normalizePagePath,
  NotFoundResponse,
} from "./page";

export const getPreviewPage = async (
  input: PreviewPageInput,
) => {
  const db = await getMongoService();
  const path = normalizePagePath(input.path);
  const snapshot = await db.find(PreviewSnapshot, {
    tokenHash: hashPreviewToken(input.token),
  });

  if (!snapshot || snapshot.expiresAt.getTime() <= Date.now()) {
    Logger.addTrace("web.previewPage: snapshot not found or expired");
    return NotFoundResponse;
  }

  if (normalizePagePath(snapshot.path) !== path) {
    Logger.addTrace("web.previewPage: path mismatch", {
      expected: snapshot.path,
      received: path,
    });
    return NotFoundResponse;
  }

  const contentType = getContentTypeByName(snapshot.contentType);
  if (!contentType) return NotFoundResponse;

  const route = await db.get(Route, snapshot.routeId);
  if (!route || !route.hasPage) return NotFoundResponse;

  const language = (await getLanguages()).find(
    (item) => item.code === snapshot.languageCode,
  );
  if (!language) return NotFoundResponse;

  try {
    const data = deepDeleteNulls(
      parsePreviewData(snapshot.data) as Record<string, unknown>,
    ) as Record<string, unknown> & {
      _id: string;
      _type: string;
    };

    return await buildPageOutput({
      path,
      route,
      contentType,
      contentTypeId: snapshot.documentId ?? data._id,
      data,
      language,
      tracePrefix: "web.previewPage",
      templateModules: snapshot.templatePayload
        ? (parsePreviewData(snapshot.templatePayload) as unknown[])
        : undefined,
    });
  } catch (error) {
    Logger.addTrace("web.previewPage: handler failed");
    Logger.error("Error rendering preview page:", error as Error);
    return NotFoundResponse;
  }
};
