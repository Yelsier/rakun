# @rakun/s3

S3 storage adapter for Rakun media.

## Usage

Use `createS3MediaServiceConfig` in `rakunBootstrap`:

```ts
import { rakunBootstrap } from "@rakun/core";
import { createS3MediaServiceConfig } from "@rakun/s3";

rakunBootstrap({
  // ...
  media: createS3MediaServiceConfig({
    region: process.env.AWS_REGION!,
    publicBucket: process.env.RAKUN_PUBLIC_BUCKET!,
    privateBucket: process.env.RAKUN_PRIVATE_BUCKET!,
    publicBaseUrl: process.env.RAKUN_PUBLIC_MEDIA_URL,
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
- uploads use presigned `PutObject` URLs.
- private reads use presigned `GetObject` URLs.
- public reads return `publicBaseUrl/key` when `publicBaseUrl` is configured.

## Exports

- `S3Adapter`
- `createS3MediaServiceConfig`
- `S3MediaServiceConfig`

## Build

```sh
npm run build --workspace @rakun/s3
```
