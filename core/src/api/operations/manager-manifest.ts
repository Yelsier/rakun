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
  "manager.regenerateRoutes": {
    kind: "mutation",
    method: "post",
    path: "/manager/regenerateRoutes",
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
  "manager.auth.login": {
    kind: "mutation",
    method: "post",
    path: "/manager/auth/login",
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
