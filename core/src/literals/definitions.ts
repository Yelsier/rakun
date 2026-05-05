import { extractIcuVariables, type IcuVariable } from "./icu";
const literalCatalogInput = {};

export type LiteralDefinition = {
  key: string;
  defaultMessage: string;
  description: string;
  usedBy: string[];
  variables: IcuVariable[];
};

type LiteralParamSpecValue =
  | "string"
  | "number"
  | "boolean"
  | readonly string[];

type LiteralInput = {
  defaultMessage: string;
  description: string;
  usedBy?: string[];
  params?: Record<string, LiteralParamSpecValue>;
};

const defineLiteralCatalog = <T extends Record<string, LiteralInput>>(
  catalog: T,
) => {
  const keys = Object.keys(catalog) as Array<Extract<keyof T, string>>;
  const definitions: LiteralDefinition[] = keys.map((key) => ({
    key: String(key),
    defaultMessage: catalog[key]?.defaultMessage ?? "",
    description: catalog[key]?.description ?? "",
    usedBy: catalog[key]?.usedBy ?? [],
    variables: extractIcuVariables(catalog[key]?.defaultMessage ?? ""),
  }));

  const byKey = new Map<string, LiteralDefinition>(
    definitions.map((definition) => [definition.key, definition]),
  );

  return {
    definitions,
    byKey,
  };
};

export type LiteralCatalogInput = Record<string, LiteralInput>;

export type LiteralKey = keyof typeof literalCatalogInput;

type ParamSpecToType<T extends LiteralParamSpecValue> = T extends "number"
  ? number
  : T extends "boolean"
    ? boolean
    : T extends readonly (infer U)[]
      ? U
      : string;

type ParamsFromSpec<
  T extends Record<string, LiteralParamSpecValue> | undefined,
> =
  T extends Record<string, LiteralParamSpecValue>
    ? { [P in keyof T]: ParamSpecToType<T[P]> }
    : undefined;

export type LiteralValuesByKey = {
  [K in LiteralKey]: (typeof literalCatalogInput)[K] extends {
    params: infer P extends Record<string, LiteralParamSpecValue>;
  }
    ? ParamsFromSpec<P>
    : undefined;
};

export const literalCatalog = defineLiteralCatalog(literalCatalogInput);

export const literalDefinitions = literalCatalog.definitions;
export const literalDefinitionsByKey = literalCatalog.byKey;

export const getLiteralDefinitions = (): LiteralDefinition[] =>
  literalDefinitions;

export const getLiteralDefinition = (
  key: string,
): LiteralDefinition | undefined => literalDefinitionsByKey.get(key);
