import ContentType from "../lib/ContentType";

/** Marker inserted in a shared template where document content is rendered. */
export const TemplateContent = new ContentType({
  name: "TemplateContent",
  fields: {},
  modulePicker: {
    title: "contentEdit.templateContent",
    description: "contentEdit.templateContentDescription",
    icon: "BetweenHorizontalStart",
  },
}).hideFromManager();

export type TemplateContent = typeof TemplateContent;
