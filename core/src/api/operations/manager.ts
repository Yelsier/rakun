import type { RakunOperationImplementationMap } from "./types";
import { mergeOperationContracts } from "./types";
import { traceOperationMap } from "./tracing";
import { createManagerOperationContracts } from "./manager-contract";
import { getCustomApiOperationDefinitions, mergeOperationMaps } from "./custom";
import { setSessionCookie } from "../sessionCookie";
import { apiOperationsHandler } from "../routes/manager/apiOperations";
import { createBackupHandler } from "../routes/manager/backups/create";
import { listBackupsHandler } from "../routes/manager/backups/list";
import { restoreBackupHandler } from "../routes/manager/backups/restore";
import { contentTypeHandler } from "../routes/manager/contentType";
import { contentTypesHandler } from "../routes/manager/contentTypes";
import { createHandler } from "../routes/manager/create";
import { deleteHandler } from "../routes/manager/delete";
import { duplicateHandler } from "../routes/manager/duplicate";
import {
  listFavoritesHandler,
  toggleFavoriteHandler,
} from "../routes/manager/favorites";
import {
  listNotificationsHandler,
  markNotificationsReadHandler,
} from "../routes/manager/notifications";
import {
  assignLocaleVariantHandler,
  createLocaleVariantHandler,
  listLocaleVariantsHandler,
  restoreLocaleVariantHandler,
  setPrimaryLocaleVariantHandler,
  trashLocaleVariantHandler,
  unassignLocaleVariantHandler,
} from "../routes/manager/localeVariants";
import {
  createCommentHandler,
  listCommentsHandler,
  markCommentsReadHandler,
  toggleCommentReactionHandler,
  unreadCommentsCountHandler,
} from "../routes/manager/comments";
import { listMentionUsersHandler } from "../routes/manager/users";
import { trashHandler } from "../routes/manager/trash";
import { getHandler } from "../routes/manager/get";
import { linkedIteratorGetHandler } from "../routes/manager/linkedIterator";
import { listHandler } from "../routes/manager/list";
import { languagesHandler } from "../routes/manager/languages";
import { uiLocalesHandler } from "../routes/manager/uiLocales";
import { listMigrationsHandler } from "../routes/manager/migrations/list";
import { listEventLogsHandler } from "../routes/manager/logs/list";
import { permissionsHandler } from "../routes/manager/permissions";
import { regenerateRoutesHandler } from "../routes/manager/regenerateRoutes";
import { setDefaultLanguageHandler } from "../routes/manager/setDefaultLanguage";
import { updateHandler } from "../routes/manager/update";
import { loginHandler } from "../routes/manager/auth/login";
import { enrollTotpHandler } from "../routes/manager/auth/totp/enrollTotp";
import { logoutHandler } from "../routes/manager/auth/logout";
import { updatePasswordHandler } from "../routes/manager/auth/updatePassword";
import { confirmTotpHandler } from "../routes/manager/auth/totp/confirmTotp";
import { verifyTotpHandler } from "../routes/manager/auth/totp/verifyTotp";
import { getSessionHandler } from "../routes/manager/auth/getSession";
import { webauthnRegisterOptionsHandler } from "../routes/manager/auth/webauthn/webauthnRegisterOptions";
import { webauthnRegisterVerifyHandler } from "../routes/manager/auth/webauthn/webauthnRegisterVerify";
import { webauthnAuthOptionsHandler } from "../routes/manager/auth/webauthn/webauthnAuthOptions";
import { webauthnAuthVerifyHandler } from "../routes/manager/auth/webauthn/webauthnAuthVerify";
import { accountInfoHandler } from "../routes/manager/auth/accountInfo";
import { updateAccountHandler } from "../routes/manager/auth/updateAccount";
import { updateTutorialPreferencesHandler } from "../routes/manager/auth/updateTutorialPreferences";
import { markTourSeenHandler } from "../routes/manager/auth/markTourSeen";
import { deleteSessionHandler } from "../routes/manager/auth/deleteSession";
import {
  requestPasswordResetHandler,
  resetPasswordHandler,
} from '../routes/manager/auth/passwordRecovery'
import { verifyRecoveryCodeHandler } from '../routes/manager/auth/mfa/verifyRecoveryCode'
import { regenerateRecoveryCodesHandler } from '../routes/manager/auth/mfa/regenerateRecoveryCodes'
import { prepareUploadHandler } from "../routes/manager/media/prepareUpload";
import { finalizeUploadHandler } from "../routes/manager/media/finalizeUpload";
import { getMediaUrlHandler } from "../routes/manager/media/getMediaUrl";
import { createFolderHandler } from "../routes/manager/media/createFolder";
import { listFoldersHandler } from "../routes/manager/media/listFolders";
import { deleteFolderHandler } from "../routes/manager/media/deleteFolder";
import { listLiteralsHandler } from "../routes/manager/literals/list";
import { upsertLiteralHandler } from "../routes/manager/literals/upsert";
import { getVersionHandler } from "../routes/manager/versions/get";
import { listVersionsHandler } from "../routes/manager/versions/list";
import { restoreVersionHandler } from "../routes/manager/versions/restore";
import { translateDocumentHandler } from "../routes/manager/translateDocument";
import { createPreviewHandler } from "../routes/manager/preview/create";
import {
  deleteReviewPolicyHandler,
  listReviewPoliciesHandler,
  upsertReviewPolicyHandler,
} from "../routes/manager/reviewPolicies";
import {
  cancelReviewHandler,
  decideReviewHandler,
  getReviewHandler,
  listReviewCandidatesHandler,
  requestReviewHandler,
} from "../routes/manager/reviews";
import {
  createContentVersionHandler,
  listContentVersionsHandler,
  promoteContentVersionHandler,
} from "../routes/manager/contentVersions";
import {
  getRouteLayoutHandler,
  setRouteLayoutOverrideHandler,
} from "../routes/manager/routeLayout";

export const createManagerOperationDefinitions = () => {
  const contracts = createManagerOperationContracts();
  const implementations: RakunOperationImplementationMap<typeof contracts> = {
    "manager.contentTypes": {
      resolve: contentTypesHandler,
    },
    "manager.contentType": {
      resolve: contentTypeHandler,
    },
    "manager.languages": {
      resolve: languagesHandler,
    },
    "manager.uiLocales": {
      resolve: uiLocalesHandler,
    },
    "manager.regenerateRoutes": {
      resolve: regenerateRoutesHandler,
    },
    "manager.create": {
      resolve: createHandler,
    },
    "manager.duplicate": {
      resolve: duplicateHandler,
    },
    "manager.update": {
      resolve: updateHandler,
    },
    "manager.delete": {
      resolve: deleteHandler,
    },
    "manager.trash": {
      resolve: trashHandler,
    },
    "manager.get": {
      resolve: getHandler,
    },
    "manager.linkedIterator.get": {
      resolve: linkedIteratorGetHandler,
    },
    "manager.list": {
      resolve: listHandler,
    },
    "manager.favorites.list": {
      resolve: listFavoritesHandler,
    },
    "manager.favorites.toggle": {
      resolve: toggleFavoriteHandler,
    },
    "manager.notifications.list": {
      resolve: listNotificationsHandler,
    },
    "manager.notifications.markRead": {
      resolve: markNotificationsReadHandler,
    },
    "manager.reviewPolicies.list": {
      resolve: listReviewPoliciesHandler,
    },
    "manager.reviewPolicies.upsert": {
      resolve: upsertReviewPolicyHandler,
    },
    "manager.reviewPolicies.delete": {
      resolve: deleteReviewPolicyHandler,
    },
    "manager.reviews.get": {
      resolve: getReviewHandler,
    },
    "manager.reviews.candidates": {
      resolve: listReviewCandidatesHandler,
    },
    "manager.reviews.request": {
      resolve: requestReviewHandler,
    },
    "manager.reviews.decide": {
      resolve: decideReviewHandler,
    },
    "manager.reviews.cancel": {
      resolve: cancelReviewHandler,
    },
    "manager.routeLayout.get": {
      resolve: getRouteLayoutHandler,
    },
    "manager.routeLayout.setOverride": {
      resolve: setRouteLayoutOverrideHandler,
    },
    "manager.contentVersions.list": {
      resolve: listContentVersionsHandler,
    },
    "manager.contentVersions.create": {
      resolve: createContentVersionHandler,
    },
    "manager.contentVersions.promote": {
      resolve: promoteContentVersionHandler,
    },
    "manager.localeVariants.list": {
      resolve: listLocaleVariantsHandler,
    },
    "manager.localeVariants.create": {
      resolve: createLocaleVariantHandler,
    },
    "manager.localeVariants.assign": {
      resolve: assignLocaleVariantHandler,
    },
    "manager.localeVariants.unassign": {
      resolve: unassignLocaleVariantHandler,
    },
    "manager.localeVariants.setPrimary": {
      resolve: setPrimaryLocaleVariantHandler,
    },
    "manager.localeVariants.trash": {
      resolve: trashLocaleVariantHandler,
    },
    "manager.localeVariants.restore": {
      resolve: restoreLocaleVariantHandler,
    },
    "manager.users.mentions": {
      resolve: listMentionUsersHandler,
    },
    "manager.comments.list": {
      resolve: listCommentsHandler,
    },
    "manager.comments.create": {
      resolve: createCommentHandler,
    },
    "manager.comments.toggleReaction": {
      resolve: toggleCommentReactionHandler,
    },
    "manager.comments.markRead": {
      resolve: markCommentsReadHandler,
    },
    "manager.comments.unreadCount": {
      resolve: unreadCommentsCountHandler,
    },
    "manager.setDefaultLanguage": {
      resolve: setDefaultLanguageHandler,
    },
    "manager.permissions": {
      resolve: permissionsHandler,
    },
    "manager.logs.list": {
      resolve: listEventLogsHandler,
    },
    "manager.backups.list": {
      resolve: listBackupsHandler,
    },
    "manager.backups.create": {
      resolve: createBackupHandler,
    },
    "manager.backups.restore": {
      resolve: restoreBackupHandler,
    },
    "manager.migrations.list": {
      resolve: listMigrationsHandler,
    },
    "manager.versions.list": {
      resolve: listVersionsHandler,
    },
    "manager.versions.get": {
      resolve: getVersionHandler,
    },
    "manager.versions.restore": {
      resolve: restoreVersionHandler,
    },
    "manager.translateDocument": {
      resolve: translateDocumentHandler,
    },
    "manager.preview.create": {
      resolve: createPreviewHandler,
    },
    "manager.apiOperations": {
      resolve: ({ ctx }) => apiOperationsHandler({ contracts, implementations, ctx }),
    },
    "manager.media.prepareUpload": {
      resolve: prepareUploadHandler,
    },
    "manager.media.finalizeUpload": {
      resolve: finalizeUploadHandler,
    },
    "manager.media.getUrl": {
      resolve: getMediaUrlHandler,
    },
    "manager.media.createFolder": {
      resolve: createFolderHandler,
    },
    "manager.media.listFolders": {
      resolve: listFoldersHandler,
    },
    "manager.media.deleteFolder": {
      resolve: deleteFolderHandler,
    },
    "manager.literals.list": {
      resolve: listLiteralsHandler,
    },
    "manager.literals.upsert": {
      resolve: upsertLiteralHandler,
    },
    "manager.auth.updatePassword": {
      resolve: updatePasswordHandler,
    },
    'manager.auth.password.requestReset': {
      resolve: requestPasswordResetHandler,
    },
    'manager.auth.password.reset': {
      resolve: resetPasswordHandler,
    },
    "manager.auth.login": {
      resolve: loginHandler,
      onSuccess: ({ ctx, result }) => {
        if ("token" in result) {
          setSessionCookie(ctx, result.token, {
            maxAge: Math.max(0, Date.parse(result.expiresAt) - Date.now()),
          });
        }
      },
    },
    "manager.auth.logout": {
      resolve: logoutHandler,
      onSuccess: ({ ctx }) => {
        setSessionCookie(ctx, "", { maxAge: 0 });
      },
    },
    "manager.auth.getSession": {
      resolve: getSessionHandler,
    },
    "manager.auth.accountInfo": {
      resolve: accountInfoHandler,
    },
    "manager.auth.updateAccount": {
      resolve: updateAccountHandler,
    },
    "manager.auth.updateTutorialPreferences": {
      resolve: updateTutorialPreferencesHandler,
    },
    "manager.auth.markTourSeen": {
      resolve: markTourSeenHandler,
    },
    "manager.auth.deleteSession": {
      resolve: deleteSessionHandler,
    },
    "manager.auth.totp.enroll": {
      resolve: enrollTotpHandler,
    },
    "manager.auth.totp.confirm": {
      resolve: confirmTotpHandler,
    },
    "manager.auth.totp.verify": {
      resolve: verifyTotpHandler,
      onSuccess: ({ ctx, result }) => {
        if ("token" in result) {
          setSessionCookie(ctx, result.token, {
            maxAge: Math.max(0, Date.parse(result.expiresAt) - Date.now()),
          });
        }
      },
    },
    'manager.auth.mfa.verifyRecoveryCode': {
      resolve: verifyRecoveryCodeHandler,
      onSuccess: ({ ctx, result }) => {
        if ('token' in result) {
          setSessionCookie(ctx, result.token, {
            maxAge: Math.max(0, Date.parse(result.expiresAt) - Date.now()),
          })
        }
      },
    },
    'manager.auth.mfa.regenerateRecoveryCodes': {
      resolve: regenerateRecoveryCodesHandler,
    },
    "manager.auth.webauthn.register.options": {
      resolve: webauthnRegisterOptionsHandler,
    },
    "manager.auth.webauthn.register.verify": {
      resolve: webauthnRegisterVerifyHandler,
    },
    "manager.auth.webauthn.auth.options": {
      resolve: webauthnAuthOptionsHandler,
    },
    "manager.auth.webauthn.auth.verify": {
      resolve: webauthnAuthVerifyHandler,
      onSuccess: ({ ctx, result }) => {
        if ("token" in result) {
          setSessionCookie(ctx, result.token, {
            maxAge: Math.max(0, Date.parse(result.expiresAt) - Date.now()),
          });
        }
      },
    },
  };

  return traceOperationMap(
    mergeOperationMaps(
      mergeOperationContracts(contracts, implementations),
      getCustomApiOperationDefinitions("manager"),
    ),
  );
};
