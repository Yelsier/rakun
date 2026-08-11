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
    llmsLinkDescription: Fields.string().type("Textarea").translatable(),
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
    llmsSectionTitle: Fields.string().translatable(),
    llmsOptional: Fields.boolean().description(
      "field.llmsOptionalDescription",
    ),
    llmsEntries: Fields.blocks([
      {
        name: LlmsEntry.name,
        field: Fields.relation(LlmsEntry, "new"),
      },
    ]),
  },
}).hideFromManager();

export const LlmsSettings = new ContentType({
  name: "LlmsSettings",
  permissions: "LlmsSettings",
  dynamicData: false,
  fields: {
    key: Fields.string().required(),
    llmsEnabled: Fields.boolean().required(),
    llmsTitle: Fields.string().translatable(),
    llmsSummary: Fields.string().type("Textarea").translatable(),
    llmsDetails: Fields.string().type("Textarea").translatable(),
    llmsSections: Fields.blocks([
      {
        name: LlmsSection.name,
        field: Fields.relation(LlmsSection, "new"),
      },
    ]),
  },
  uniques: [["key"]],
  listFields: ["key"],
}).hideFromManager();

export type LlmsSettings = typeof LlmsSettings;
export type LlmsSettingsSchema = DataFront<LlmsSettings>;
export type LlmsSettingsInput = DataInput<LlmsSettings>;
export type LlmsSettingsManager = DBOutput<LlmsSettings>;
