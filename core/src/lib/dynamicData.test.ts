import { describe, expect, it } from "bun:test";

import { isDynamicDataSourceContentTypeAllowed } from "./dynamicData";

describe("dynamic data", () => {
  it("hides content types from source selectors until they opt in to export", () => {
    expect(
      isDynamicDataSourceContentTypeAllowed({ name: "Project" }),
    ).toBe(false);
    expect(
      isDynamicDataSourceContentTypeAllowed({
        name: "Project",
        dynamicDataSource: true,
      }),
    ).toBe(true);
  });
});
