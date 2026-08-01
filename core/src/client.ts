export {
  AUTH_IP_BLOCK_MANAGE_PERMISSION,
  getPermissionList,
  hasPermissions,
  mapPermissions,
  type Permission,
} from "./lib/Permissions";
export type { MaybeTranslatableValue, TranslatableValue } from "./lib/types";
export type {
  DynamicBindingSource,
  DynamicDataOptions,
  DynamicDocumentBindings,
  DynamicListBinding,
  DynamicListDocumentSource,
  DynamicListMapSource,
  DynamicQueryCurrentValue,
  DynamicRelatedCollectionSource,
} from "./lib/dynamicData";
export {
  DYNAMIC_QUERY_CURRENT_VALUE_KEY,
  DYNAMIC_BINDINGS_FIELD_NAME,
  DynamicDocumentBindingsSchema,
  DynamicQueryCurrentValueSchema,
  isDynamicDataSourceContentTypeAllowed,
} from "./lib/dynamicData";
export { Fields, f } from "./lib/fields";
export * from "./lib/fields/Boolean";
export * from "./lib/fields/ContentReference";
export * from "./lib/fields/Date";
export * from "./lib/fields/Field";
export * from "./lib/fields/File";
export * from "./lib/fields/Iterator";
export * from "./lib/fields/Link";
export * from "./lib/fields/List";
export * from "./lib/fields/Number";
export * from "./lib/fields/Relation";
export * from "./lib/fields/Select";
export * from "./lib/fields/SelfRelation";
export * from "./lib/fields/SimpleList";
export * from "./lib/fields/String";
export {
  isIteratorItemVisible,
  isIteratorVisibilityValueEmpty,
} from "./api/utils/iteratorVisibility";
export { getListField } from "./lib/utils/getListField";
export { getTranslation } from "./lib/utils/getTranslation";
export { Id, isId, type Id as IdType } from "./lib/utils/id";
export { isTranslatableObject } from "./lib/utils/isTranslatableObject";
export { slugify } from "./lib/utils/slugify";
export { encodeContentTypeForManager } from "./lib/Registry";
export {
  ITERATOR_FIELD_NAME,
  ITERATOR_UNLINKED_FIELD_NAME,
  SEO_FIELD_NAME,
} from "./lib/systemFields";
export {
  LOCALE_VARIANT_GROUP_FIELD,
  LOCALE_VARIANT_NAME_FIELD,
  LOCALE_VARIANT_ROLE_FIELD,
  LocaleVariantRole,
  getLocaleVariantGroupId,
  getLocaleVariantName,
  getLocaleVariantRole,
  isLocaleVariantDocument,
} from "./lib/localeVariants";
export {
  instanceofAppErrorShape,
  type AppErrorShape,
} from "./lib/errors/errors";
export {
  type EncodedContentType,
  EncodedContentTypeSchema,
  DocumentVisibility,
  type DocumentVisibility as DocumentVisibilityType,
  ModulePicker,
  type ModulePicker as ModulePickerMetadata,
} from "./lib/ContentType";
export type { FileOptimizeOptions } from "./lib/fields/File";
export { loginInput, type LoginInput } from "./schemas/manager/auth/login";
export type { LoginAdapterMetadata } from "./schemas/manager/auth/externalLogin";
export type { ApiOperationsOutput } from "./schemas/manager/apiOperations";
export type {
  BackupRecord,
  CreateBackupInput,
  ListBackupsOutput,
  RestoreBackupInput,
  RestoreBackupOutput,
} from "./schemas/manager/backups";
export type {
  ListMigrationsOutput,
  MigrationLedgerRecord,
  MigrationStateRecord,
  PendingMigrationRecord,
} from "./schemas/manager/migrations";
export type {
  ContentVersionRecord,
  GetVersionInput,
  ListVersionsInput,
  ListVersionsOutput,
  RestoreVersionInput,
  RestoreVersionOutput,
} from "./schemas/manager/versions";
export type {
  LocaleVariantAssignInput,
  LocaleVariantAssignment,
  LocaleVariantCreateInput,
  LocaleVariantCreateOutput,
  LocaleVariantDocument,
  LocaleVariantListInput,
  LocaleVariantListOutput,
  LocaleVariantMutationOutput,
  LocaleVariantRestoreInput,
  LocaleVariantSetPrimaryInput,
  LocaleVariantTrashInput,
  LocaleVariantUnassignInput,
} from "./schemas/manager/localeVariants";
export type {
  ContentVersionDocument,
  ContentVersionReferenceInput,
  CreateContentVersionInput,
  CreateContentVersionOutput,
  ListContentVersionsOutput,
  PromoteContentVersionInput,
  PromoteContentVersionOutput,
} from "./schemas/manager/contentVersions";
export type {
  DeleteReviewPolicyInput,
  DeleteReviewPolicyOutput,
  ListReviewPoliciesOutput,
  ReviewPolicyRecord,
  UpsertReviewPolicyInput,
} from "./schemas/manager/reviewPolicies";
export type {
  CancelReviewInput,
  CancelReviewOutput,
  DecideReviewInput,
  DecideReviewOutput,
  GetReviewOutput,
  ListReviewCandidatesOutput,
  RequestReviewInput,
  RequestReviewOutput,
  ReviewCandidate,
  ReviewDecision,
  ReviewDecisionRecord,
  ReviewRecord,
  ReviewReferenceInput,
  ReviewStatus,
} from "./schemas/manager/reviews";
export type {
  RouteLayoutReferenceInput,
  RouteLayoutStateOutput,
  SetRouteLayoutOverrideInput,
  SetRouteLayoutOverrideOutput,
} from "./schemas/manager/routeLayout";
export type {
  LinkedIteratorAction,
  LinkedIteratorControl,
  LinkedIteratorGetInput,
  LinkedIteratorMode,
  LinkedIteratorStateOutput,
} from "./schemas/manager/linkedIterator";
export type { DuplicateInput } from "./schemas/manager/duplicate";
export type {
  CommentRecord,
  CommentReactionEmoji,
  CommentReactionRecord,
  CreateCommentInput,
  CreateCommentOutput,
  ListCommentsInput,
  ListCommentsOutput,
  MarkCommentsReadInput,
  MarkCommentsReadOutput,
  ToggleCommentReactionInput,
  ToggleCommentReactionOutput,
  UnreadCommentsCountOutput,
} from "./schemas/manager/comments";
export type {
  ListMentionUsersOutput,
  MentionUser,
} from "./schemas/manager/users";
export type {
  ListNotificationsInput,
  ListNotificationsOutput,
  MarkNotificationsReadInput,
  MarkNotificationsReadOutput,
} from "./schemas/manager/notifications";
export type {
  TranslateDocumentInput,
  TranslateDocumentOutput,
  TranslateDocumentSummary,
} from "./schemas/manager/translateDocument";
export type {
  CreatePreviewInput,
  CreatePreviewOutput,
} from "./schemas/manager/preview";
export type { ListOutput } from "./schemas/manager/list";
export type { ListLiteralsOutput } from "./schemas/manager/literals/list";
export type {
  FinalizeUploadInput,
  FinalizeUploadOutput,
} from "./schemas/manager/media/finalizeUpload";
export type {
  GetMediaUrlInput,
  GetMediaUrlOutput,
} from "./schemas/manager/media/getMediaUrl";
export type {
  PrepareUploadInput,
  PrepareUploadOutput,
} from "./schemas/manager/media/prepareUpload";
export { Seo } from "./internal-content-types/Seo";
export type { LanguageSchema } from "./internal-content-types/Language";
export { ADMIN_ROLE_NAME, isAdminRole } from "./lib/ManagerRolePolicy";
export type { ManagerUserSchema } from "./internal-content-types/ManagerUser";
