# `@rakun-kit/s3` AI usage manual

Use this package as Rakun's media adapter for AWS S3 or an S3-compatible object
store. Read the media section of
`node_modules/@rakun-kit/core/dist/docs/index.md` first.

## Install and configure

```sh
bun add @rakun-kit/s3
```

```ts
import { rakunBootstrap } from '@rakun-kit/core'
import { createS3MediaServiceConfig } from '@rakun-kit/s3'

rakunBootstrap({
  // other options
  media: createS3MediaServiceConfig({
    region: process.env.AWS_REGION!,
    publicBucket: process.env.RAKUN_PUBLIC_BUCKET!,
    privateBucket: process.env.RAKUN_PRIVATE_BUCKET!,
    baseUrl: '/api/rakun',
    publicBaseUrl: process.env.RAKUN_PUBLIC_MEDIA_URL,
    defaultAccess: 'private',
  }),
})
```

For compatible providers, set `endpoint` and, when required,
`forcePathStyle: true`. Credentials use the AWS SDK credential chain; keep them
in the server environment and never pass this config into browser modules.

## URL and access behavior

- Public and private objects use separate buckets.
- Uploads normally target Rakun's `/media/upload`, prefixed by `baseUrl`; set
  `uploadUrl` only to replace that endpoint entirely.
- Private reads return expiring presigned `GetObject` URLs.
- Public reads use `publicBaseUrl/key` when `publicBaseUrl` is set.
- `putExpiresInSeconds`, `getExpiresInSeconds` and `publicCacheControl` tune
  upload/read expiry and public caching.

Do not store generated presigned URLs as permanent content values. Preserve
Rakun media objects and let the adapter resolve current URLs. Ensure bucket CORS
and public access policies match the browser upload/read topology.

The only public entrypoint is `@rakun-kit/s3`; it exports `S3Adapter`,
`createS3MediaServiceConfig` and `S3MediaServiceConfig`.
