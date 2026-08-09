import { describe, expect, it } from "bun:test";

import { renderLlmsTxt } from "./llms";

describe("renderLlmsTxt", () => {
  it("renders the llms.txt convention and merges optional links", () => {
    expect(
      renderLlmsTxt({
        title: "Rakun",
        summary: "A CMS for small and medium sites.",
        details: "Use the documentation first.\n# This is guidance, not a section",
        sections: [
          {
            title: "Documentation",
            entries: [
              {
                title: "Getting [started]",
                href: "https://example.com/docs",
                description: "Install and configure\nRakun.",
              },
            ],
          },
          {
            title: "More resources",
            optional: true,
            entries: [
              {
                title: "Changelog",
                href: "https://example.com/changelog",
              },
            ],
          },
        ],
      }),
    ).toBe(
      "# Rakun\n\n" +
        "> A CMS for small and medium sites.\n\n" +
        "Use the documentation first.\n" +
        "\\# This is guidance, not a section\n\n" +
        "## Documentation\n" +
        "- [Getting \\[started\\]](https://example.com/docs): Install and configure Rakun.\n\n" +
        "## Optional\n" +
        "\n" +
        "### More resources\n" +
        "- [Changelog](https://example.com/changelog)\n",
    );
  });

  it("keeps titled sections without public links and requires a document title", () => {
    expect(
      renderLlmsTxt({
        title: "Rakun",
        sections: [
          { title: "Empty", entries: [] },
          { title: "Optional group", optional: true, entries: [] },
        ],
      }),
    ).toBe(
      "# Rakun\n\n## Empty\n\n## Optional\n\n### Optional group\n",
    );

    expect(renderLlmsTxt({ title: "  ", sections: [] })).toBeUndefined();
  });
});
