import type { MediaAccess, StorageAdapter } from "./adapters";
import {
  createMediaServiceFromAdapter,
  type MediaService,
} from "./mediaService";

export type MediaServiceConfig = {
  adapter: StorageAdapter;
  defaultAccess?: MediaAccess;
  defaultGetExpiresInSeconds?: number;
  uploadUrl?: string;
};

let _mediaService: MediaService;
let _config: MediaServiceConfig;

export const createMediaConnection = (config: MediaServiceConfig) => {
  _config = config;
};

export function createMediaService(config: MediaServiceConfig): MediaService {
  _config = config;

  _mediaService = createMediaServiceFromAdapter({
    adapter: config.adapter,
    defaultAccess: config.defaultAccess,
    defaultGetExpiresInSeconds: config.defaultGetExpiresInSeconds,
    uploadUrl: config.uploadUrl,
  });

  return _mediaService;
}

export function getMediaService(): MediaService {
  if (!_mediaService) {
    if (!_config) {
      throw new Error(
        "Media service not initialized. Call createMediaConnection first.",
      );
    }

    return createMediaService(_config);
  }

  return _mediaService;
}

export * from "./mediaService";
export * from "./adapters";
export * from './publicMedia'
