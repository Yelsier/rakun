import { Route, Language, RouteMap } from "../../../internal-content-types";
import { getRakunBootstrapOptions } from "../../../bootstrapState";
import { Logger } from "../../../lib/Logger";
import { getMongoService } from "../../../orm";
import {
  regenerateAllRoutesMap,
  updateLanguageRoutesMap,
  updateRouteRouteMap,
  updateSingleRouteMap,
} from "./updateRoutesMap";

const normalizePath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "/";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash || "/";
};

export async function revalidatePath(path: string): Promise<void> {
  const revalidate = getRakunBootstrapOptions()?.revalidate;

  if (!revalidate) {
    Logger.warn(
      "Skipping path revalidation because `revalidate` is not configured in rakunBootstrap",
      {
        path,
      },
    );
    return;
  }

  const normalizedPath = normalizePath(path);
  const response = await fetch(revalidate.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${revalidate.token}`,
    },
    body: JSON.stringify({
      path: normalizedPath,
    }),
    signal: AbortSignal.timeout(revalidate.timeoutMs ?? 5000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to revalidate path "${normalizedPath}": ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`,
    );
  }

  Logger.addTrace("route.revalidatePath: invalidated", {
    path: normalizedPath,
  });
}

const upsertCase = async (
  contentType: string,
  contentTypeId: string,
): Promise<void> => {
  const db = await getMongoService();
  if (contentType === "Route") {
    await updateRouteRouteMap(await db.get(Route, contentTypeId));
  } else if (contentType === "RouteSettings") {
    await regenerateAllRoutesMap();
  } else if (contentType === "Language") {
    await updateLanguageRoutesMap(await db.get(Language, contentTypeId));
  } else {
    await updateSingleRouteMap({ contentType, contentTypeId });
  }
};

const deleteCase = async (
  contentType: string,
  contentTypeId: string,
): Promise<void> => {
  const db = await getMongoService();

  let paths: string[];

  if (contentType === "Route") {
    paths = await db
      .list(RouteMap, {
        filter: { routeId: contentTypeId },
        options: { fields: ["path"], limit: "all" },
      })
      .then((res) => res.items.map((item) => item.path));

    await db.delete(RouteMap, { routeId: contentTypeId });
  } else if (contentType === "RouteSettings") {
    await regenerateAllRoutesMap();
    return;
  } else if (contentType === "Language") {
    paths = await db
      .list(RouteMap, {
        filter: { languageId: contentTypeId },
        options: { fields: ["path"], limit: "all" },
      })
      .then((res) => res.items.map((item) => item.path));

    await db.delete(RouteMap, { languageId: contentTypeId });
  } else {
    paths = await db
      .list(RouteMap, {
        filter: { contentType, contentTypeId },
        options: { fields: ["path"], limit: "all" },
      })
      .then((res) => res.items.map((item) => item.path));

    await db.delete(RouteMap, { contentType, contentTypeId });
  }

  await Promise.all(paths.map(revalidatePath));
};

export const checkRevalidatePath = ({
  contentType,
  contentTypeId,
  operation,
}: {
  contentType: string;
  contentTypeId: string;
  operation: "create" | "update" | "delete";
}) =>
  (async () => {
    const operations = {
      create: upsertCase,
      update: upsertCase,
      delete: deleteCase,
    };
    try {
      await operations[operation](contentType, contentTypeId);
    } catch (error) {
      Logger.error(
        `Error during ${operation} operation for ${contentType} with ID ${contentTypeId}:`,
        error as Error,
      );
      throw error;
    }
  })();
