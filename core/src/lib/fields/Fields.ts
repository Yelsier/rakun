import { booleanField } from "./Boolean";
import { breadcrumsField } from './Breadcrums'
import { contentReferenceField } from "./ContentReference";
import { dateField } from "./Date";
import { fileField } from "./File";
import { iteratorField } from "./Iterator";
import { linkField } from "./Link";
import { listField } from "./List";
import { numberField } from "./Number";
import { relationField } from "./Relation";
import { selectField } from "./Select";
import { selfRelationField } from "./SelfRelation";
import { simpleListField } from "./SimpleList";
import { stringField } from "./String";

export const Fields = {
  string: stringField,
  relation: relationField,
  contentReference: contentReferenceField,
  selfRelation: selfRelationField,
  number: numberField,
  boolean: booleanField,
  breadcrums: breadcrumsField,
  link: linkField,
  file: fileField,
  date: dateField,
  select: selectField,
  iterator: iteratorField,
  blocks: listField,
  array: simpleListField,
};

export const f = Fields;
