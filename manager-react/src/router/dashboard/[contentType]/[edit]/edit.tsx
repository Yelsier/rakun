"use client";

import { cva } from "class-variance-authority";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { EncodedContentType } from "@rakun-kit/core";
import { Seo } from "@rakun-kit/core/internal-content-types";
import {
  GitBranch,
  Globe,
  LayoutPanelTop,
  NotepadText,
  ScrollText,
} from "lucide-react";
import { EncodedField } from "@rakun-kit/core/lib/fields/Field";
import { useQueries } from "@tanstack/react-query";

import type { FieldRef } from "./ContentTypeEdit";
import ContentTypeEdit from "./ContentTypeEdit";
import { FieldValue } from "./_fields/shared";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LanguageSelector from "@/components/LanguageSelector";
import {
  createManagerQueryOptions,
  useManagerClient,
  useManagerMutation,
  useManagerQuery,
} from "@/client/react";
import { useManagerNavigation } from "@/state/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/state/language";

type RouteLayoutModuleRecord = {
  _id: string;
  routeId: string;
  routeKey: string;
  routeContentType: string;
  key: string;
  contentType: string;
  order: number;
  moduleId?: string;
};

type RouteLayoutModuleOverrideRecord = {
  _id: string;
  routeId: string;
  routeKey: string;
  contentTypeId: string;
  key: string;
  contentType: string;
  moduleId?: string;
};

type ManagerContentTypeRecord = {
  name: string;
  listFields?: string[];
};

export const errorStyle = cva("", {
  variants: {
    error: {
      true: "border-red-500",
    },
  },
});

const EditPage: React.FC<{
  contentType: EncodedContentType;
  defaultData?: Record<string, FieldValue>;
}> = ({ contentType, defaultData }) => {
  const iterablesRef = useRef<FieldRef>(null);
  const nonIterablesRef = useRef<FieldRef>(null);
  const seoRef = useRef<FieldRef>(null);
  const navigation = useManagerNavigation();
  const draft = useRef(defaultData);
  const managerClient = useManagerClient();
  const createMutation = useManagerMutation("manager.create");
  const updateMutation = useManagerMutation("manager.update");
  const createOverrideMutation = useManagerMutation("manager.create");
  const updateOverrideMutation = useManagerMutation("manager.update");
  const deleteOverrideMutation = useManagerMutation("manager.delete");
  const { getTranslation } = useLanguage();
  const contentTypeId = (defaultData as { _id?: string } | undefined)?._id;
  const routeLayoutModulesQuery = useManagerQuery({
    name: "manager.list",
    input: {
      contentType: "RouteLayoutModule",
      query: {
        filter: { routeContentType: contentType.name },
        options: {
          limit: "all",
          fields: [
            "routeId",
            "routeKey",
            "routeContentType",
            "key",
            "contentType",
            "order",
            "moduleId",
          ],
        },
      },
    },
    enabled: Boolean(contentTypeId),
  });
  const routeLayoutOverridesQuery = useManagerQuery({
    name: "manager.list",
    input: {
      contentType: "RouteLayoutModuleOverride",
      query: {
        filter: { contentTypeId: contentTypeId ?? "" },
        options: {
          limit: "all",
          fields: [
            "routeId",
            "routeKey",
            "contentTypeId",
            "key",
            "contentType",
            "moduleId",
          ],
        },
      },
    },
    enabled: Boolean(contentTypeId),
  });
  const contentTypesQuery = useManagerQuery({
    name: "manager.contentTypes",
    input: undefined as never,
    enabled: Boolean(contentTypeId),
  });

  const handleCreate = async (data: unknown) => {
    const result = await createMutation.mutateAsync({
      contentType: contentType.name,
      data,
    });

    if (result && typeof result === "object" && "_id" in result) {
      navigation.push?.({
        name: "content.edit",
        contentType: contentType.name,
        id: String(result._id),
      });
    }

    toast.success("Created successfully");
  };

  const handleUpdate = async (data: unknown) => {
    const result = await updateMutation.mutateAsync({
      contentType: contentType.name,
      id: (defaultData as { _id: string })?._id,
      data,
    });

    if (result && typeof result === "object" && "_id" in result) {
      navigation.push?.({
        name: "content.edit",
        contentType: contentType.name,
        id: String(result._id),
      });
    }

    toast.success("Updated successfully");
  };

  const handleSave = async () => {
    saveState();
    if ((iterablesRef.current?.getValue() as { _error?: string })?._error)
      return;
    if ((nonIterablesRef.current?.getValue() as { _error?: string })?._error)
      return;
    if ((seoRef.current?.getValue() as { _error?: string })?._error) return;

    const data = {
      ...((iterablesRef.current?.getValue() as object) || {}),
      ...((nonIterablesRef.current?.getValue() as object) || {}),
      ...((seoRef.current?.getValue() as object) || {}),
    };

    if (defaultData) {
      await handleUpdate(data);
    } else {
      await handleCreate(data);
    }
  };

  const saveState = () => {
    draft.current = {
      ...(iterablesRef.current?.getState() as object),
      ...(nonIterablesRef.current?.getState() as object),
      ...(seoRef.current?.getState() as object),
    };
  };

  const {
    iterables,
    hasIterables,
    nonIterables,
    hasNonIterables,
    seo,
    hasSeo,
  } = useMemo(() => {
    const iterables = {
      ...contentType,
      fields: {} as Record<string, EncodedField>,
    };
    const nonIterables = {
      ...contentType,
      fields: {} as Record<string, EncodedField>,
    };
    const seo = { ...contentType, fields: {} as Record<string, EncodedField> };

    for (const [fieldName, fieldValue] of Object.entries(contentType.fields)) {
      if (fieldValue.config.ui === "Iterator") {
        iterables.fields[fieldName] = fieldValue;
      } else if (
        "contentType" in fieldValue &&
        (fieldValue.contentType as EncodedContentType).name === Seo.name
      ) {
        seo.fields[fieldName] = fieldValue;
      } else {
        nonIterables.fields[fieldName] = fieldValue;
      }
    }

    return {
      iterables,
      hasIterables: Object.keys(iterables.fields).length > 0,
      nonIterables,
      hasNonIterables: Object.keys(nonIterables.fields).length > 0,
      seo,
      hasSeo: Object.keys(seo.fields).length > 0,
    };
  }, [contentType]);

  const routeLayoutModules = (routeLayoutModulesQuery.data?.items ??
    []) as RouteLayoutModuleRecord[];
  const routeLayoutOverrides = (routeLayoutOverridesQuery.data?.items ??
    []) as RouteLayoutModuleOverrideRecord[];
  const overridesByKey = new Map(
    routeLayoutOverrides.map((override) => [
      `${override.routeId}:${override.key}`,
      override,
    ]),
  );
  const contentTypes = (contentTypesQuery.data ??
    []) as ManagerContentTypeRecord[];
  const contentTypeByName = new Map(
    contentTypes.map((contentType) => [contentType.name, contentType]),
  );
  const layoutContentTypes = Array.from(
    new Set(routeLayoutModules.map((item) => item.contentType)),
  );
  const layoutModuleOptionQueries = useQueries({
    queries: layoutContentTypes.map((contentType) => {
      const labelField =
        contentTypeByName.get(contentType)?.listFields?.[0] ?? "_id";

      return createManagerQueryOptions(managerClient, "manager.list", {
        contentType,
        query: {
          options: {
            limit: "all",
            fields: labelField === "_id" ? ["_id"] : [labelField],
          },
        },
      });
    }),
  });
  const layoutOptionsByContentType = new Map(
    layoutContentTypes.map((contentType, index) => {
      const labelField =
        contentTypeByName.get(contentType)?.listFields?.[0] ?? "_id";
      const data = layoutModuleOptionQueries[index]?.data as
        | { items?: Array<Record<string, unknown> & { _id: string }> }
        | undefined;

      return [
        contentType,
        (data?.items ?? []).map((item) => ({
          value: item._id,
          label: String(getTranslation(item[labelField]) || item._id),
        })),
      ] as const;
    }),
  );
  const [selectedLayoutOverrides, setSelectedLayoutOverrides] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    setSelectedLayoutOverrides(
      Object.fromEntries(
        routeLayoutModules.map((layoutModule) => {
          const override = overridesByKey.get(
            `${layoutModule.routeId}:${layoutModule.key}`,
          );
          return [
            layoutModule._id,
            override
              ? override.moduleId && override.moduleId.length > 0
                ? override.moduleId
                : "__none__"
              : "__default__",
          ];
        }),
      ),
    );
  }, [routeLayoutModulesQuery.data, routeLayoutOverridesQuery.data]);

  const [activeTab, setActiveTab] = useState<
    "content" | "info" | "seo" | "versions" | `layout:${string}`
  >(
    hasNonIterables
      ? "info"
      : hasIterables
        ? "content"
        : hasSeo
          ? "seo"
          : "versions",
  );

  const saveLayoutOverride = async (layoutModule: RouteLayoutModuleRecord) => {
    if (!contentTypeId) return;

    const selected = selectedLayoutOverrides[layoutModule._id] ?? "__default__";
    const existing = overridesByKey.get(
      `${layoutModule.routeId}:${layoutModule.key}`,
    );

    if (selected === "__default__") {
      if (existing) {
        await deleteOverrideMutation.mutateAsync({
          contentType: "RouteLayoutModuleOverride",
          id: existing._id,
        });
        await routeLayoutOverridesQuery.refetch();
      }

      toast.success("Layout override updated successfully");
      return;
    }

    const payload = {
      _type: "RouteLayoutModuleOverride" as const,
      routeId: layoutModule.routeId,
      routeKey: layoutModule.routeKey,
      contentTypeId,
      key: layoutModule.key,
      contentType: layoutModule.contentType,
      moduleId: selected === "__none__" ? "" : selected,
    };

    if (existing) {
      await updateOverrideMutation.mutateAsync({
        contentType: "RouteLayoutModuleOverride",
        id: existing._id,
        data: payload,
      });
    } else {
      await createOverrideMutation.mutateAsync({
        contentType: "RouteLayoutModuleOverride",
        data: payload,
      });
    }

    toast.success("Layout override updated successfully");
    await routeLayoutOverridesQuery.refetch();
  };

  return (
    <>
      <div className="container py-10 px-4 mx-auto">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            saveState();
            setActiveTab(
              v as "content" | "info" | "seo" | "versions" | `layout:${string}`,
            );
          }}
          className="w-full"
        >
          <div className="flex gap-2 justify-between items-center sticky top-0 bg-background z-50 pb-3 mb-3 border-b">
            <div className="flex">
              <TabsList variant={"line"}>
                {hasNonIterables ? (
                  <TabsTrigger value="info">
                    <NotepadText />
                    Info
                  </TabsTrigger>
                ) : null}
                {hasIterables ? (
                  <TabsTrigger value="content">
                    <ScrollText />
                    Content
                  </TabsTrigger>
                ) : null}
                {hasSeo ? (
                  <TabsTrigger value="seo">
                    <Globe />
                    Seo
                  </TabsTrigger>
                ) : null}
                {[...routeLayoutModules]
                  .sort((a, b) => a.order - b.order)
                  .map((layoutModule) => (
                    <TabsTrigger
                      key={layoutModule._id}
                      value={`layout:${layoutModule._id}`}
                    >
                      <LayoutPanelTop />
                      {layoutModule.routeKey} / {layoutModule.key}
                    </TabsTrigger>
                  ))}
                {hasIterables ? (
                  <TabsTrigger value="versions">
                    <GitBranch />
                    Versions
                  </TabsTrigger>
                ) : null}
              </TabsList>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector />

              <Button
                loading={createMutation.isPending || updateMutation.isPending}
                className="cursor-pointer ml-auto"
                onClick={() => void handleSave()}
              >
                Save
              </Button>
            </div>
          </div>
          {hasIterables ? (
            <TabsContent
              value="content"
              forceMount
              hidden={activeTab !== "content"}
              className="w-full"
            >
              <ContentTypeEdit
                defaultData={draft.current}
                ref={iterablesRef}
                contentType={iterables}
                id={contentType.name}
                collapsible
                hideTitle
              />
            </TabsContent>
          ) : null}
          {hasNonIterables ? (
            <TabsContent
              value="info"
              forceMount
              hidden={activeTab !== "info"}
              className="w-full"
            >
              <ContentTypeEdit
                defaultData={draft.current}
                ref={nonIterablesRef}
                contentType={nonIterables}
                id={contentType.name}
              />
            </TabsContent>
          ) : null}
          {hasSeo ? (
            <TabsContent
              value="seo"
              forceMount
              hidden={activeTab !== "seo"}
              className="w-full"
            >
              <ContentTypeEdit
                defaultData={draft.current}
                ref={seoRef}
                contentType={seo}
                id={contentType.name}
                hideTitle
              />
            </TabsContent>
          ) : null}
          {[...routeLayoutModules]
            .sort((a, b) => a.order - b.order)
            .map((layoutModule) => {
              const defaultOption = layoutModule.moduleId
                ? ((
                    layoutOptionsByContentType.get(layoutModule.contentType) ??
                    []
                  ).find((option) => option.value === layoutModule.moduleId)
                    ?.label ?? layoutModule.moduleId)
                : "No module";

              return (
                <TabsContent
                  key={layoutModule._id}
                  value={`layout:${layoutModule._id}`}
                  forceMount
                  hidden={activeTab !== `layout:${layoutModule._id}`}
                  className="w-full"
                >
                  <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {layoutModule.key}
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        Default from route: {defaultOption}. Override only for
                        this entry.
                      </p>
                    </div>
                    <Select
                      value={
                        selectedLayoutOverrides[layoutModule._id] ??
                        "__default__"
                      }
                      onValueChange={(value) =>
                        setSelectedLayoutOverrides((current) => ({
                          ...current,
                          [layoutModule._id]: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">
                          Use route default
                        </SelectItem>
                        <SelectItem value="__none__">No module</SelectItem>
                        {(
                          layoutOptionsByContentType.get(
                            layoutModule.contentType,
                          ) ?? []
                        ).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      className="w-fit"
                      loading={
                        createOverrideMutation.isPending ||
                        updateOverrideMutation.isPending ||
                        deleteOverrideMutation.isPending
                      }
                      onClick={() => void saveLayoutOverride(layoutModule)}
                    >
                      Save override
                    </Button>
                  </div>
                </TabsContent>
              );
            })}
          {hasIterables ? (
            <TabsContent value="versions">Comming soon</TabsContent>
          ) : null}
        </Tabs>
      </div>
    </>
  );
};

export default EditPage;
