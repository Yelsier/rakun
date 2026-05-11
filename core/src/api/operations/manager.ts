/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RakunOperationImplementationMap } from "./types";
import { mergeOperationContracts } from "./types";
import { createManagerOperationContracts } from "./manager-contract";
import { getCustomApiOperationDefinitions, mergeOperationMaps } from "./custom";
import { createWebOperationDefinitions } from "./web";
import { createApiOperationCatalog } from "./catalog";
import { setSessionCookie } from "../sessionCookie";
import { throwAppError } from "../../lib/errors";
import { Logger } from "../../lib/Logger";
import { getPermissionList } from "../../lib/Permissions";
import { getContentTypesForManager } from "../../lib/Registry";
import { getLanguages } from "../utils/getLanguages";
import { regenerateAllRoutesMap } from "../utils/routes/updateRoutesMap";
import { createHandler } from "../routes/manager/create";
import { deleteHandler } from "../routes/manager/delete";
import { getHandler } from "../routes/manager/get";
import { listHandler } from "../routes/manager/list";
import { setDefaultLanguageHandler } from "../routes/manager/setDefaultLanguage";
import { updateHandler } from "../routes/manager/update";
import { loginHandler } from "../routes/manager/auth/login";
import { enrollTotpHandler } from "../routes/manager/auth/totp/enrollTotp";
import { logoutHandler } from "../routes/manager/auth/logout";
import { updatePasswordHandler } from "../routes/manager/auth/updatePassword";
import { confirmTotpHandler } from "../routes/manager/auth/totp/confirmTotp";
import { verifyTotpHandler } from "../routes/manager/auth/totp/verifyTotp";
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
import { listLiteralsHandler } from "../routes/manager/literals/list";
import { upsertLiteralHandler } from "../routes/manager/literals/upsert";

export const createManagerOperationDefinitions = () => {
  const contracts = createManagerOperationContracts();
  const implementations: RakunOperationImplementationMap<typeof contracts> = {
    "manager.contentTypes": {
      resolve: async () => getContentTypesForManager(),
    },
    "manager.languages": {
      resolve: async () => await getLanguages(),
    },
    "manager.regenerateRoutes": {
      resolve: async () => {
        Logger.addTrace("manager.regenerateRoutes: handler start");
        await regenerateAllRoutesMap();
        Logger.addTrace("manager.regenerateRoutes: handler success");
        return { ok: true };
      },
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
      resolve: async () => getPermissionList(),
    },
    "manager.apiOperations": {
      resolve: async () => {
        const managerOperations = mergeOperationMaps(
          mergeOperationContracts(contracts, implementations),
          getCustomApiOperationDefinitions("manager"),
        );
        const coreOperations = {
          ...managerOperations,
          ...createWebOperationDefinitions(),
        };
        const operations = mergeOperationMaps(
          coreOperations,
          getCustomApiOperationDefinitions("unscoped"),
        );

        return createApiOperationCatalog(operations);
      },
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
      resolve: async ({ ctx }) => ctx.user || null,
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
