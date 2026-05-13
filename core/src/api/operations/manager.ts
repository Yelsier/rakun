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
import { getMongoService } from "../../orm";
import { getLanguages } from "../utils/getLanguages";
import { regenerateAllRoutesMap } from "../utils/routes/updateRoutesMap";
import { checkRevalidatePath } from "../utils/routes/revalidatePath";
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
import { deleteFolderHandler } from "../routes/manager/media/deleteFolder";
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
    "manager.backups.list": {
      resolve: async ({ ctx }) => {
        Logger.addTrace("manager.backups.list: handler start");
        ctx.getUser();
        const db = await getMongoService();
        Logger.addTrace("manager.backups.list: mongo service ready");
        const backups = await db.backups.list();
        Logger.addTrace("manager.backups.list: handler success", {
          backups: backups.length,
        });
        return backups;
      },
    },
    "manager.backups.create": {
      resolve: async ({ input, ctx }) => {
        Logger.addTrace("manager.backups.create: handler start", {
          contentTypes: input.contentTypes,
          hasReason: !!input.reason,
        });
        const user = ctx.getUser();
        Logger.addTrace("manager.backups.create: user resolved", {
          userId: user._id,
        });
        const db = await getMongoService();
        Logger.addTrace("manager.backups.create: mongo service ready");
        const backup = await db.backups.create({
          ...input,
          actorId: user._id,
        });
        Logger.addTrace("manager.backups.create: handler success", {
          backupId: backup._id,
          documentCount: backup.documentCount,
        });
        return backup;
      },
    },
    "manager.backups.restore": {
      resolve: async ({ input, ctx }) => {
        Logger.addTrace("manager.backups.restore: handler start", {
          backupId: input.backupId,
          hasReason: !!input.reason,
        });
        const user = ctx.getUser();
        Logger.addTrace("manager.backups.restore: user resolved", {
          userId: user._id,
        });
        const db = await getMongoService();
        Logger.addTrace("manager.backups.restore: mongo service ready");
        const result = await db.backups.restore({
          ...input,
          actorId: user._id,
        });
        Logger.addTrace("manager.backups.restore: backup restored", {
          backupId: result.backup._id,
          safetyBackupId: result.safetyBackup._id,
          restoredCount: result.restoredCount,
        });
        await regenerateAllRoutesMap();
        Logger.addTrace("manager.backups.restore: routes regenerated");
        return result;
      },
    },
    "manager.migrations.list": {
      resolve: async ({ ctx }) => {
        Logger.addTrace("manager.migrations.list: handler start");
        ctx.getUser();
        const db = await getMongoService();
        Logger.addTrace("manager.migrations.list: mongo service ready");
        const migrations = await db.migrations.list();
        Logger.addTrace("manager.migrations.list: handler success", {
          states: migrations.states.length,
          migrations: migrations.migrations.length,
          pending: migrations.pending.length,
        });
        return migrations;
      },
    },
    "manager.versions.list": {
      resolve: async ({ input, ctx }) => {
        Logger.addTrace("manager.versions.list: handler start", {
          contentType: input.contentType,
          documentId: input.documentId,
        });
        ctx.getUser();
        const db = await getMongoService();
        Logger.addTrace("manager.versions.list: mongo service ready");
        const versions = await db.versions.list(input);
        Logger.addTrace("manager.versions.list: handler success", {
          versions: versions.length,
        });
        return versions;
      },
    },
    "manager.versions.get": {
      resolve: async ({ input, ctx }) => {
        Logger.addTrace("manager.versions.get: handler start", {
          versionId: input.versionId,
        });
        ctx.getUser();
        const db = await getMongoService();
        Logger.addTrace("manager.versions.get: mongo service ready");
        const version = await db.versions.get(input.versionId);
        Logger.addTrace("manager.versions.get: handler success", {
          found: !!version,
          contentType: version?.contentType,
          documentId: version?.documentId,
          revision: version?.revision,
        });
        return version;
      },
    },
    "manager.versions.restore": {
      resolve: async ({ input, ctx }) => {
        Logger.addTrace("manager.versions.restore: handler start", {
          versionId: input.versionId,
          hasReason: !!input.reason,
        });
        const user = ctx.getUser();
        Logger.addTrace("manager.versions.restore: user resolved", {
          userId: user._id,
        });
        const db = await getMongoService();
        Logger.addTrace("manager.versions.restore: mongo service ready");
        const result = await db.versions.restore({
          ...input,
          actorId: user._id,
        });
        Logger.addTrace("manager.versions.restore: version restored", {
          contentType: result.version.contentType,
          documentId: result.version.documentId,
          restoredRevision: result.restored._revision,
        });
        await checkRevalidatePath({
          contentType: result.version.contentType,
          contentTypeId: result.version.documentId,
          operation: "update",
        });
        Logger.addTrace("manager.versions.restore: revalidate done");
        return result;
      },
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
