import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetMongoService } = vi.hoisted(() => ({
  mockGetMongoService: vi.fn(),
}));

vi.mock("../../mongo", () => ({
  getMongoService: mockGetMongoService,
}));

import { resolveRedirect } from "./resolveRedirect";
import { Redirect } from "../../../internal-content-types";
import { DBOutput } from "../../../lib/types";

type RedirectRow = DBOutput<typeof Redirect>;

const makeRedirect = (overrides: Partial<RedirectRow> = {}): RedirectRow => {
  return {
    _id: "redirect-id",
    _type: "Redirect",
    name: "test redirect",
    enabled: true,
    sourcePath: "/from/{slug}",
    destinationPath: "/to/{slug}",
    statusMode: "302",
    customStatus: 302,
    preserveQuery: false,
    headerName: "",
    headerMatchMode: "none",
    headerValue: "",
    functionName: "none",
    functionConfig: "",
    ...overrides,
  } as RedirectRow;
};

const setRedirects = (redirects: RedirectRow[]) => {
  const list = vi.fn().mockResolvedValue({ items: redirects });
  mockGetMongoService.mockResolvedValue({ list });
};

describe("resolveRedirect", () => {
  beforeEach(() => {
    mockGetMongoService.mockReset();
  });

  it("resolves path tokens and decodes params from the source path", async () => {
    setRedirects([makeRedirect()]);

    const result = await resolveRedirect({ path: "/from/hello%20world" });

    expect(result).toEqual({
      to: "/to/hello world/",
      status: 302,
    });
  });

  it("falls back to raw path segment when decoding malformed URI components", async () => {
    setRedirects([makeRedirect()]);

    const result = await resolveRedirect({ path: "/from/bad%ZZvalue" });

    expect(result).toEqual({
      to: "/to/bad%ZZvalue/",
      status: 302,
    });
  });

  it("matches headers with equals/contains/startsWith/regex and ignores invalid regex", async () => {
    setRedirects([
      makeRedirect({
        name: "equals",
        sourcePath: "/equals",
        destinationPath: "/dest-equals",
        headerName: "x-env",
        headerMatchMode: "equals",
        headerValue: "production",
      }),
      makeRedirect({
        name: "contains",
        sourcePath: "/contains",
        destinationPath: "/dest-contains",
        headerName: "x-user-agent",
        headerMatchMode: "contains",
        headerValue: "bot",
      }),
      makeRedirect({
        name: "startsWith",
        sourcePath: "/starts",
        destinationPath: "/dest-starts",
        headerName: "x-prefix",
        headerMatchMode: "startsWith",
        headerValue: "abc",
      }),
      makeRedirect({
        name: "invalid regex",
        sourcePath: "/regex",
        destinationPath: "/dest-invalid",
        headerName: "x-id",
        headerMatchMode: "regex",
        headerValue: "[",
      }),
      makeRedirect({
        name: "valid regex",
        sourcePath: "/regex",
        destinationPath: "/dest-valid",
        headerName: "x-id",
        headerMatchMode: "regex",
        headerValue: "^id-[0-9]+$",
      }),
    ]);

    await expect(
      resolveRedirect({
        path: "/equals",
        headers: { "X-ENV": "production" },
      }),
    ).resolves.toEqual({ to: "/dest-equals/", status: 302 });

    await expect(
      resolveRedirect({
        path: "/contains",
        headers: { "x-user-agent": "my-bot-v2" },
      }),
    ).resolves.toEqual({ to: "/dest-contains/", status: 302 });

    await expect(
      resolveRedirect({
        path: "/starts",
        headers: { "x-prefix": "abcdef" },
      }),
    ).resolves.toEqual({ to: "/dest-starts/", status: 302 });

    await expect(
      resolveRedirect({
        path: "/regex",
        headers: { "x-id": "id-42" },
      }),
    ).resolves.toEqual({ to: "/dest-valid/", status: 302 });
  });

  it("rejects unsafe regex patterns and continues to next matching redirect", async () => {
    setRedirects([
      makeRedirect({
        sourcePath: "/safe-check",
        destinationPath: "/blocked-regex",
        headerName: "x-id",
        headerMatchMode: "regex",
        headerValue: "^(a+)+$",
      }),
      makeRedirect({
        sourcePath: "/safe-check",
        destinationPath: "/fallback",
        headerMatchMode: "none",
      }),
    ]);

    await expect(
      resolveRedirect({
        path: "/safe-check",
        headers: { "x-id": "aaaaaaaaaaaaaaaaaaaa!" },
      }),
    ).resolves.toEqual({ to: "/fallback/", status: 302 });
  });

  it("preserves query string only when preserveQuery is true", async () => {
    setRedirects([
      makeRedirect({
        sourcePath: "/keep",
        destinationPath: "/new-path",
        preserveQuery: true,
      }),
      makeRedirect({
        sourcePath: "/drop",
        destinationPath: "/new-path",
        preserveQuery: false,
      }),
    ]);

    await expect(
      resolveRedirect({ path: "/keep", search: "foo=1&bar=2" }),
    ).resolves.toEqual({
      to: "/new-path/?foo=1&bar=2",
      status: 302,
    });

    await expect(
      resolveRedirect({ path: "/drop", search: "?foo=1&bar=2" }),
    ).resolves.toEqual({
      to: "/new-path/",
      status: 302,
    });
  });

  it("applies acceptLanguageToParam function config", async () => {
    setRedirects([
      makeRedirect({
        sourcePath: "/home",
        destinationPath: "/{lang}/home",
        functionName: "acceptLanguageToParam",
        functionConfig: JSON.stringify({
          param: "lang",
          supported: ["en", "es"],
          fallback: "en",
        }),
      }),
    ]);

    const result = await resolveRedirect({
      path: "/home",
      headers: { "accept-language": "es-ES,es;q=0.9,en;q=0.8" },
    });

    expect(result).toEqual({
      to: "/es/home/",
      status: 302,
    });
  });

  it("applies headerValueToParam function mapping and fallback behavior", async () => {
    setRedirects([
      makeRedirect({
        sourcePath: "/site",
        destinationPath: "/site/{segment}",
        functionName: "headerValueToParam",
        functionConfig: JSON.stringify({
          header: "x-device",
          param: "segment",
          map: { mobile: "m", desktop: "d" },
          fallback: "d",
          lowercase: true,
        }),
      }),
    ]);

    await expect(
      resolveRedirect({
        path: "/site",
        headers: { "x-device": "MOBILE" },
      }),
    ).resolves.toEqual({
      to: "/site/m/",
      status: 302,
    });

    await expect(
      resolveRedirect({
        path: "/site",
        headers: {},
      }),
    ).resolves.toEqual({
      to: "/site/d/",
      status: 302,
    });
  });

  it("skips redirects when a function returns null and continues matching", async () => {
    setRedirects([
      makeRedirect({
        sourcePath: "/with-function",
        destinationPath: "/never-used",
        functionName: "headerValueToParam",
        functionConfig: JSON.stringify({
          header: "x-segment",
          param: "segment",
        }),
      }),
      makeRedirect({
        sourcePath: "/with-function",
        destinationPath: "/fallback-destination",
        functionName: "none",
      }),
    ]);

    const result = await resolveRedirect({
      path: "/with-function",
      headers: {},
    });

    expect(result).toEqual({
      to: "/fallback-destination/",
      status: 302,
    });
  });
});
