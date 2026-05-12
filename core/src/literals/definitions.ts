import { extractIcuVariables, type IcuVariable } from "./icu";

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

const defineLiteralCatalog = (catalog: LiteralCatalogInput) => {
  const keys = Object.keys(catalog);
  const definitions: LiteralDefinition[] = keys.map((key) => ({
    key,
    defaultMessage: catalog[key]?.defaultMessage ?? "",
    description: catalog[key]?.description ?? "",
    usedBy: catalog[key]?.usedBy ?? [],
    variables: extractIcuVariables(catalog[key]?.defaultMessage ?? ""),
  }));

  const byKey = new Map<string, LiteralDefinition>(
    definitions.map((definition) => [definition.key, definition]),
  );

  return { definitions, byKey };
};

export type LiteralCatalogInput = Record<string, LiteralInput>;

export type LiteralKey = string;

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

export type LiteralValuesByKey = Record<string, ParamsFromSpec<Record<string, LiteralParamSpecValue>> | undefined>;

let currentCatalog = defineLiteralCatalog({});

export const setLiteralCatalog = (input: LiteralCatalogInput): void => {
  currentCatalog = defineLiteralCatalog(input);
};

export const getLiteralDefinitions = (): LiteralDefinition[] =>
  currentCatalog.definitions;

export const getLiteralDefinition = (
  key: string,
): LiteralDefinition | undefined => currentCatalog.byKey.get(key);
