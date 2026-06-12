import { describe, expect, it } from "bun:test";

import {
  isDynamicDataSourceAllowed,
  isDynamicDataSourceContentTypeAllowed,
} from "./dynamicData";

describe("dynamic data", () => {
  it("filters dynamic data sources when an allowlist is configured", () => {
    expect(isDynamicDataSourceAllowed(true, "Project")).toBe(true);
    expect(isDynamicDataSourceAllowed(undefined, "Project")).toBe(false);
    expect(
      isDynamicDataSourceAllowed({ fields: ["title"] }, "Project"),
    ).toBe(true);
    expect(
      isDynamicDataSourceAllowed(
        { fields: ["title"], sources: ["Project"] },
        "Project",
      ),
    ).toBe(true);
    expect(
      isDynamicDataSourceAllowed(
        { fields: ["title"], sources: ["Project"] },
        "Article",
      ),
    ).toBe(false);
  });

  it("hides content types from source selectors until they opt in", () => {
    expect(
      isDynamicDataSourceContentTypeAllowed(
        { fields: ["title"] },
        { name: "Project" },
      ),
    ).toBe(false);
    expect(
      isDynamicDataSourceContentTypeAllowed(
        { fields: ["title"] },
        { name: "Project", dynamicDataSource: true },
      ),
    ).toBe(true);
    expect(
      isDynamicDataSourceContentTypeAllowed(
        { fields: ["title"], sources: ["Article"] },
        { name: "Project", dynamicDataSource: true },
      ),
    ).toBe(false);
  });
});
