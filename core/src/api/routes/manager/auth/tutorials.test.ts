import { describe, expect, it } from "bun:test";

import { getUpdatedSeenTours } from "./markTourSeen";
import { createTutorialPreferencesUpdate } from "./updateTutorialPreferences";

describe("manager tutorial preferences", () => {
  it("builds a tutorial preferences update with the prompted timestamp", () => {
    const promptedAt = new Date("2026-05-16T10:00:00.000Z");

    expect(
      createTutorialPreferencesUpdate({ enabled: true }, promptedAt),
    ).toEqual({
      tutorialsEnabled: true,
      tutorialsPromptedAt: promptedAt,
    });

    expect(
      createTutorialPreferencesUpdate({ enabled: false }, promptedAt),
    ).toEqual({
      tutorialsEnabled: false,
      tutorialsPromptedAt: promptedAt,
    });
  });

  it("adds a seen tour once without duplicating existing ids", () => {
    expect(getUpdatedSeenTours(undefined, "manager.media")).toEqual([
      "manager.media",
    ]);
    expect(
      getUpdatedSeenTours(
        ["manager.dashboard", "manager.media"],
        "manager.media",
      ),
    ).toEqual(["manager.dashboard", "manager.media"]);
    expect(
      getUpdatedSeenTours(["manager.dashboard"], "manager.media"),
    ).toEqual(["manager.dashboard", "manager.media"]);
  });
});
