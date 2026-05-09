# @rakun-kit/preview

Local preview app for developing `@rakun-kit/manager-react`.

It runs:

- an Express Rakun API from `server/index.ts`.
- a Vite React app from `src/main.tsx`.
- aliases that point Vite directly at `../manager-react/src` and `../core/src`.

That means UI edits in `manager-react/src/**/*.tsx` hot reload without building
`@rakun-kit/manager-react`.

## Setup

```sh
cp preview/.env.example preview/.env
bun install
bun run preview
```

Open:

```txt
http://localhost:5173/backend
```

Default seeded login:

```txt
admin@example.com
admin123
```

## Environment

`preview/.env`:

```txt
MONGO_URI=mongodb://localhost:27017/rakun_preview
PORT=4100
VITE_PORT=5173
API_BASE_PATH=/api/rakun
MANAGER_BASE_PATH=/backend
RAKUN_MEDIA_DIR=.rakun/media
RAKUN_MEDIA_TOKEN_SECRET=dev-local-token-secret
SEED_PREVIEW=true
PREVIEW_ADMIN_EMAIL=admin@example.com
PREVIEW_ADMIN_PASSWORD=admin123
PREVIEW_ADMIN_NAME=Preview Admin
```

## Scripts

```sh
bun run preview
bun run preview:api
bun run preview:web
```

From inside `preview`:

```sh
bun run dev
bun run dev:api
bun run dev:web
```
