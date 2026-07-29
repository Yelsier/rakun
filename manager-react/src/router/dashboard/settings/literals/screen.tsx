"use client";

import type { ListLiteralsOutput } from "@rakun-kit/core/client";
import { AlertTriangle, Info, Save } from "lucide-react";
import { useEffect, useMemo, startTransition, useState } from "react";
import { toast } from "sonner";

import { useManagerMutation, useManagerQuery } from "@/client/react";
import { formatList } from "@/helpers/format-list";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import UnauthorizedMessage from "@/components/unauthorized";
import { useTranslations } from '@/i18n'
import { useSession } from "@/state/session";

const placeholderHint = (name: string, kind: string) => {
  if (kind === "plural") {
    return `{${name}, plural, =0 {...} one {...} other {...}}`;
  }
  if (kind === "select") {
    return `{${name}, select, option {...} other {...}}`;
  }
  if (kind === "selectordinal") {
    return `{${name}, selectordinal, one {...} two {...} few {...} other {...}}`;
  }
  return `{${name}}`;
};

const getPluralCategory = (locale: string, value: number) =>
  new Intl.PluralRules(locale).select(value);

const getLiteralNamespace = (key: string) => key.split(".")[0] || key;

const getLiteralDisplayKey = (key: string) => {
  const firstDot = key.indexOf(".");
  if (firstDot === -1) return key;
  return key.slice(firstDot + 1);
};

const renderIcuPreview = ({
  message,
  locale,
  values,
}: {
  message: string;
  locale: string;
  values: Record<string, string>;
}) => {
  const resolveComplex = message.replace(
    /\{(\w+),\s*(plural|select|selectordinal),\s*((?:[^{}]|\{[^{}]*\})*)\}/g,
    (_full, varName: string, kind: string, rawOptions: string) => {
      const options = new Map<string, string>();
      const optionRegex =
        /(=\d+|zero|one|two|few|many|other|\w+)\s*\{([^}]*)\}/g;

      for (const match of rawOptions.matchAll(optionRegex)) {
        if (match[1] && match[2]) {
          options.set(match[1], match[2]);
        }
      }

      const rawValue = values[varName] ?? "";
      if (kind === "select") {
        return options.get(rawValue) ?? options.get("other") ?? "";
      }

      const numeric = Number(rawValue || 0);
      const exactKey = `=${numeric}`;
      const category = getPluralCategory(locale, numeric);
      const selected =
        options.get(exactKey) ??
        options.get(category) ??
        options.get("other") ??
        "";

      return selected.replace(/#/g, String(numeric));
    },
  );

  return resolveComplex.replace(/\{(\w+)\}/g, (_full, varName: string) => {
    return values[varName] ?? `{${varName}}`;
  });
};

export const ManagerSettingsLiteralsScreen = () => {
  const t = useTranslations()
  const [locale, setLocale] = useState("");
  const [selectedNamespace, setSelectedNamespace] = useState("");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [previewValues, setPreviewValues] = useState<Record<string, string>>(
    {},
  );
  const { hasPermissions } = useSession();
  const listQuery = useManagerQuery({
    name: "manager.literals.list",
    input: locale ? { locale } : {},
  });
  const upsertMutation = useManagerMutation("manager.literals.upsert");

  useEffect(() => {
    if (!listQuery.data) return;
    if (!locale) {
      setLocale(listQuery.data.selectedLocale);
      return;
    }

    const localeExists = listQuery.data.locales.some(
      (language) => language.code === locale,
    );
    if (!localeExists) {
      setLocale(listQuery.data.selectedLocale);
    }
  }, [listQuery.data, locale]);

  const namespaces = useMemo(() => {
    if (!listQuery.data) return [];
    return Array.from(
      new Set(
        listQuery.data.items.map((item) => getLiteralNamespace(item.key)),
      ),
    );
  }, [listQuery.data]);

  useEffect(() => {
    if (namespaces.length === 0) return;
    if (!selectedNamespace || !namespaces.includes(selectedNamespace)) {
      const firstNamespace = namespaces[0];
      if (firstNamespace) {
        setSelectedNamespace(firstNamespace);
      }
    }
  }, [namespaces, selectedNamespace]);

  const filteredItems = useMemo(() => {
    if (!listQuery.data) return [];
    const value = search.trim().toLowerCase();
    const namespaceFiltered = selectedNamespace
      ? listQuery.data.items.filter(
          (item) => getLiteralNamespace(item.key) === selectedNamespace,
        )
      : listQuery.data.items;

    if (!value) return namespaceFiltered;

    return namespaceFiltered.filter((item) => {
      const displayKey = getLiteralDisplayKey(item.key).toLowerCase();
      return (
        item.key.toLowerCase().includes(value) ||
        displayKey.includes(value) ||
        item.description.toLowerCase().includes(value) ||
        item.usedBy.some((usage) => usage.toLowerCase().includes(value))
      );
    });
  }, [listQuery.data, search, selectedNamespace]);

  useEffect(() => {
    if (filteredItems.length === 0) return;
    if (!filteredItems.some((item) => item.key === selectedKey)) {
      const firstItem = filteredItems[0];
      if (firstItem) {
        setSelectedKey(firstItem.key);
      }
    }
  }, [filteredItems, selectedKey]);

  const selectedLiteral = useMemo(
    () => filteredItems.find((item) => item.key === selectedKey) || null,
    [filteredItems, selectedKey],
  );

  useEffect(() => {
    if (!selectedLiteral) return;
    setMessageDraft(
      selectedLiteral.translation || selectedLiteral.defaultMessage,
    );
    setPreviewValues(
      Object.fromEntries(
        selectedLiteral.variables.map((variable) => [
          variable.name,
          variable.kind === "plural" || variable.kind === "selectordinal"
            ? "1"
            : variable.kind === "select"
              ? "other"
              : "example",
        ]),
      ),
    );
  }, [selectedLiteral]);

  if (!hasPermissions(["content.LiteralTranslation.readAny"])) {
    return (
      <UnauthorizedMessage neededPermission={["content.LiteralTranslation.readAny"]} />
    );
  }

  if (listQuery.isLoading || !listQuery.data || !locale) {
    return (
      <div className="container mx-auto grid gap-4 px-4 py-10">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const data = listQuery.data as ListLiteralsOutput;
  const hasDraftChanges =
    !!selectedLiteral &&
    messageDraft !==
      (selectedLiteral.translation || selectedLiteral.defaultMessage);

  const onSave = async () => {
    if (!selectedLiteral) return;

    try {
      await upsertMutation.mutateAsync({
        key: selectedLiteral.key,
        locale,
        message: messageDraft,
      });
      toast.success(t('settings.literals.translationSaved'));
      await listQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('settings.literals.saveError'),
      );
    }
  };

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 py-10">
      <Card data-tour="literals-toolbar">
        <CardHeader>
          <CardTitle>{t('settings.literals')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">{t('common.locale')}</label>
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder={t('settings.literals.selectLocale')} />
            </SelectTrigger>
            <SelectContent>
              {data.locales.map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  {t('settings.literals.localeWithCode', {
                    name: language.name,
                    code: language.code,
                  })}
                  {language.default ? " • default" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SearchInput
            placeholder={t('settings.literals.search')}
            value={search}
            onChange={(event) => {
              const nextValue = event.target.value
              startTransition(() => {
                setSearch(nextValue)
              })
            }}
            className="max-w-sm"
          />
          <Badge variant="outline">{t('settings.literals.defaultLocale')} {data.defaultLocale}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="text-base">
              {t('settings.literals.namespaces')}
            </CardTitle>
          </CardHeader>
        <CardContent>
          <Tabs value={selectedNamespace} onValueChange={setSelectedNamespace}>
            <TabsList className="bg-card w-full flex-wrap justify-start gap-2">
              {namespaces.map((namespace) => (
                <TabsTrigger
                  key={namespace}
                  value={namespace}
                  className="flex-none"
                >
                  {namespace}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div
        className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]"
        data-tour="literals-list"
      >
        <Card className="max-h-[70vh] overflow-auto">
          <CardHeader>
            <CardTitle className="text-base">
              {t('settings.literals.keysCount', { count: filteredItems.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredItems.map((item) => {
              const isSelected = item.key === selectedKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`w-full rounded-md border p-3 text-left transition ${
                    isSelected
                      ? "border-primary bg-accent/30"
                      : "hover:bg-accent/20"
                  }`}
                  onClick={() => setSelectedKey(item.key)}
                >
                  <p className="font-mono text-xs">
                    {getLiteralDisplayKey(item.key)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                    {item.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.hasTranslation ? (
                      <Badge variant="secondary">{t('settings.literals.translated')}</Badge>
                    ) : (
                      <Badge variant="outline">{t('settings.literals.fallback')}</Badge>
                    )}
                    {!item.validation.isValid ? (
                      <Badge variant="destructive">{t('settings.literals.invalidIcu')}</Badge>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">
              {selectedLiteral ? getLiteralDisplayKey(selectedLiteral.key) : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedLiteral ? (
              <p className="text-muted-foreground text-sm">
                {t('settings.literals.selectKey')}
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('fields.description')}</p>
                  <p className="text-muted-foreground text-sm">
                    {selectedLiteral.description}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {t('settings.literals.usedBy')}
                    <Info className="size-4 text-muted-foreground" />
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedLiteral.usedBy.length > 0 ? (
                      selectedLiteral.usedBy.map((usage) => (
                        <Badge key={usage} variant="outline">
                          {usage}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {t('settings.literals.noUsage')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('settings.literals.availableVars')}</p>
                  {selectedLiteral.variables.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedLiteral.variables.map((variable) => (
                        <Button
                          key={variable.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMessageDraft(
                              (prev) =>
                                `${prev}${
                                  prev.endsWith(" ") || prev.length === 0
                                    ? ""
                                    : " "
                                }${placeholderHint(
                                  variable.name,
                                  variable.kind,
                                )}`,
                            );
                          }}
                        >
                          {t('settings.literals.varWithKind', {
                            name: variable.name,
                            kind: variable.kind,
                          })}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {t('settings.literals.noVariables')}
                    </p>
                  )}
                </div>

                {!selectedLiteral.validation.isValid ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                    <p className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="size-4" />
                      {t('settings.literals.icuIssues')}
                    </p>
                    {selectedLiteral.validation.missing.length > 0 ? (
                      <p className="mt-1">
                        {t('settings.literals.missing')}{" "}
                        {formatList(selectedLiteral.validation.missing, locale)}
                      </p>
                    ) : null}
                    {selectedLiteral.validation.kindMismatch.length > 0 ? (
                      <p className="mt-1">
                        {t('settings.literals.kindMismatch')}{" "}
                        {formatList(
                          selectedLiteral.validation.kindMismatch,
                          locale,
                        )}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('settings.literals.defaultMessage')}</p>
                  <Textarea
                    value={selectedLiteral.defaultMessage}
                    readOnly
                    className="min-h-20 font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('settings.literals.translation')}</p>
                  <Textarea
                    disabled={!hasPermissions(["content.LiteralTranslation.updateAny"])}
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    className="min-h-28 font-mono text-xs"
                  />
                  {!hasPermissions(["content.LiteralTranslation.updateAny"]) ? (
                    <p className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Info className="size-4" />
                      {t('settings.literals.noPermission')}
                    </p>
                  ) : null}
                </div>

                {selectedLiteral.variables.length > 0 ? (
                  <div className="space-y-3 rounded-md border p-3">
                    <p className="text-sm font-medium">{t('common.preview')}</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {selectedLiteral.variables.map((variable) => (
                        <div
                          key={`preview-${variable.name}`}
                          className="space-y-1"
                        >
                          <p className="font-mono text-xs">
                            {t('settings.literals.varWithKind', {
                              name: variable.name,
                              kind: variable.kind,
                            })}
                          </p>
                          <Input
                            value={previewValues[variable.name] ?? ""}
                            onChange={(event) =>
                              setPreviewValues((prev) => ({
                                ...prev,
                                [variable.name]: event.target.value,
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 font-mono text-xs">
                      {renderIcuPreview({
                        message: messageDraft,
                        locale,
                        values: previewValues,
                      })}
                    </div>
                  </div>
                ) : null}

                {hasPermissions(["content.LiteralTranslation.updateAny"]) ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setMessageDraft(
                          selectedLiteral.translation ||
                            selectedLiteral.defaultMessage,
                        )
                      }
                      disabled={!hasDraftChanges}
                    >
                      {t('common.reset')}
                    </Button>
                    <Button
                      onClick={() => void onSave()}
                      loading={upsertMutation.isPending}
                      disabled={!hasDraftChanges || upsertMutation.isPending}
                    >
                      <Save className="size-4" />
                      {t('settings.literals.saveTranslation')}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
