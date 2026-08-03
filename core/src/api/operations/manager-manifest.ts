import type { createManagerOperationContracts } from "./manager-contract";
import type { RakunOperationManifestFromContracts } from "./types";

type ManagerOperationManifest = RakunOperationManifestFromContracts<
  ReturnType<typeof createManagerOperationContracts>
>;

export const managerOperationManifest = {
  "manager.contentTypes": {
    kind: "query",
    method: "get",
    path: "/manager/contentTypes",
  },
  "manager.contentType": {
    kind: "query",
    method: "post",
    path: "/manager/contentType",
  },
  "manager.languages": {
    kind: "query",
    method: "get",
    path: "/manager/languages",
  },
  "manager.uiLocales": {
    kind: "query",
    method: "get",
    path: "/manager/uiLocales",
  },
  "manager.regenerateRoutes": {
    kind: "mutation",
    method: "post",
    path: "/manager/regenerateRoutes",
  },
  "manager.routes.previewSlugRedirects": {
    kind: "query",
    method: "post",
    path: "/manager/routes/previewSlugRedirects",
  },
  "manager.create": {
    kind: "mutation",
    method: "post",
    path: "/manager/create",
  },
  "manager.duplicate": {
    kind: "mutation",
    method: "post",
    path: "/manager/duplicate",
  },
  "manager.update": {
    kind: "mutation",
    method: "post",
    path: "/manager/update",
  },
  "manager.delete": {
    kind: "mutation",
    method: "post",
    path: "/manager/delete",
  },
  "manager.trash": {
    kind: "mutation",
    method: "post",
    path: "/manager/trash",
  },
  "manager.get": {
    kind: "query",
    method: "post",
    path: "/manager/get",
  },
  "manager.template.get": {
    kind: "query",
    method: "post",
    path: "/manager/template/get",
  },
  "manager.template.update": {
    kind: "mutation",
    method: "post",
    path: "/manager/template/update",
  },
  "manager.list": {
    kind: "query",
    method: "post",
    path: "/manager/list",
  },
  "manager.favorites.list": {
    kind: "query",
    method: "post",
    path: "/manager/favorites/list",
  },
  "manager.favorites.toggle": {
    kind: "mutation",
    method: "post",
    path: "/manager/favorites/toggle",
  },
  "manager.notifications.list": {
    kind: "query",
    method: "post",
    path: "/manager/notifications/list",
  },
  "manager.notifications.markRead": {
    kind: "mutation",
    method: "post",
    path: "/manager/notifications/markRead",
  },
  "manager.reviewPolicies.list": {
    kind: "query",
    method: "get",
    path: "/manager/reviewPolicies/list",
  },
  "manager.reviewPolicies.upsert": {
    kind: "mutation",
    method: "post",
    path: "/manager/reviewPolicies/upsert",
  },
  "manager.reviewPolicies.delete": {
    kind: "mutation",
    method: "post",
    path: "/manager/reviewPolicies/delete",
  },
  "manager.reviews.get": {
    kind: "query",
    method: "post",
    path: "/manager/reviews/get",
  },
  "manager.reviews.candidates": {
    kind: "query",
    method: "post",
    path: "/manager/reviews/candidates",
  },
  "manager.reviews.request": {
    kind: "mutation",
    method: "post",
    path: "/manager/reviews/request",
  },
  "manager.reviews.decide": {
    kind: "mutation",
    method: "post",
    path: "/manager/reviews/decide",
  },
  "manager.reviews.cancel": {
    kind: "mutation",
    method: "post",
    path: "/manager/reviews/cancel",
  },
  "manager.routeLayout.get": {
    kind: "query",
    method: "post",
    path: "/manager/routeLayout/get",
  },
  "manager.routeLayout.setOverride": {
    kind: "mutation",
    method: "post",
    path: "/manager/routeLayout/setOverride",
  },
  "manager.contentVersions.list": {
    kind: "query",
    method: "post",
    path: "/manager/contentVersions/list",
  },
  "manager.contentVersions.create": {
    kind: "mutation",
    method: "post",
    path: "/manager/contentVersions/create",
  },
  "manager.contentVersions.promote": {
    kind: "mutation",
    method: "post",
    path: "/manager/contentVersions/promote",
  },
  "manager.localeVariants.list": {
    kind: "query",
    method: "post",
    path: "/manager/localeVariants/list",
  },
  "manager.localeVariants.create": {
    kind: "mutation",
    method: "post",
    path: "/manager/localeVariants/create",
  },
  "manager.localeVariants.assign": {
    kind: "mutation",
    method: "post",
    path: "/manager/localeVariants/assign",
  },
  "manager.localeVariants.unassign": {
    kind: "mutation",
    method: "post",
    path: "/manager/localeVariants/unassign",
  },
  "manager.localeVariants.setPrimary": {
    kind: "mutation",
    method: "post",
    path: "/manager/localeVariants/setPrimary",
  },
  "manager.localeVariants.trash": {
    kind: "mutation",
    method: "post",
    path: "/manager/localeVariants/trash",
  },
  "manager.localeVariants.restore": {
    kind: "mutation",
    method: "post",
    path: "/manager/localeVariants/restore",
  },
  "manager.users.mentions": {
    kind: "query",
    method: "get",
    path: "/manager/users/mentions",
  },
  "manager.comments.list": {
    kind: "query",
    method: "post",
    path: "/manager/comments/list",
  },
  "manager.comments.create": {
    kind: "mutation",
    method: "post",
    path: "/manager/comments/create",
  },
  "manager.comments.toggleReaction": {
    kind: "mutation",
    method: "post",
    path: "/manager/comments/toggleReaction",
  },
  "manager.comments.markRead": {
    kind: "mutation",
    method: "post",
    path: "/manager/comments/markRead",
  },
  "manager.comments.unreadCount": {
    kind: "query",
    method: "post",
    path: "/manager/comments/unreadCount",
  },
  "manager.setDefaultLanguage": {
    kind: "mutation",
    method: "post",
    path: "/manager/setDefaultLanguage",
  },
  "manager.permissions": {
    kind: "query",
    method: "get",
    path: "/manager/permissions",
  },
  "manager.logs.list": {
    kind: "query",
    method: "post",
    path: "/manager/logs/list",
  },
  "manager.logs.cleanup": {
    kind: "mutation",
    method: "post",
    path: "/manager/logs/cleanup",
  },
  "manager.backups.list": {
    kind: "query",
    method: "get",
    path: "/manager/backups/list",
  },
  "manager.backups.create": {
    kind: "mutation",
    method: "post",
    path: "/manager/backups/create",
  },
  "manager.backups.restore": {
    kind: "mutation",
    method: "post",
    path: "/manager/backups/restore",
  },
  "manager.migrations.list": {
    kind: "query",
    method: "get",
    path: "/manager/migrations/list",
  },
  "manager.versions.list": {
    kind: "query",
    method: "post",
    path: "/manager/versions/list",
  },
  "manager.versions.get": {
    kind: "query",
    method: "post",
    path: "/manager/versions/get",
  },
  "manager.versions.restore": {
    kind: "mutation",
    method: "post",
    path: "/manager/versions/restore",
  },
  "manager.translateDocument": {
    kind: "mutation",
    method: "post",
    path: "/manager/translateDocument",
  },
  "manager.preview.create": {
    kind: "mutation",
    method: "post",
    path: "/manager/preview/create",
  },
  "manager.apiOperations": {
    kind: "query",
    method: "get",
    path: "/manager/apiOperations",
  },
  "manager.media.prepareUpload": {
    kind: "mutation",
    method: "post",
    path: "/manager/media/prepareUpload",
  },
  "manager.media.finalizeUpload": {
    kind: "mutation",
    method: "post",
    path: "/manager/media/finalizeUpload",
  },
  "manager.media.reimport": {
    kind: "mutation",
    method: "post",
    path: "/manager/media/reimport",
  },
  "manager.media.getUrl": {
    kind: "query",
    method: "post",
    path: "/manager/media/getUrl",
  },
  "manager.media.createFolder": {
    kind: "mutation",
    method: "post",
    path: "/manager/media/createFolder",
  },
  "manager.media.listFolders": {
    kind: "query",
    method: "post",
    path: "/manager/media/listFolders",
  },
  "manager.media.deleteFolder": {
    kind: "mutation",
    method: "post",
    path: "/manager/media/deleteFolder",
  },
  "manager.literals.list": {
    kind: "query",
    method: "post",
    path: "/manager/literals/list",
  },
  "manager.literals.upsert": {
    kind: "mutation",
    method: "post",
    path: "/manager/literals/upsert",
  },
  "manager.auth.updatePassword": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/updatePassword",
  },
  "manager.auth.password.requestReset": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/password/requestReset",
  },
  "manager.auth.password.reset": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/password/reset",
  },
  "manager.auth.login": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/login",
  },
  "manager.auth.external.start": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/external/start",
  },
  "manager.auth.external.complete": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/external/complete",
  },
  "manager.auth.ipBlocks.list": {
    kind: "query",
    method: "get",
    path: "/manager/auth/ipBlocks/list",
  },
  "manager.auth.ipBlocks.unblock": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/ipBlocks/unblock",
  },
  "manager.auth.logout": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/logout",
  },
  "manager.auth.getSession": {
    kind: "query",
    method: "get",
    path: "/manager/auth/getSession",
  },
  "manager.auth.accountInfo": {
    kind: "query",
    method: "get",
    path: "/manager/auth/accountInfo",
  },
  "manager.auth.updateAccount": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/updateAccount",
  },
  "manager.auth.updateTutorialPreferences": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/updateTutorialPreferences",
  },
  "manager.auth.markTourSeen": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/markTourSeen",
  },
  "manager.auth.deleteSession": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/deleteSession",
  },
  "manager.auth.totp.enroll": {
    kind: "query",
    method: "get",
    path: "/manager/auth/totp/enroll",
  },
  "manager.auth.totp.confirm": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/totp/confirm",
  },
  "manager.auth.totp.verify": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/totp/verify",
  },
  "manager.auth.mfa.verifyRecoveryCode": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/mfa/verifyRecoveryCode",
  },
  "manager.auth.mfa.regenerateRecoveryCodes": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/mfa/regenerateRecoveryCodes",
  },
  "manager.auth.webauthn.register.options": {
    kind: "query",
    method: "post",
    path: "/manager/auth/webauthn/register/options",
  },
  "manager.auth.webauthn.register.verify": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/webauthn/register/verify",
  },
  "manager.auth.webauthn.auth.options": {
    kind: "query",
    method: "post",
    path: "/manager/auth/webauthn/auth/options",
  },
  "manager.auth.webauthn.auth.verify": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/webauthn/auth/verify",
  },
} satisfies ManagerOperationManifest;
