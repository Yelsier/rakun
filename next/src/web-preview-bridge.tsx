import {
  rakunPreviewMessageType,
  rakunPreviewReadyMessageType,
} from "./web-preview";

const serializeScriptValue = (value: string) =>
  JSON.stringify(value).replace(/</g, "\\u003c");

export const RakunPreviewBridge = ({
  tokenParam,
}: {
  tokenParam: string;
}) => {
  const script = `
(() => {
  const bridgeKey = "__rakunPreviewBridgeInstalled";
  const navigationKey = "__rakunPreviewBridgeNavigatingTo";
  const updateMessageType = ${serializeScriptValue(rakunPreviewMessageType)};
  const readyMessageType = ${serializeScriptValue(rakunPreviewReadyMessageType)};
  const defaultTokenParam = ${serializeScriptValue(tokenParam)};

  if (window[bridgeKey]) {
    window.parent?.postMessage({ type: readyMessageType }, "*");
    return;
  }

  window[bridgeKey] = true;

  const isPreviewUpdateMessage = (value) => (
    value &&
    typeof value === "object" &&
    value.type === updateMessageType &&
    typeof value.path === "string" &&
    typeof value.token === "string"
  );

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
    if (!isPreviewUpdateMessage(event.data)) return;
    if (hasCurrentToken(event.data)) return;

    const nextHref = getNextUrl(event.data).toString();

    if (nextHref === window.location.href) return;
    if (nextHref === window[navigationKey]) return;

    window[navigationKey] = nextHref;
    window.location.replace(nextHref);
  });

  window.parent?.postMessage({ type: readyMessageType }, "*");
})();
`;

  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
};
