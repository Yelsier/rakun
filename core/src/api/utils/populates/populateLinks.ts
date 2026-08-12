import { RouteMap } from "../../../internal-content-types";
import type ContentType from "../../../lib/ContentType";
import type { AnyField } from "../../../lib/fields/Field";
import { getContentTypeByName } from "../../../lib/Registry";
import type { DBOutput, DataFront } from "../../../lib/types";
import { hasKeys } from "../../../lib/utils/hasKeys";
import { getMongoService } from "../../../orm";
import { getLanguages } from "../getLanguages";

export const populateLinks = async <T extends ContentType>(
  data: DBOutput<T>,
): Promise<DataFront<T>> => {
  const db = await getMongoService();

  const languages = await getLanguages();
  const defaultLanguageCode = languages.find((l) => l.default)?.code || "";

  const populateLinkValue = async (value: unknown): Promise<unknown> => {
    if (typeof value === "string") {
      return { href: value, title: "" };
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
        return {
          href: "",
          title:
            "title" in value && typeof value.title === "string"
              ? value.title
              : "",
        };
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
      return {
        href: populated,
        title:
          "title" in value && typeof value.title === "string"
            ? value.title
            : "",
      };
    }

    if (hasKeys(value) && typeof value.href === "string") {
      return {
        href: value.href,
        title: typeof value.title === "string" ? value.title : "",
      };
    }

    return value;
  };

  const populateObject = async (
    value: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    const contentType =
      typeof value._type === "string"
        ? getContentTypeByName(value._type)
        : undefined;

    return Object.fromEntries(
      await Promise.all(
        Object.entries(value).map(async ([key, item]) => [
          key,
          await populateValue(item, contentType?.fields[key]),
        ]),
      ),
    );
  };

  const populateValue = async (
    value: unknown,
    field?: AnyField,
  ): Promise<unknown> => {
    if (hasKeys(value) && value._tag === "Translatable") {
      return Object.fromEntries(
        await Promise.all(
          Object.entries(value).map(async ([key, item]) => [
            key,
            key === "_tag" ? item : await populateValue(item, field),
          ]),
        ),
      );
    }

    if (
      field?.meta.ui === "SimpleList" &&
      "field" in field &&
      Array.isArray(value)
    ) {
      return Promise.all(
        value.map((item) => populateValue(item, field.field as AnyField)),
      );
    }

    if (
      field &&
      (field.meta.ui === "List" || field.meta.ui === "Iterator") &&
      "fields" in field &&
      Array.isArray(field.fields) &&
      Array.isArray(value)
    ) {
      const fields = field.fields as Array<{
        name: string;
        field: AnyField;
      }>;

      return Promise.all(
        value.map(async (item) => {
          if (!hasKeys(item) || typeof item.name !== "string") {
            return populateValue(item);
          }

          const entry = fields.find(
            (candidate: { name: string }) => candidate.name === item.name,
          ) as { name: string; field: AnyField } | undefined;

          return {
            ...item,
            value: await populateValue(item.value, entry?.field),
          };
        }),
      );
    }

    if (field?.meta.type === "Menu" && Array.isArray(value)) {
      const populateMenuItems = async (items: unknown[]): Promise<unknown[]> =>
        Promise.all(
          items.map(async (item) => {
            if (!hasKeys(item)) return item;

            return {
              ...(await populateLinkValue(item) as Record<string, unknown>),
              children: await populateMenuItems(
                Array.isArray(item.children) ? item.children : [],
              ),
            };
          }),
        );

      return populateMenuItems(value);
    }

    if (field?.meta.type === "Link") {
      return populateLinkValue(value);
    }

    // Preserve support for route references found in untyped nested objects.
    if (
      value &&
      typeof value === "object" &&
      "routeId" in value &&
      "contentTypeId" in value
    ) {
      return populateLinkValue(value);
    }

    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => populateValue(item)));
    }

    if (hasKeys(value)) {
      return populateObject(value);
    }

    return value;
  };

  const result = await populateObject(data as Record<string, unknown>);

  return result as DataFront<T>;
};
