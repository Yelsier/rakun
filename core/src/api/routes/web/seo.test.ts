import { describe, expect, it } from "bun:test";

import { pageOutput } from "../../../schemas/web/page";
import { resolveSeo } from "./seo";

const image = {
  url: "https://example.com/social.jpg",
  previewUrl: null,
  name: "social.jpg",
  title: "Social image",
  alt: "Social alt",
  mime: "image/jpeg",
  width: 1200,
  height: 630,
  size: 1024,
  orientation: "landscape" as const,
};

const seo = (value: Record<string, unknown>) => ({
  _id: value._id ?? "seo-id",
  _type: "Seo",
  ...value,
});

describe("resolveSeo", () => {
  it("merges defaults, applies page title template and derives canonical URL", () => {
    const result = resolveSeo({
      pageSeo: seo({
        _id: "page-seo",
        title: "Home",
      }),
      defaultSeo: seo({
        _id: "default-seo",
        title: "Default title",
        description: "Default description",
        image,
      }),
      settings: {
        siteName: "Example",
        siteUrl: "https://example.com",
        titleTemplate: "%s | Example",
      },
      alternatePaths: {
        en: "/home/",
        es: "/es/inicio/",
      },
      path: "/home/",
    });

    expect(result?.title).toBe("Home | Example");
    expect(result?.description).toBe("Default description");
    expect(result?.canonicalUrl).toBe("https://example.com/home/");
    expect(result?.alternates).toEqual({
      en: "https://example.com/home/",
      es: "https://example.com/es/inicio/",
    });
    expect(result?.openGraphTitle).toBe("Home | Example");
    expect(result?.openGraphSiteName).toBe("Example");
    expect(result?.twitterCard).toBe("summary_large_image");
  });

  it("keeps default title untemplated when page title is missing", () => {
    const result = resolveSeo({
      pageSeo: seo({
        _id: "page-seo",
      }),
      defaultSeo: seo({
        _id: "default-seo",
        title: "Default title",
      }),
      settings: {
        titleTemplate: "%s | Example",
      },
      path: "/",
    });

    expect(result?.title).toBe("Default title");
  });

  it("lets page values override default social values", () => {
    const result = resolveSeo({
      pageSeo: seo({
        _id: "page-seo",
        title: "Home",
        canonicalUrl: "https://example.com/custom/",
        noIndex: true,
        customOpenGraph: true,
        openGraphTitle: "OG Home",
        customTwitter: true,
        twitterTitle: "Twitter Home",
        twitterCard: "summary",
      }),
      defaultSeo: seo({
        _id: "default-seo",
        title: "Default title",
        canonicalUrl: "https://example.com/default/",
        customOpenGraph: true,
        openGraphTitle: "OG Default",
        customTwitter: true,
        twitterTitle: "Twitter Default",
      }),
      settings: {
        siteUrl: "https://example.com",
        twitterSite: "@example",
      },
      path: "/home/",
    });

    expect(result?.canonicalUrl).toBe("https://example.com/custom/");
    expect(result?.noIndex).toBe(true);
    expect(result?.openGraphTitle).toBe("OG Home");
    expect(result?.twitterTitle).toBe("Twitter Home");
    expect(result?.twitterCard).toBe("summary");
    expect(result?.twitterSite).toBe("@example");
  });

  it("matches the web page output schema", () => {
    const result = resolveSeo({
      pageSeo: seo({
        _id: "page-seo",
        title: "Home",
        description: "Page description",
        image,
      }),
      alternatePaths: {
        en: "/",
      },
      settings: {
        siteName: "Example",
        siteUrl: "https://example.com",
      },
      path: "/",
    });

    expect(() =>
      pageOutput.parse({
        renderMode: "static",
        modules: [],
        seo: result,
      }),
    ).not.toThrow();
  });
});
