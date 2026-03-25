# Contributing to Constella Server

Thanks for contributing to the Constella backend. This repository contains the Node.js + TypeScript server, REST APIs, Yjs collaboration services, persistence, and deployment tooling.

## Before You Start

- Use Node.js `>=18.20.0`
- Use npm `>=9`
- Install dependencies with `npm install`
- Read [README.md](./README.md) for setup, runtime, and deployment context

## Local Development

Common commands:

- `npm run dev`: start the default development server
- `npm run dev:sqlite`: run the SQLite-oriented development mode
- `npm run build`: compile the production server
- `npm run test`: run tests
- `npm run test:coverage`: run tests with coverage
- `npm run lint`: run ESLint
- `npm run format:check`: verify formatting

Useful maintenance commands:

- `npm run check:db`
- `npm run diagnose:yjs`

## What We Expect in Contributions

- Keep changes focused and explain why they are needed.
- Avoid mixing unrelated refactors with behavior changes.
- Document API, auth, config, or deployment changes in the same pull request.
- Call out database, Yjs, or WebSocket behavior changes clearly.

## Backend Change Guidelines

When your change affects one of these areas, include extra context:

- REST API: describe request/response changes and compatibility impact
- Auth/session logic: explain token or authorization changes
- Database/configuration: explain migrations, schema assumptions, or config changes
- Collaboration/Yjs: explain room sync or websocket behavior changes

## Code Quality

Before opening a pull request, run:

- `npm run build`
- `npm run test`

Recommended when relevant:

- `npm run lint`
- `npm run format:check`

## Pull Request Guidelines

Please include:

- What changed
- Why it changed
- What area it affects: `api`, `auth`, `database`, `yjs`, `deploy`, `docs`, or `infra`
- How you tested it
- Any migration, config, or rollout considerations

## Issues

When reporting a backend bug, include:

- Reproduction steps
- Relevant endpoint or websocket path
- Expected vs actual behavior
- Logs or stack traces
- Environment details

## Security

Please do not report security issues publicly in GitHub issues. Use the process in [SECURITY.md](./SECURITY.md).
