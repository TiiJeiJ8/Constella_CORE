# Constella Server

Backend service for Constella collaboration, including authentication, room management, assets, LAN discovery publishing, and Yjs relay.

[中文](./README.md) | [Frontend](https://github.com/TiiJeiJ8/Constella)

## Version

- Current server version: `1.0.1`

## Runtime Requirements

- Node.js: `22.12.0` (This applies to standalone server deployment; the Electron desktop app bundles its own Node runtime)
- npm: `>=9`

> [!NOTE]
> Since `v1.0.0`, the legacy `pkg`/`exe` packaging path is removed.
> Deploy and run JS runtime artifacts (`dist/`, `config/`, production dependencies) with Node.js.

## Current Capabilities

- Express API service with prefix `/api/v1`
- Health endpoint and discovery metadata
- Auth: register, login, refresh token
- Room lifecycle: create/list/detail/join/invite/permission update/delete
- Asset APIs: upload/list/delete under room scope
- Yjs websocket relay mounted in the same server process
- Room relay token generation for websocket auth
- LAN discovery publisher (Bonjour/mDNS)
- Database maintenance tasks (snapshots/tokens/orphan assets)

## Data & Persistence (Current)

- Business database: `memory` or `sqlite`
- Yjs persistence: `leveldb` or `memory`

## API / Network Basics

- HTTP base: `http://<host>:<port>/api/v1`
- Health: `GET /api/v1/health`
- Yjs websocket default path: `/ws`

## Config Loading Rule

Server config is loaded in this order:

1. `config/default.yaml`
2. `config/{NODE_ENV}.yaml` (if exists)
3. environment variables override file values

## JWT Secret (Packaged Distribution)

To prevent token forgery risks, the server no longer uses any hardcoded fallback JWT secret.

JWT secret resolution priority:

1. `JWT_SECRET` environment variable
2. `jwt.secret` in YAML config
3. user local runtime config `config.local.yaml`
4. if all above are missing or unsafe: generate a random secret on first run and persist it in user config

Default write path on Windows:

- `%APPDATA%/Roaming/Constella/config.local.yaml`

You can override the local config directory via `CONSTELLA_USER_CONFIG_DIR`.

Notes:

- In production, if no valid secret is provided and local persistence fails, startup will fail fast.
- Placeholder values like `your_jwt_secret_key` and `your_jwt_secret_key_change_in_production` are treated as unsafe and rejected.
- Test environment (`NODE_ENV=test`) still allows the testing secret to keep automated tests stable.

## Quick Start

```bash
cd server
npm install
npm run dev
```

## Production Run

```bash
npm run build
npm run start:prod
```

or:

```bash
node dist/server.js
```

## Docker

The repository currently ships a single `core` service in `docker-compose.yml`.

```bash
docker compose up -d
```

## Key Scripts

- `npm run dev` - development server
- `npm run dev:sqlite` - development with sqlite mode
- `npm run build` - compile TypeScript to `dist/`
- `npm run start` - start from `dist/server.js`
- `npm run start:prod` - production mode start

## Docs

- [API](./docs/API.md)
- [Error Codes](./docs/ERROR_CODES.md)
- [Room Settings](./docs/ROOM_SETTINGS.md)
- [Database](./docs/DATABASE.md)
- [Database Usage](./docs/DATABASE_USAGE.md)

## License

MIT
