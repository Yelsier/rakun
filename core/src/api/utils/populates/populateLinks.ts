import { RouteMap } from "../../../internal-content-types";
import ContentType from "../../../lib/ContentType";
import { DBOutput, DataFront } from "../../../lib/types";
import { hasKeys } from "../../../lib/utils/hasKeys";
import { getMongoService } from "../../../orm";
import { getLanguages } from "../getLanguages";

export const populateLinks = async <T extends ContentType>(
  data: DBOutput<T>,
): Promise<DataFront<T>> => {
  const db = await getMongoService();

  const languages = await getLanguages();
  const defaultLanguageCode = languages.find((l) => l.default)?.code || "";

  const populateValue = async (value: unknown): Promise<unknown> => {
    // arrays: procesar en paralelo cada elemento
    if (Array.isArray(value)) {
      return Promise.all(value.map(populateValue));
    }

    if (
      value &&
      typeof value === "object" &&
      "routeId" in value &&
      "contentTypeId" in value
    ) {
      const routeId = value.routeId as string;
      const contentTypeId = value.contentTypeId as string;

      const routeMapsByGroup = await db.list(RouteMap, {
        filter: {
          routeId,
          variantGroupId: contentTypeId,
        },
        options: { limit: "all" },
      });
      const items = (
        routeMapsByGroup.items.length > 0
          ? routeMapsByGroup
          : await db.list(RouteMap, {
              filter: {
                routeId,
                contentTypeId,
              },
              options: { limit: "all" },
            })
      ).items;

      if (items.length === 0) {
        return value;
      }

      const populated = Object.fromEntries(
        items
          .map((item) => {
            const lang = languages.find(
              (l) => String(l._id) === String(item.languageId),
            );
            return [lang ? lang.code : defaultLanguageCode, item.path];
          })
          .concat([["_tag", "Translatable"]]),
      );

      return await populateLinks(populated as DBOutput<T>);
    }

    if (hasKeys(value)) {
      const entries = Object.entries(value);
      return Object.fromEntries(
        await Promise.all(
          entries.map(async ([k, v]) => [k, await populateValue(v)]),
        ),
      );
    }

    return value;
  };

  const entries = Object.entries(data);
  const result = Object.fromEntries(
    await Promise.all(
      entries.map(async ([k, v]) => [k, await populateValue(v)]),
    ),
  );

  return result as DataFront<T>;
};
