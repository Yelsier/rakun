"use client";

import { ChevronsUpDown, GripVertical, Plus, Trash } from "lucide-react";
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

type ListFieldValues = (ListFieldValueItem<FieldValue> & { uid: string })[];

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
      .map((field) => ({
        name: field.name,
        value: refs.current[field.uid]?.getValue(),
      }))
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
        <AddListButtons fields={props.fields} onAdd={handleAddItem} />
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

                const noModulesToRender =
                  fieldConfig.field.config.type === "Relation" &&
                  Object.values(
                    (fieldConfig.field as EncodedRelationField).contentType
                      .fields,
                  ).every((f) => f.visibility === "api");

                const FieldComponent =
                  fieldsMap[fieldConfig?.field.config.type];
                return (
                  <SortableItem key={item.uid} value={item.uid} asChild>
                    <div className="flex gap-2">
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
                              <div className="flex justify-between items-center cursor-pointer">
                                <CardTitle className="flex items-center gap-2 ">
                                  <div className="flex items-center gap-2">
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
                                  {item.name}
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
