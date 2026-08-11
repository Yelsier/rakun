import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Image } from "./Image";

describe("Image", () => {
  test("blurs an inline LQIP while the full image loads", () => {
    const html = renderToStaticMarkup(
      <Image
        src="/hero.webp"
        previewSrc="data:image/webp;base64,cHJldmlldw=="
        alt="Hero"
      />,
    );

    expect(html).toContain("filter:blur(20px)");
    expect(html).toContain("transition:filter 250ms ease-out");
    expect(html).toContain(
      "background-image:url(&quot;data:image/webp;base64,cHJldmlldw==&quot;)",
    );
  });

  test("does not blur regular preview URLs or images without a LQIP", () => {
    const previewHtml = renderToStaticMarkup(
      <Image src="/hero.webp" previewSrc="/hero-preview.webp" alt="Hero" />,
    );
    const imageHtml = renderToStaticMarkup(
      <Image src="/hero.webp" alt="Hero" />,
    );

    expect(previewHtml).not.toContain("blur(20px)");
    expect(imageHtml).not.toContain("blur(20px)");
  });
});
