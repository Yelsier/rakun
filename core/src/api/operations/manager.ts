/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RakunOperationImplementationMap } from "./types";
import { mergeOperationContracts } from "./types";
import { createManagerOperationContracts } from "./manager-contract";
import { getCustomApiOperationDefinitions, mergeOperationMaps } from "./custom";
import { setSessionCookie } from "../sessionCookie";
import { throwAppError } from "../../lib/errors";
import { apiOperationsHandler } from "../routes/manager/apiOperations";
import { createBackupHandler } from "../routes/manager/backups/create";
import { listBackupsHandler } from "../routes/manager/backups/list";
import { restoreBackupHandler } from "../routes/manager/backups/restore";
import { contentTypesHandler } from "../routes/manager/contentTypes";
import { createHandler } from "../routes/manager/create";
import { deleteHandler } from "../routes/manager/delete";
import { trashHandler } from "../routes/manager/trash";
import { getHandler } from "../routes/manager/get";
import { listHandler } from "../routes/manager/list";
import { languagesHandler } from "../routes/manager/languages";
import { listMigrationsHandler } from "../routes/manager/migrations/list";
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
import { deleteSessionHandler } from "../routes/manager/auth/deleteSession";
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

export const createManagerOperationDefinitions = () => {
  const contracts = createManagerOperationContracts();
  const implementations: RakunOperationImplementationMap<typeof contracts> = {
    "manager.contentTypes": {
      resolve: async () => await contentTypesHandler(),
    },
    "manager.languages": {
      resolve: async () => await languagesHandler(),
    },
    "manager.regenerateRoutes": {
      resolve: async () => await regenerateRoutesHandler(),
    },
    "manager.create": {
      resolve: async ({ input, ctx }) => await createHandler({ input, ctx }),
    },
    "manager.update": {
      resolve: async ({ input, ctx }) => await updateHandler({ input, ctx }),
    },
    "manager.delete": {
      resolve: async ({ input, ctx }) => await deleteHandler({ input, ctx }),
    },
    "manager.trash": {
      resolve: async ({ input, ctx }) => await trashHandler({ input, ctx }),
    },
    "manager.get": {
      resolve: async ({ input, ctx }) => await getHandler({ input, ctx }),
    },
    "manager.list": {
      resolve: async ({ input, ctx }) => await listHandler({ input, ctx }),
    },
    "manager.setDefaultLanguage": {
      resolve: async ({ input, ctx }) =>
        await setDefaultLanguageHandler({ input, ctx }),
    },
    "manager.permissions": {
      resolve: async () => await permissionsHandler(),
    },
    "manager.backups.list": {
      resolve: async ({ ctx }) => await listBackupsHandler({ ctx }),
    },
    "manager.backups.create": {
      resolve: async ({ input, ctx }) =>
        await createBackupHandler({ input, ctx }),
    },
    "manager.backups.restore": {
      resolve: async ({ input, ctx }) =>
        await restoreBackupHandler({ input, ctx }),
    },
    "manager.migrations.list": {
      resolve: async ({ ctx }) => await listMigrationsHandler({ ctx }),
    },
    "manager.versions.list": {
      resolve: async ({ input, ctx }) =>
        await listVersionsHandler({ input, ctx }),
    },
    "manager.versions.get": {
      resolve: async ({ input, ctx }) =>
        await getVersionHandler({ input, ctx }),
    },
    "manager.versions.restore": {
      resolve: async ({ input, ctx }) =>
        await restoreVersionHandler({ input, ctx }),
    },
    "manager.apiOperations": {
      resolve: async () =>
        await apiOperationsHandler({ contracts, implementations }),
    },
    "manager.media.prepareUpload": {
      resolve: async ({ input, ctx }) =>
        await prepareUploadHandler({ input, ctx }),
    },
    "manager.media.finalizeUpload": {
      resolve: async ({ input, ctx }) =>
        await finalizeUploadHandler({ input, ctx }),
    },
    "manager.media.getUrl": {
      resolve: async ({ input, ctx }) =>
        await getMediaUrlHandler({ input, ctx }),
    },
    "manager.media.createFolder": {
      resolve: async ({ input, ctx }) =>
        await createFolderHandler({ input, ctx }),
    },
    "manager.media.listFolders": {
      resolve: async ({ input, ctx }) =>
        await listFoldersHandler({ input, ctx }),
    },
    "manager.media.deleteFolder": {
      resolve: async ({ input, ctx }) =>
        await deleteFolderHandler({ input, ctx }),
    },
    "manager.literals.list": {
      resolve: async ({ input, ctx }) =>
        await listLiteralsHandler({ input, ctx }),
    },
    "manager.literals.upsert": {
      resolve: async ({ input, ctx }) =>
        await upsertLiteralHandler({ input, ctx }),
    },
    "manager.auth.updatePassword": {
      resolve: async ({ input, ctx }) =>
        await updatePasswordHandler({ input, ctx }),
    },
    "manager.auth.login": {
      resolve: async ({ input }) => await loginHandler({ input }),
      onSuccess: ({ ctx, result }) => {
        if ("token" in result) {
          setSessionCookie(ctx, result.token);
        }
      },
    },
    "manager.auth.logout": {
      resolve: async ({ ctx }) => await logoutHandler({ ctx }),
      onSuccess: ({ ctx }) => {
        setSessionCookie(ctx, "", { maxAge: 0 });
      },
    },
    "manager.auth.getSession": {
      resolve: async ({ ctx }) => await getSessionHandler({ ctx }),
    },
    "manager.auth.accountInfo": {
      resolve: async ({ ctx }) => await accountInfoHandler({ ctx }),
    },
    "manager.auth.deleteSession": {
      resolve: async ({ input, ctx }) =>
        await deleteSessionHandler({ input, ctx }),
    },
    "manager.auth.totp.enroll": {
      resolve: async ({ ctx }) => {
        if (!enrollTotpHandler) {
          throwAppError("FEATURE_UNSUPPORTED", {
            feature: "TOTP enrollment",
          });
        }

        return await enrollTotpHandler({ ctx });
      },
    },
    "manager.auth.totp.confirm": {
      resolve: async ({ input, ctx }) => {
        if (!confirmTotpHandler) {
          throwAppError("FEATURE_UNSUPPORTED", {
            feature: "TOTP",
          });
        }

        return await confirmTotpHandler({ input, ctx });
      },
    },
    "manager.auth.totp.verify": {
      resolve: async ({ input }) => {
        if (!verifyTotpHandler) {
          throwAppError("FEATURE_UNSUPPORTED", {
            feature: "TOTP",
          });
        }

        return await verifyTotpHandler({ input });
      },
      onSuccess: ({ ctx, result }) => {
        if ("token" in result) {
          setSessionCookie(ctx, result.token);
        }
      },
    },
    "manager.auth.webauthn.register.options": {
      resolve: async ({ input, ctx }) => {
        if (!webauthnRegisterOptionsHandler) {
          throwAppError("FEATURE_UNSUPPORTED", {
            feature: "WebAuthn",
          });
        }

        return await webauthnRegisterOptionsHandler({ ctx, input });
      },
    },
    "manager.auth.webauthn.register.verify": {
      resolve: async ({ input, ctx }) => {
        if (!webauthnRegisterVerifyHandler) {
          throwAppError("FEATURE_UNSUPPORTED", {
            feature: "WebAuthn",
          });
        }

        return await webauthnRegisterVerifyHandler({ input, ctx });
      },
    },
    "manager.auth.webauthn.auth.options": {
      resolve: async ({ input }) => {
        if (!webauthnAuthOptionsHandler) {
          throwAppError("FEATURE_UNSUPPORTED", {
            feature: "WebAuthn",
          });
        }

        return await webauthnAuthOptionsHandler({ input });
      },
    },
    "manager.auth.webauthn.auth.verify": {
      resolve: async ({ input }) => {
        if (!webauthnAuthVerifyHandler) {
          throwAppError("FEATURE_UNSUPPORTED", {
            feature: "WebAuthn",
          });
        }

        return await webauthnAuthVerifyHandler({ input });
      },
      onSuccess: ({ ctx, result }) => {
        if ("token" in result) {
          setSessionCookie(ctx, result.token);
        }
      },
    },
  };

  return mergeOperationMaps(
    mergeOperationContracts(contracts, implementations),
    getCustomApiOperationDefinitions("manager"),
  );
};
