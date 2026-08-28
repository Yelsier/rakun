# @rakun-kit/s3

S3 storage adapter for Rakun media.

## Usage

Use `createS3MediaServiceConfig` in `rakunBootstrap`:

```ts
import { rakunBootstrap } from "@rakun-kit/core";
import { createS3MediaServiceConfig } from "@rakun-kit/s3";

rakunBootstrap({
  // ...
  media: createS3MediaServiceConfig({
    region: process.env.AWS_REGION!,
    publicBucket: process.env.RAKUN_PUBLIC_BUCKET!,
    privateBucket: process.env.RAKUN_PRIVATE_BUCKET!,
    baseUrl: "/api/rakun",
    defaultAccess: "private",
  }),
});
```

For S3-compatible services, pass `endpoint` and optionally `forcePathStyle`:

```ts
media: createS3MediaServiceConfig({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT!,
  forcePathStyle: true,
  publicBucket: "rakun-public",
  privateBucket: "rakun-private",
});
```

## Options

```ts
type S3MediaServiceConfig = {
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  publicBucket: string;
  privateBucket: string;
  baseUrl?: string;
  uploadUrl?: string;
  publicBaseUrl?: string;
  publicCacheControl?: string;
  putExpiresInSeconds?: number;
  getExpiresInSeconds?: number;
  defaultAccess?: MediaAccess;
};
```

Behavior:

- public media uses `publicBucket`.
- private media uses `privateBucket`.
- uploads use Rakun's `/media/upload` endpoint, prefixed by `baseUrl` when provided.
- pass `uploadUrl` to override the upload endpoint completely.
- private reads use presigned `GetObject` URLs.
- public reads use a stable Rakun proxy URL at `baseUrl/media/public/<key>` by
  default. The S3 bucket may remain private: Rakun reads it with server
  credentials and streams the object with its cache and range metadata.
- pass `publicBaseUrl` to use a CDN or another public origin instead of the
  Rakun proxy.

## Exports

- `S3Adapter`
- `createS3MediaServiceConfig`
- `S3MediaServiceConfig`

## Build

```sh
bun run build --workspace @rakun-kit/s3
```
