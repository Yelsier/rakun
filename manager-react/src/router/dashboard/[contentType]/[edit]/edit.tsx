"use client";

import { cva } from "class-variance-authority";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { EncodedContentType } from "@rakun-kit/core/client";
import { Seo } from "@rakun-kit/core/internal-content-types";
import {
  Eye,
  GitBranch,
  Globe,
  LayoutPanelTop,
  NotepadText,
  RotateCcw,
  ScrollText,
} from "lucide-react";
import { EncodedField } from "@rakun-kit/core/client";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

type LayoutModuleOption = {
  value: string;
  label: string;
};

type DocumentVisibility = "draft" | "hidden" | "published";

type VersionRecord = {
  _id: string;
  revision: number;
  operation: "create" | "update" | "delete" | "restore";
  actorId?: string;
  actorLabel?: string;
  changedAt: string | Date;
  diff: VersionDiffEntry[];
};

type VersionDiffEntry = { path: string; before: unknown; after: unknown };

const getLayoutOverrideValue = (override?: RouteLayoutModuleOverrideRecord) => {
  if (!override) return "__default__";
  return override.moduleId && override.moduleId.length > 0
    ? override.moduleId
    : "__none__";
};

const RouteLayoutModuleTabContent = ({
  layoutModule,
  override,
  options,
  activeTab,
  contentTypeId,
  overridesByKey,
  routeLayoutOverridesQuery,
}: {
  layoutModule: RouteLayoutModuleRecord;
  override?: RouteLayoutModuleOverrideRecord;
  options: LayoutModuleOption[];
  activeTab: string;
  contentTypeId?: string;
  overridesByKey: Map<string, RouteLayoutModuleOverrideRecord>;
  routeLayoutOverridesQuery: ReturnType<typeof useManagerQuery<"manager.list">>;
}) => {
  const [selected, setSelected] = useState(() =>
    getLayoutOverrideValue(override),
  );

  useEffect(() => {
    setSelected(getLayoutOverrideValue(override));
  }, [override]);

  const createOverrideMutation = useManagerMutation("manager.create");
  const updateOverrideMutation = useManagerMutation("manager.update");
  const deleteOverrideMutation = useManagerMutation("manager.delete");

  const [isSaving, setIsSaving] = useState(false);

  const saveLayoutOverride = async (
    layoutModule: RouteLayoutModuleRecord,
    selected: string,
  ) => {
    if (!contentTypeId) return;

    setIsSaving(true);

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
      setIsSaving(false);
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
    setIsSaving(false);
  };

  const defaultOption = layoutModule.moduleId
    ? (options.find((option) => option.value === layoutModule.moduleId)
        ?.label ?? layoutModule.moduleId)
    : "No module";

  return (
    <TabsContent
      value={`layout:${layoutModule._id}`}
      forceMount
      hidden={activeTab !== `layout:${layoutModule._id}`}
      className="w-full"
    >
      <div className="mx-auto flex w-full flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">{layoutModule.contentType}</h2>
          <p className="text-muted-foreground text-sm">
            Default from route: {defaultOption}. Override only for this entry.
          </p>
        </div>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Select module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">Use route default</SelectItem>
            <SelectItem value="__none__">No module</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="w-fit"
          loading={isSaving}
          onClick={() => saveLayoutOverride(layoutModule, selected)}
        >
          Save override
        </Button>
      </div>
    </TabsContent>
  );
};

const formatDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const isDiffRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const SYSTEM_DIFF_FIELDS = new Set([
  "_id",
  "_revision",
  "_schemaVersion",
  "_type",
  "createdAt",
  "createdBy",
  "revision",
  "updatedAt",
  "updatedBy",
]);

const isSystemDiffPath = (path: string) => {
  const segments = path.split(".");
  const lastSegment = segments[segments.length - 1] ?? path;
  return SYSTEM_DIFF_FIELDS.has(lastSegment);
};

const normalizeVersionDiffs = (diffs: VersionDiffEntry[]) =>
  diffs
    .flatMap((entry) => {
      if (
        entry.path !== "$" ||
        (!isDiffRecord(entry.before) && !isDiffRecord(entry.after))
      ) {
        return [entry];
      }

      const before = isDiffRecord(entry.before) ? entry.before : {};
      const after = isDiffRecord(entry.after) ? entry.after : {};
      const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

      return Array.from(keys).map((key) => ({
        path: key,
        before: before[key],
        after: after[key],
      }));
    })
    .filter((entry) => !isSystemDiffPath(entry.path));

const formatDiffPath = (path: string) =>
  path === "$"
    ? "Document"
    : path
        .replace(/\.(\d+)(?=\.|$)/g, "[$1]")
        .split(".")
        .join(" / ");

const stringifyDiffValue = (value: unknown) => {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

type TextDiffPart = {
  value: string;
  type: "equal" | "added" | "removed";
};

const tokenizeText = (value: string) => value.match(/\s+|[^\s]+/g) ?? [];

const getTextDiffParts = (before: string, after: string): TextDiffPart[] => {
  if (before === after) return [{ value: before, type: "equal" }];

  const left = tokenizeText(before);
  const right = tokenizeText(after);

  if (left.length * right.length > 6000) {
    return [
      ...(before ? [{ value: before, type: "removed" as const }] : []),
      ...(after ? [{ value: after, type: "added" as const }] : []),
    ];
  }

  const table = Array.from({ length: left.length + 1 }, () =>
    Array(right.length + 1).fill(0),
  ) as number[][];

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        left[i] === right[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const parts: TextDiffPart[] = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      parts.push({ value: left[i], type: "equal" });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      parts.push({ value: left[i], type: "removed" });
      i += 1;
    } else {
      parts.push({ value: right[j], type: "added" });
      j += 1;
    }
  }

  while (i < left.length) {
    parts.push({ value: left[i], type: "removed" });
    i += 1;
  }

  while (j < right.length) {
    parts.push({ value: right[j], type: "added" });
    j += 1;
  }

  return parts;
};

const DiffText = ({ before, after }: { before: unknown; after: unknown }) => {
  const beforeText = stringifyDiffValue(before);
  const afterText = stringifyDiffValue(after);
  const parts = getTextDiffParts(beforeText, afterText);

  if (!beforeText && !afterText) {
    return <span className="text-muted-foreground">Empty</span>;
  }

  return (
    <div className="text-sm leading-7 whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.type === "removed") {
          return (
            <span
              key={`${part.type}:${index}`}
              className="rounded-sm bg-red-500/15 px-0.5 text-red-700 line-through decoration-red-700 dark:text-red-300"
            >
              {part.value}
            </span>
          );
        }

        if (part.type === "added") {
          return (
            <span
              key={`${part.type}:${index}`}
              className="rounded-sm bg-emerald-500/15 px-0.5 text-emerald-700 underline decoration-emerald-600 underline-offset-2 dark:text-emerald-300"
            >
              {part.value}
            </span>
          );
        }

        return <span key={`${part.type}:${index}`}>{part.value}</span>;
      })}
    </div>
  );
};

const DiffBlock = ({ entry }: { entry: VersionDiffEntry }) => {
  const beforeText = stringifyDiffValue(entry.before);
  const afterText = stringifyDiffValue(entry.after);
  const isSimpleText =
    typeof entry.before === "string" || typeof entry.after === "string";

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <span className="min-w-0 truncate font-mono text-xs font-medium">
          {formatDiffPath(entry.path)}
        </span>
      </div>
      <div className="px-3 py-3">
        {isSimpleText ? (
          <DiffText before={entry.before} after={entry.after} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0 rounded-md border border-red-500/20 bg-red-500/5 p-3">
              <div className="mb-2 text-xs font-medium text-red-700 dark:text-red-300">
                Removed
              </div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-red-900 line-through dark:text-red-200">
                {beforeText || "Empty"}
              </pre>
            </div>
            <div className="min-w-0 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="mb-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Added
              </div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-emerald-900 dark:text-emerald-200">
                {afterText || "Empty"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const VersionHistory = ({
  contentType,
  documentId,
  onRestored,
}: {
  contentType: string;
  documentId: string;
  onRestored?: () => Promise<unknown> | unknown;
}) => {
  const versionsQuery = useManagerQuery({
    name: "manager.versions.list",
    input: { contentType, documentId },
  });
  const restoreMutation = useManagerMutation("manager.versions.restore");

  const restoreVersion = async (versionId: string) => {
    await restoreMutation.mutateAsync({
      versionId,
      reason: "manager restore",
    });
    toast.success("Version restored successfully");
    await versionsQuery.refetch();
    await onRestored?.();
  };

  const versions = (versionsQuery.data ?? []) as VersionRecord[];

  if (versionsQuery.isLoading) {
    return <div className="text-muted-foreground text-sm">Loading...</div>;
  }

  if (versions.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        No versions recorded yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {versions.map((version) => {
        const visibleDiffs = normalizeVersionDiffs(version.diff);

        return (
          <Card key={version._id} className="rounded-lg py-4">
            <CardHeader className="flex-row items-center justify-between gap-4 px-4">
              <div className="flex min-w-0 flex-col gap-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  Revision {version.revision}
                  <Badge variant="outline">{version.operation}</Badge>
                  <Badge variant="secondary">
                    {visibleDiffs.length} field
                    {visibleDiffs.length === 1 ? "" : "s"}
                  </Badge>
                </CardTitle>
                <div className="text-muted-foreground text-xs">
                  {formatDateTime(version.changedAt)}
                  {version.actorLabel || version.actorId
                    ? ` by ${version.actorLabel ?? version.actorId}`
                    : ""}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                loading={restoreMutation.isPending}
                onClick={() => void restoreVersion(version._id)}
              >
                <RotateCcw />
                Restore
              </Button>
            </CardHeader>
            <CardContent className="px-4">
              {visibleDiffs.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {visibleDiffs.map((entry) => (
                    <DiffBlock
                      key={`${version._id}:${entry.path}`}
                      entry={entry}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  No content fields changed.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
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
  onAfterRestore?: () => Promise<unknown> | unknown;
}> = ({ contentType, defaultData, onAfterRestore }) => {
  const iterablesRef = useRef<FieldRef>(null);
  const nonIterablesRef = useRef<FieldRef>(null);
  const seoRef = useRef<FieldRef>(null);
  const navigation = useManagerNavigation();
  const draft = useRef(defaultData);
  const managerClient = useManagerClient();
  const createMutation = useManagerMutation("manager.create");
  const updateMutation = useManagerMutation("manager.update");
  const { getTranslation } = useLanguage();
  const contentTypeId = (defaultData as { _id?: string } | undefined)?._id;
  const hasVisibility = Boolean(contentType.documentVisibility);
  const hasVersioning = Boolean(contentType.versioning);
  const [visibility, setVisibility] = useState<DocumentVisibility>(
    ((defaultData as { _visibility?: DocumentVisibility } | undefined)
      ?._visibility ?? "published") as DocumentVisibility,
  );

  useEffect(() => {
    draft.current = defaultData;
    setVisibility(
      ((defaultData as { _visibility?: DocumentVisibility } | undefined)
        ?._visibility ?? "published") as DocumentVisibility,
    );
  }, [defaultData]);
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
      ...(hasVisibility ? { _visibility: visibility } : {}),
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
                      {layoutModule.contentType}
                    </TabsTrigger>
                  ))}
                {hasVersioning && contentTypeId ? (
                  <TabsTrigger value="versions">
                    <GitBranch />
                    Versions
                  </TabsTrigger>
                ) : null}
              </TabsList>
            </div>
            <div className="flex items-center gap-2">
              {hasVisibility ? (
                <Select
                  value={visibility}
                  onValueChange={(value) =>
                    setVisibility(value as DocumentVisibility)
                  }
                >
                  <SelectTrigger className="w-36">
                    <Eye />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
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
            .map((layoutModule) => (
              <RouteLayoutModuleTabContent
                routeLayoutOverridesQuery={routeLayoutOverridesQuery}
                key={layoutModule._id}
                layoutModule={layoutModule}
                override={overridesByKey.get(
                  `${layoutModule.routeId}:${layoutModule.key}`,
                )}
                options={
                  layoutOptionsByContentType.get(layoutModule.contentType) ?? []
                }
                activeTab={activeTab}
                contentTypeId={contentTypeId}
                overridesByKey={overridesByKey}
              />
            ))}
          {hasVersioning && contentTypeId ? (
            <TabsContent value="versions">
              <VersionHistory
                contentType={contentType.name}
                documentId={contentTypeId}
                onRestored={onAfterRestore}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </>
  );
};

export default EditPage;
