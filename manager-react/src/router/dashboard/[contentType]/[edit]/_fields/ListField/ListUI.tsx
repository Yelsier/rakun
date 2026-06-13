"use client";

import { Box, ChevronsUpDown, GripVertical, Plus, Trash } from "lucide-react";
import React, { useCallback, useEffect, useRef } from "react";
import type {
  EncodedRelationField,
  ListFieldValueItem,
} from "@rakun-kit/core/client";

import type { ListPropsRef } from ".";
import { fieldsMap, type FieldRef } from "../../ContentTypeEdit";
import { FieldValue, useFieldValues } from "../shared";
import { FieldWrapper } from "../shared/FieldWrapper";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from "@/components/ui/sortable";
import { useLanguage } from "@/lib/providers/language/LanguageClientProvider";
import {
  getIteratorModuleDisplay,
  IteratorModulePickerDialog,
} from "./IteratorModulePicker";

type ListFieldValues = (ListFieldValueItem<FieldValue> & { uid: string })[];

const getModuleId = (item: ListFieldValues[number]) => {
  const value = item.value;

  if (!value || typeof value !== "object") return undefined;

  if ("_id" in value && typeof value._id === "string") {
    return value._id;
  }

  if (
    "data" in value &&
    value.data &&
    typeof value.data === "object" &&
    "_id" in value.data &&
    typeof value.data._id === "string"
  ) {
    return value.data._id;
  }

  return undefined;
};

const isApiOnlyNewRelationField = (
  field: ListPropsRef["fields"][number]["field"],
): field is EncodedRelationField => {
  if (field.config.type !== "Relation") return false;

  const relationField = field as EncodedRelationField;

  return (
    relationField.only === "new" &&
    Object.values(relationField.contentType.fields).every(
      (field) => field.visibility === "api",
    )
  );
};

const getApiOnlyNewRelationValue = (field: EncodedRelationField) => ({
  type: "new" as const,
  data: {
    _type: field.contentType.name,
  },
});

const AddListButtons = React.memo(
  ({
    fields,
    onAdd,
  }: {
    fields: ListPropsRef["fields"];
    onAdd: (fieldName: string) => void;
  }) => (
    <div className="flex gap-2 flex-wrap">
      {fields.map((field) => (
        <Button
          onClick={() => onAdd(field.name)}
          variant={"outline"}
          key={field.name}
        >
          <Plus /> {field.name}
        </Button>
      ))}
    </div>
  ),
);

AddListButtons.displayName = "AddListButtons";

const ListUI: React.FC<ListPropsRef> = ({ id, ref, ...props }) => {
  const refs = useRef<Record<string, FieldRef | null>>({});
  const valueRef = useRef<ListFieldValues>([]);
  const setRef = useCallback(
    (uid: string) => (fieldRef: FieldRef | null) => {
      refs.current[uid] = fieldRef;
    },
    [],
  );
  const { language } = useLanguage();

  const { value, errors, onValueChange, getValue, getState } =
    useFieldValues<ListFieldValues>({
      id,
      isRequired: props.isRequired,
      isTranslatable: props.isTranslatable,
      defaultData: (
        props.defaultData as (ListFieldValueItem<FieldValue> & {
          uid?: string;
        })[]
      )?.map((item) => ({
        ...item,
        uid: item.uid || crypto.randomUUID(),
      })),
      defaultValue: [],
      validateValue: (value) => {
        const values = value.map((item) => refs.current[item.uid]?.getValue());

        if (values.some((v) => typeof v === "object" && v && "_error" in v)) {
          return "Please fix the errors above";
        }

        return null;
      },
    });

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const getValueWithNested = () => {
    const values = getValue();

    if (!values || "_error" in values) {
      return values;
    }

    return (values as ListFieldValues)
      .map((field) => {
        const nestedValue = refs.current[field.uid]?.getValue();

        if (nestedValue !== undefined) {
          return {
            name: field.name,
            value: nestedValue,
          };
        }

        const fieldConfig = props.fields.find(
          (config) => config.name === field.name,
        );

        if (fieldConfig && isApiOnlyNewRelationField(fieldConfig.field)) {
          return {
            name: field.name,
            value: getApiOnlyNewRelationValue(fieldConfig.field),
          };
        }

        return {
          name: field.name,
          value: nestedValue,
        };
      })
      .filter(
        (v) => v.value !== undefined && v.value !== null && v.value !== "",
      );
  };

  const getStateWithNested = () => {
    const states = getState();

    if (!states) return states;

    return (states as ListFieldValues).map((field) => ({
      name: field.name,
      value: refs.current[field.uid]?.getState(),
      uid: field.uid,
    }));
  };

  const handleSort = useCallback(
    (items: ListFieldValues) => {
      onValueChange(
        items.map((item) => ({
          name: item.name,
          value: refs.current[item.uid]?.getState() as FieldValue,
          uid: item.uid,
        })),
      );
    },
    [onValueChange],
  );

  const handleDelete = useCallback(
    (uid: string) => {
      onValueChange(
        value
          .filter((item) => item.uid !== uid)
          .map((item) => ({
            name: item.name,
            value: refs.current[item.uid]?.getState() as FieldValue,
            uid: item.uid,
          })),
      );
      delete refs.current[uid];
    },
    [onValueChange, value],
  );

  const handleAddItem = useCallback(
    (fieldName: string) => {
      const currentValue = valueRef.current;
      onValueChange([
        ...(currentValue?.map((item) => ({
          name: item.name,
          uid: item.uid,
          value: refs.current[item.uid]?.getState() as FieldValue,
        })) || []),
        {
          name: fieldName,
          value: undefined,
          uid: crypto.randomUUID(),
        },
      ]);
    },
    [onValueChange],
  );

  useEffect(() => {
    const currentValue = valueRef.current;
    onValueChange(
      currentValue?.map((item) => ({
        name: item.name,
        value: refs.current[item.uid]?.getState() as FieldValue,
        uid: item.uid,
      })),
    );
  }, [language.code]);

  return (
    <Sortable
      value={value}
      onValueChange={handleSort}
      getItemValue={(item) => item.uid}
    >
      <FieldWrapper
        id={id}
        errors={errors}
        getValue={getValueWithNested}
        getState={getStateWithNested}
        ref={ref}
      >
        {props.config.ui === "Iterator" ? (
          <IteratorModulePickerDialog
            fields={props.fields}
            onAdd={handleAddItem}
          />
        ) : (
          <AddListButtons fields={props.fields} onAdd={handleAddItem} />
        )}
        <SortableContent>
          {value.length > 0 && (
            <div className="flex flex-col gap-4 mt-6">
              {value.map((item, i) => {
                const fieldConfig = props.fields.find(
                  (f) => f.name === item.name,
                );
                if (!fieldConfig) {
                  return null;
                }

                const noModulesToRender = isApiOnlyNewRelationField(
                  fieldConfig.field,
                );

                const FieldComponent =
                  fieldsMap[fieldConfig?.field.config.type];
                const moduleId = getModuleId(item);
                const moduleDisplay =
                  props.config.ui === "Iterator"
                    ? getIteratorModuleDisplay(fieldConfig)
                    : undefined;
                const ModuleIcon = moduleDisplay?.icon ?? Box;
                return (
                  <SortableItem key={item.uid} value={item.uid} asChild>
                    <div
                      className="flex gap-2"
                      data-rakun-manager-field-id={id}
                      data-rakun-manager-module-id={moduleId}
                      data-rakun-manager-module-index={i}
                      data-rakun-manager-module-item=""
                    >
                      <Collapsible
                        defaultOpen={!noModulesToRender}
                        className="w-full"
                      >
                        <Card className="w-full">
                          <CardHeader className="gap-0">
                            <CollapsibleTrigger
                              asChild
                              disabled={noModulesToRender}
                            >
                              <div className="flex items-center justify-between gap-2 cursor-pointer">
                                <CardTitle className="flex min-w-0 items-center gap-2">
                                  <div className="flex shrink-0 items-center gap-2">
                                    <SortableItemHandle asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                      >
                                        <GripVertical className="h-4 w-4" />
                                      </Button>
                                    </SortableItemHandle>
                                    {!noModulesToRender ? (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        asChild
                                      >
                                        <div>
                                          <ChevronsUpDown />
                                          <span className="sr-only">
                                            Toggle
                                          </span>
                                        </div>
                                      </Button>
                                    ) : null}
                                  </div>
                                  {moduleDisplay ? (
                                    <div className="flex min-w-0 items-center gap-2">
                                      <ModuleIcon className="size-4 shrink-0 text-muted-foreground" />
                                      <span className="truncate">
                                        {moduleDisplay.title}
                                      </span>
                                    </div>
                                  ) : (
                                    item.name
                                  )}
                                </CardTitle>
                                <Button
                                  size={"icon"}
                                  variant={"destructive"}
                                  onClick={() => {
                                    handleDelete(item.uid);
                                  }}
                                >
                                  <Trash />
                                </Button>
                              </div>
                            </CollapsibleTrigger>
                          </CardHeader>
                          {!noModulesToRender ? (
                            <CollapsibleContent
                              forceMount
                              className="data-[state=closed]:hidden"
                            >
                              <CardContent>
                                <FieldComponent
                                  id={`${id}.${item.uid}.${fieldConfig.name}`}
                                  ref={setRef(item.uid)}
                                  collapsible
                                  defaultData={value[i]?.value}
                                  parentContentType={props.parentContentType}
                                  {...fieldConfig.field}
                                />
                              </CardContent>
                            </CollapsibleContent>
                          ) : null}
                        </Card>
                      </Collapsible>
                    </div>
                  </SortableItem>
                );
              })}
            </div>
          )}
        </SortableContent>
      </FieldWrapper>
    </Sortable>
  );
};

export default ListUI;
