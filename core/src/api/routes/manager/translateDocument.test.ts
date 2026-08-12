import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockGetMongoService = mock();
const mockCheckRevalidatePath = mock();

mock.module("../../../orm", () => ({
  getMongoService: mockGetMongoService,
}));

mock.module("../../utils/routes/revalidatePath", () => ({
  checkRevalidatePath: mockCheckRevalidatePath,
}));

import ContentType from "../../../lib/ContentType";
import { Fields } from "../../../lib/fields";
import { createLogger } from "../../../lib/Logger";
import { registerContentType } from "../../../lib/Registry";
import { createTranslationService } from "../../../translation";
import type { LanguageSchema } from "../../../internal-content-types/Language";

const { translateDocumentHandler } = await import("./translateDocument");

const HandlerPage = new ContentType({
  name: "TranslateHandlerPage",
  fields: {
    title: Fields.string().translatable().optional(),
  },
}).versioned();

registerContentType(HandlerPage);

const en = {
  _id: "en",
  _type: "Language",
  code: "en",
  name: "English",
  default: true,
} as LanguageSchema;

const fr = {
  _id: "fr",
  _type: "Language",
  code: "fr",
  name: "French",
  default: false,
} as LanguageSchema;

describe("translateDocumentHandler", () => {
  beforeEach(() => {
    createLogger({ level: "fatal" });
    mockGetMongoService.mockReset();
    mockCheckRevalidatePath.mockReset();
    mockCheckRevalidatePath.mockResolvedValue(undefined);
    createTranslationService({
      adapter: {
        translateBatch: async (input) => ({
          translations: Object.fromEntries(
            input.to.map((language) => [
              language.code,
              Object.fromEntries(
                input.segments.map((segment) => [
                  segment.id,
                  `${language.code}:${segment.text}`,
                ]),
              ),
            ]),
          ),
        }),
      },
    });
  });

  it("translates, updates with version metadata, and returns a summary", async () => {
    const current = {
      _id: "page-id",
      _type: HandlerPage.name,
      createdBy: "user-id",
      title: {
        _tag: "Translatable",
        en: "Hello",
      },
    };
    const update = mock(async (_contentType, id, data, options) => ({
      ...current,
      ...data,
      _id: id,
      _revision: 2,
    }));

    mockGetMongoService.mockResolvedValue({
      find: mock(async () => ({ createdBy: "user-id" })),
      get: mock(async () => current),
      getAll: mock(async () => [en, fr]),
      update,
    });

    const result = await translateDocumentHandler({
      input: {
        contentType: HandlerPage.name,
        id: "page-id",
        from: "en",
        to: ["fr"],
        overwrite: false,
      },
      ctx: {
        getUser: () => ({
          _id: "user-id",
          _type: "ManagerUser",
          user: "Yago",
          email: "yago@example.com",
          role: { permissions: ["content.TranslateHandlerPage.own"] },
        }),
      },
    } as never);

    expect(update).toHaveBeenCalledWith(
      HandlerPage,
      "page-id",
      {
        title: {
          _tag: "Translatable",
          en: "Hello",
          fr: "fr:Hello",
        },
        updatedBy: "user-id",
      },
      {
        actorId: "user-id",
        reason: "manager translate",
      },
    );
    expect(result.summary.translatedSegments).toBe(1);
    expect(result.item.title.fr).toBe("fr:Hello");
    expect(mockCheckRevalidatePath).toHaveBeenCalledWith({
      contentType: HandlerPage.name,
      contentTypeId: "page-id",
      operation: "update",
    });
  });
});
