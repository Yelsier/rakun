"use client";

import type { MaybeTranslatableValue } from "@rakun-kit/core/client";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { columns, type ManagerRouteRecord } from "./columns";
import { EditRoute } from "./edit";

import {
  createManagerQueryOptions,
  useManagerClient,
  useManagerMutation,
  useManagerQuery,
} from "@/client/react";
import { ManagerLink } from "@/link";
import Loading from "@/components/loading";
import { PaginationController } from "@/components/PaginationController";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/state/language";
import { translateLayoutModuleLabel, useTranslations } from '@/i18n'
import { useSession } from "@/state/session";

type PageOption = {
  _id: string;
  title?: MaybeTranslatableValue<string>;
  slug?: MaybeTranslatableValue<string>;
};

type RouteSettingsRecord = {
  _id?: string;
  homePage?: { _id?: string } | null;
};

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

type ManagerContentTypeRecord = {
  name: string;
  listFields?: string[];
};

export const ManagerSettingsRoutesScreen = () => {
  const t = useTranslations()
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [edit, setEdit] = useState<ManagerRouteRecord | null>(null);
  const [layoutModulesRoute, setLayoutModulesRoute] =
    useState<ManagerRouteRecord | null>(null);
  const [selectedHomePageId, setSelectedHomePageId] = useState("__none__");
  const [selectedLayoutModules, setSelectedLayoutModules] = useState<
    Record<string, string>
  >({});
  const managerClient = useManagerClient();
  const routeListQuery = useManagerQuery({
    name: "manager.list",
    input: {
      contentType: "Route",
      query: { options: { limit: itemsPerPage, page } },
    },
  });
  const routeSettingsQuery = useManagerQuery({
    name: "manager.list",
    input: {
      contentType: "RouteSettings",
      query: { options: { limit: "all", fields: ["key", "homePage"] } },
    },
  });
  const pagesQuery = useManagerQuery({
    name: "manager.list",
    input: {
      contentType: "Page",
      query: { options: { limit: "all", fields: ["title", "slug"] } },
    },
  });
  const routeLayoutModulesQuery = useManagerQuery({
    name: "manager.list",
    input: {
      contentType: "RouteLayoutModule",
      query: {
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
  });
  const contentTypesQuery = useManagerQuery({
    name: "manager.contentTypes",
    input: undefined as never,
  });
  const createMutation = useManagerMutation("manager.create");
  const updateMutation = useManagerMutation("manager.update");
  const { hasPermissions } = useSession();
  const { getTranslation } = useLanguage();

  const routeSettings = (routeSettingsQuery.data?.items?.[0] ??
    null) as RouteSettingsRecord | null;
  const pages = (pagesQuery.data?.items ?? []) as PageOption[];
  const routeLayoutModules = (routeLayoutModulesQuery.data?.items ??
    []) as RouteLayoutModuleRecord[];
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
  const layoutModulesForRoute = layoutModulesRoute
    ? [...routeLayoutModules]
        .filter((layoutModule) => layoutModule.routeId === layoutModulesRoute._id)
        .sort((a, b) => a.order - b.order)
    : [];
  const layoutModuleRouteIds = new Set(
    routeLayoutModules.map((layoutModule) => layoutModule.routeId),
  );

  useEffect(() => {
    setSelectedHomePageId(routeSettings?.homePage?._id ?? "__none__");
  }, [routeSettings?.homePage?._id]);

  useEffect(() => {
    setSelectedLayoutModules(
      Object.fromEntries(
        routeLayoutModules.map((item) => [
          item._id,
          item.moduleId && item.moduleId.length > 0
            ? item.moduleId
            : "__none__",
        ]),
      ),
    );
  }, [routeLayoutModulesQuery.data]);

  if (
    !routeListQuery.data ||
    !routeSettingsQuery.data ||
    !pagesQuery.data ||
    !routeLayoutModulesQuery.data ||
    !contentTypesQuery.data
  ) {
    return <Loading />;
  }

  const saveHomePage = async () => {
    const nextHomePage =
      selectedHomePageId === "__none__"
        ? null
        : {
            type: "existing" as const,
            _id: selectedHomePageId,
            contentType: "Page" as const,
          };

    const payload = {
      _type: "RouteSettings" as const,
      key: "default",
      homePage: nextHomePage,
    };

    try {
      if (routeSettings?._id) {
        await updateMutation.mutateAsync({
          contentType: "RouteSettings",
          id: routeSettings._id,
          data: payload,
        });
      } else {
        await createMutation.mutateAsync({
          contentType: "RouteSettings",
          data: payload,
        });
      }
      toast.success(t('settings.routes.homePageUpdated'));
      await routeSettingsQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('settings.routes.homePageUpdateError'),
      );
    }
  };

  const saveRouteLayoutModules = async (
    layoutModules: RouteLayoutModuleRecord[],
  ) => {
    try {
      await Promise.all(
        layoutModules.map((layoutModule) =>
          updateMutation.mutateAsync({
            contentType: "RouteLayoutModule",
            id: layoutModule._id,
            data: {
              _type: "RouteLayoutModule" as const,
              routeId: layoutModule.routeId,
              routeKey: layoutModule.routeKey,
              routeContentType: layoutModule.routeContentType,
              key: layoutModule.key,
              contentType: layoutModule.contentType,
              order: layoutModule.order,
              moduleId:
                selectedLayoutModules[layoutModule._id] === "__none__"
                  ? ""
                  : selectedLayoutModules[layoutModule._id],
            },
          }),
        ),
      );
      toast.success(t('settings.routes.layoutModulesUpdated'));
      await routeLayoutModulesQuery.refetch();
      setLayoutModulesRoute(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('settings.routes.layoutModulesUpdateError'),
      );
    }
  };

  return (
    <div className="container mx-auto flex flex-col items-start gap-6 px-4 py-10">
      <div className="flex w-full justify-end gap-2" data-tour="routes-create">
        <Button asChild variant="secondary">
          <ManagerLink href="/settings/routes/paths">{t('settings.routes.routePaths')}</ManagerLink>
        </Button>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('settings.routes.homePage')}</CardTitle>
          <CardDescription>
            {t('settings.routes.homePageDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="w-full space-y-2">
            <Select
              value={selectedHomePageId}
              onValueChange={setSelectedHomePageId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('settings.routes.selectPage')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('settings.routes.noHomePage')}</SelectItem>
                {pages.map((pageItem) => (
                  <SelectItem key={pageItem._id} value={pageItem._id}>
                    {getTranslation(pageItem.title) ||
                      getTranslation(pageItem.slug) ||
                      pageItem._id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => void saveHomePage()}
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {t('settings.routes.saveHomePage')}
          </Button>
        </CardContent>
      </Card>
      <Dialog
        open={Boolean(layoutModulesRoute)}
        onOpenChange={(open) => {
          if (!open) {
            setLayoutModulesRoute(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('settings.routes.editLayoutModules')}</DialogTitle>
            <DialogDescription>
              {t('settings.routes.layoutModulesDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
            {layoutModulesForRoute.map((layoutModule) => (
              <div
                key={layoutModule._id}
                className="flex flex-col gap-3 border-b pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {layoutModule.routeKey} / {layoutModule.key}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {translateLayoutModuleLabel(
                      t,
                      layoutModule.key,
                      layoutModule.contentType,
                    )}
                  </div>
                </div>
                <Select
                  value={selectedLayoutModules[layoutModule._id] ?? "__none__"}
                  onValueChange={(value) =>
                    setSelectedLayoutModules((current) => ({
                      ...current,
                      [layoutModule._id]: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder={t('contentEdit.selectModule')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('settings.routes.noModule')}</SelectItem>
                    {(
                      layoutOptionsByContentType.get(layoutModule.contentType) ??
                      []
                    ).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => void saveRouteLayoutModules(layoutModulesForRoute)}
              loading={updateMutation.isPending}
            >
              {t('settings.routes.saveLayoutModules')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EditRoute
        refetch={() => void routeListQuery.refetch()}
        setEdit={setEdit}
        defaultValues={edit}
      />
      <div className="w-full" data-tour="routes-table">
        <DataTable
          columns={columns({
            getTranslation,
            setEdit,
            hasPermissions,
            canEditLayoutModules: (route) => layoutModuleRouteIds.has(route._id),
            onEditLayoutModules: setLayoutModulesRoute,
            t,
          })}
          data={routeListQuery.data.items as ManagerRouteRecord[]}
        />
      </div>
      <PaginationController
        page={page}
        setPage={setPage}
        totalItems={routeListQuery.data.totalItems}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
      />
    </div>
  );
};
