import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DataInput, DBOutput } from "../lib/types";

export const LlmsEntry = new ContentType({
  name: "LlmsEntry",
  permissions: false,
  dynamicData: false,
  modulePicker: {
    title: "settings.llms.entry",
  },
  fields: {
    llmsLink: Fields.link().required(),
    llmsLinkDescription: Fields.string().type("Textarea").translatable().optional(),
  },
}).hideFromManager();

export const LlmsSection = new ContentType({
  name: "LlmsSection",
  permissions: false,
  dynamicData: false,
  modulePicker: {
    title: "settings.llms.section",
  },
  fields: {
    llmsSectionTitle: Fields.string().translatable().optional(),
    llmsOptional: Fields.boolean().description(
      "field.llmsOptionalDescription",
    ).optional(),
    llmsEntries: Fields.blocks([
      {
        name: LlmsEntry.name,
        field: Fields.relation(LlmsEntry, "new"),
      },
    ]).optional(),
  },
}).hideFromManager();

export const LlmsSettings = new ContentType({
  name: "LlmsSettings",
  permissions: "LlmsSettings",
  dynamicData: false,
  fields: {
    key: Fields.string().required(),
    llmsEnabled: Fields.boolean().required(),
    llmsTitle: Fields.string().translatable().optional(),
    llmsSummary: Fields.string().type("Textarea").translatable().optional(),
    llmsDetails: Fields.string().type("Textarea").translatable().optional(),
    llmsSections: Fields.blocks([
      {
        name: LlmsSection.name,
        field: Fields.relation(LlmsSection, "new"),
      },
    ]).optional(),
  },
  uniques: [["key"]],
  listFields: ["key"],
}).hideFromManager();

export type LlmsSettings = typeof LlmsSettings;
export type LlmsSettingsSchema = DataFront<LlmsSettings>;
export type LlmsSettingsInput = DataInput<LlmsSettings>;
export type LlmsSettingsManager = DBOutput<LlmsSettings>;
