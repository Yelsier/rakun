import Script from 'next/script'
import type { PageOutput } from '@rakun-kit/core/contracts'

import {
  rakunPreviewInspectorMessageType,
  rakunPreviewModuleSelectMessageType,
  rakunPreviewMessageType,
  rakunPreviewReadyMessageType,
  rakunPreviewSeoAnalysisMessageType,
  rakunPreviewSeoAnalysisResultMessageType,
} from './web-preview'

const serializeScriptValue = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

const getSeoImageUrl = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('url' in value)) return ''

  return typeof value.url === 'string' ? value.url : ''
}

const createSeoAnalysisConfig = (seo: PageOutput['seo'], language: string | undefined) => ({
  url: seo?.canonicalUrl ?? '',
  title: seo?.title ?? '',
  description: seo?.description ?? '',
  canonical: seo?.canonicalUrl ?? '',
  siteUrl: seo?.siteUrl ?? '',
  robots: seo?.noIndex ? 'noindex' : '',
  language: language ?? '',
  openGraph: {
    title: seo?.openGraphTitle ?? '',
    description: seo?.openGraphDescription ?? '',
    image: getSeoImageUrl(seo?.openGraphImage),
    url: seo?.openGraphUrl ?? '',
    type: seo?.openGraphType ?? '',
  },
  twitter: {
    card: seo?.twitterCard ?? '',
    title: seo?.twitterTitle ?? '',
    description: seo?.twitterDescription ?? '',
    image: getSeoImageUrl(seo?.twitterImage),
  },
})

export const RakunPreviewBridge = ({
  language,
  seo,
  tokenParam,
}: {
  language?: string
  seo?: PageOutput['seo']
  tokenParam: string
}) => {
  const seoAnalysisConfig = createSeoAnalysisConfig(seo, language)
  const script = `
(() => {
  const bridgeKey = "__rakunPreviewBridgeInstalled";
  const navigationKey = "__rakunPreviewBridgeNavigatingTo";
  const updateMessageType = ${serializeScriptValue(rakunPreviewMessageType)};
  const readyMessageType = ${serializeScriptValue(rakunPreviewReadyMessageType)};
  const selectMessageType = ${serializeScriptValue(rakunPreviewModuleSelectMessageType)};
  const inspectorMessageType = ${serializeScriptValue(rakunPreviewInspectorMessageType)};
  const seoAnalysisMessageType = ${serializeScriptValue(rakunPreviewSeoAnalysisMessageType)};
  const seoAnalysisResultMessageType = ${serializeScriptValue(rakunPreviewSeoAnalysisResultMessageType)};
  const seoAnalysisConfig = ${serializeScriptValue(seoAnalysisConfig)};
  const defaultTokenParam = ${serializeScriptValue(tokenParam)};
  const getParentOrigin = () => {
    try {
      return document.referrer ? new URL(document.referrer).origin : window.location.origin;
    } catch {
      return window.location.origin;
    }
  };
  const parentOrigin = getParentOrigin();
  const postToParent = (message) => {
    window.parent?.postMessage(message, parentOrigin);
  };

  if (window[bridgeKey]) {
    postToParent({ type: readyMessageType });
    return;
  }

  window[bridgeKey] = true;

  const moduleSelector = "[data-rakun-module]";
  const inspectClassName = "rakun-preview-module-inspecting";
  const hoverClassName = "rakun-preview-module-hovering";
  let inspectEnabled = false;
  let activeModule = null;
  let activeOverlay = null;

  const installPreviewStyles = () => {
    if (document.getElementById("__rakunPreviewBridgeStyles")) return;

    const style = document.createElement("style");
    style.id = "__rakunPreviewBridgeStyles";
    style.textContent =
      "body." + inspectClassName + " [data-rakun-module] { cursor: pointer; }" +
      "body." + hoverClassName + " { cursor: pointer; }" +
      "body." + hoverClassName + " * { cursor: pointer !important; }" +
      ".__rakun-preview-module-outline {" +
      "position: fixed;" +
      "inset: 0 auto auto 0;" +
      "z-index: 2147483647;" +
      "pointer-events: none;" +
      "border: 2px solid rgba(42, 187, 103, 0.95);" +
      "background: rgba(42, 187, 103, 0.08);" +
      "box-shadow: 0 0 0 9999px rgba(20, 26, 31, 0.035), 0 0 0 4px rgba(42, 187, 103, 0.18);" +
      "border-radius: 6px;" +
      "transform: translate3d(-9999px, -9999px, 0);" +
      "transition: transform 120ms ease, width 120ms ease, height 120ms ease;" +
      "}";

    (document.head || document.documentElement).appendChild(style);
  };

  const getOverlay = () => {
    if (activeOverlay) return activeOverlay;
    if (!document.body) return null;

    activeOverlay = document.createElement("div");
    activeOverlay.className = "__rakun-preview-module-outline";
    activeOverlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(activeOverlay);

    return activeOverlay;
  };

  const isVisibleRect = (rect) => (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );

  const getModuleElements = (module) => {
    const index = module.dataset.rakunIndex;
    if (index === undefined) return [module];

    return Array.from(
      document.querySelectorAll(
        moduleSelector + '[data-rakun-index="' + index + '"]'
      )
    );
  };

  const getRects = (module) =>
    getModuleElements(module).flatMap((element) => {
      const ownRects = Array.from(element.getClientRects()).filter(isVisibleRect);

      if (ownRects.length) return ownRects;

      return Array.from(element.children).flatMap((child) =>
        Array.from(child.getClientRects()).filter(isVisibleRect)
      );
    });

  const getModuleRect = (module) => {
    const rects = getRects(module);

    if (!rects.length) return null;

    return rects.reduce(
      (acc, rect) => ({
        top: Math.min(acc.top, rect.top),
        right: Math.max(acc.right, rect.right),
        bottom: Math.max(acc.bottom, rect.bottom),
        left: Math.min(acc.left, rect.left),
      }),
      {
        top: rects[0].top,
        right: rects[0].right,
        bottom: rects[0].bottom,
        left: rects[0].left,
      }
    );
  };

  const hideOverlay = () => {
    activeModule = null;
    document.body?.classList.remove(hoverClassName);

    if (!activeOverlay) return;

    activeOverlay.style.transform = "translate3d(-9999px, -9999px, 0)";
    activeOverlay.style.width = "0px";
    activeOverlay.style.height = "0px";
  };

  const setInspectEnabled = (enabled) => {
    inspectEnabled = enabled === true;
    document.body?.classList.toggle(inspectClassName, inspectEnabled);

    if (!inspectEnabled) {
      hideOverlay();
    }
  };

  const showOverlay = (module) => {
    const rect = getModuleRect(module);
    const overlay = getOverlay();

    if (!rect || !overlay) {
      hideOverlay();
      return;
    }

    const left = Math.max(0, rect.left);
    const top = Math.max(0, rect.top);
    const right = Math.min(window.innerWidth, rect.right);
    const bottom = Math.min(window.innerHeight, rect.bottom);

    activeModule = module;
    document.body?.classList.add(hoverClassName);
    overlay.style.transform = "translate3d(" + left + "px, " + top + "px, 0)";
    overlay.style.width = Math.max(0, right - left) + "px";
    overlay.style.height = Math.max(0, bottom - top) + "px";
  };

  const getModuleTarget = (target) => {
    const element = target instanceof Element ? target : target?.parentElement;

    if (!element) return null;

    return element.closest(moduleSelector);
  };

  const readNumber = (value) => {
    if (value === undefined || value === "") return undefined;

    const number = Number(value);

    return Number.isFinite(number) ? number : undefined;
  };

  const buildSelectMessage = (module) => ({
    type: selectMessageType,
    entryType:
      module.dataset.rakunEntryType === "layout"
        ? "layout"
        : module.dataset.rakunEntryType === "template"
          ? "template"
          : "content",
    moduleId: module.dataset.rakunModuleId || "",
    moduleType: module.dataset.rakunModuleType || "",
    index: readNumber(module.dataset.rakunIndex) ?? 0,
    layoutIndex: readNumber(module.dataset.rakunLayoutIndex) ?? 0,
    layoutKey: module.dataset.rakunLayoutKey || undefined,
    moduleIndex: readNumber(module.dataset.rakunModuleIndex),
  });

  const handleModulePointerMove = (event) => {
    if (!inspectEnabled) {
      hideOverlay();
      return;
    }

    const module = getModuleTarget(event.target);

    if (!module) {
      hideOverlay();
      return;
    }

    if (module !== activeModule) {
      showOverlay(module);
      return;
    }

    showOverlay(module);
  };

  const handleModuleClick = (event) => {
    if (!inspectEnabled) return;

    const module = getModuleTarget(event.target);

    if (!module) return;

    event.preventDefault();
    event.stopPropagation();
    showOverlay(module);
    postToParent(buildSelectMessage(module));
  };

  const handleViewportChange = () => {
    if (inspectEnabled && activeModule) {
      showOverlay(activeModule);
    }
  };

  installPreviewStyles();
  document.addEventListener("mousemove", handleModulePointerMove, true);
  document.addEventListener("click", handleModuleClick, true);
  document.addEventListener("mouseleave", hideOverlay);
  window.addEventListener("scroll", handleViewportChange, true);
  window.addEventListener("resize", handleViewportChange);

  const isPreviewUpdateMessage = (value) => (
    value &&
    typeof value === "object" &&
    value.type === updateMessageType &&
    typeof value.path === "string" &&
    typeof value.token === "string"
  );

  const isPreviewInspectorMessage = (value) => (
    value &&
    typeof value === "object" &&
    value.type === inspectorMessageType &&
    typeof value.enabled === "boolean"
  );

  const isSeoAnalysisMessage = (value) => (
    value &&
    typeof value === "object" &&
    value.type === seoAnalysisMessageType &&
    typeof value.requestId === "number"
  );

  const getStructuredDataNodes = (value) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value["@graph"])) return value["@graph"];
    return [value];
  };

  const hasStructuredDataContext = (value) => {
    if (!value || typeof value !== "object" || !("@context" in value)) return false;

    const context = value["@context"];
    if (typeof context === "string") return Boolean(context.trim());
    if (Array.isArray(context)) return context.length > 0;
    return Boolean(context && typeof context === "object");
  };

  const getStructuredData = () =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
      (script) => {
        const raw = (script.textContent || "").trim();

        try {
          const value = JSON.parse(raw);
          const nodes = getStructuredDataNodes(value);
          const types = Array.from(
            new Set(
              nodes.flatMap((node) => {
                if (!node || typeof node !== "object") return [];
                const type = node["@type"];
                if (typeof type === "string") return [type];
                return Array.isArray(type)
                  ? type.filter((item) => typeof item === "string")
                  : [];
              })
            )
          );

          return {
            raw,
            valid: true,
            hasContext:
              hasStructuredDataContext(value) ||
              nodes.some((node) => hasStructuredDataContext(node)),
            types,
            error: "",
          };
        } catch (error) {
          return {
            raw,
            valid: false,
            hasContext: false,
            types: [],
            error: error instanceof Error ? error.message : "Invalid JSON",
          };
        }
      }
    );

  const getSeoAnalysis = () => {
    const images = Array.from(document.images);
    const publicUrl = new URL(window.location.href);

    publicUrl.searchParams.delete(defaultTokenParam);

    return {
      url: seoAnalysisConfig.url || publicUrl.toString(),
      title: seoAnalysisConfig.title,
      description: seoAnalysisConfig.description,
      canonical: seoAnalysisConfig.canonical,
      siteUrl: seoAnalysisConfig.siteUrl,
      robots: seoAnalysisConfig.robots,
      language: seoAnalysisConfig.language || document.documentElement.lang.trim(),
      headings: Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map(
        (heading) => ({
          level: Number(heading.tagName.slice(1)),
          text: (heading.textContent || "").trim().replace(/\\s+/g, " "),
        })
      ),
      images: {
        total: images.length,
        missingAlt: images.filter((image) => !image.hasAttribute("alt")).length,
        emptyAlt: images.filter(
          (image) => image.hasAttribute("alt") && !image.alt.trim()
        ).length,
      },
      structuredData: getStructuredData(),
      openGraph: seoAnalysisConfig.openGraph,
      twitter: seoAnalysisConfig.twitter,
    };
  };

  const normalizePath = (path) => (
    path.startsWith("/") ? path : "/" + path
  );

  const getTokenParam = (message) => message.tokenParam || defaultTokenParam;

  const hasCurrentToken = (message) => {
    const currentUrl = new URL(window.location.href);

    return currentUrl.searchParams.get(getTokenParam(message)) === message.token;
  };

  const getNextUrl = (message) => {
    const tokenParam = getTokenParam(message);
    const nextUrl = message.href
      ? new URL(message.href, window.location.href)
      : new URL(window.location.href);

    if (!message.href) {
      nextUrl.pathname = normalizePath(message.path);
    }

    nextUrl.searchParams.set(tokenParam, message.token);

    return nextUrl;
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    if (event.origin !== parentOrigin) return;

    if (isPreviewInspectorMessage(event.data)) {
      setInspectEnabled(event.data.enabled);
      return;
    }

    if (isSeoAnalysisMessage(event.data)) {
      postToParent({
        type: seoAnalysisResultMessageType,
        requestId: event.data.requestId,
        report: getSeoAnalysis(),
      });
      return;
    }

    if (!isPreviewUpdateMessage(event.data)) return;
    if (hasCurrentToken(event.data)) return;

    const nextHref = getNextUrl(event.data).toString();

    if (nextHref === window.location.href) return;
    if (nextHref === window[navigationKey]) return;

    window[navigationKey] = nextHref;
    window.location.replace(nextHref);
  });

  postToParent({ type: readyMessageType });
})();
`

  return <Script id="rakun-preview-bridge" dangerouslySetInnerHTML={{ __html: script }} />
}
