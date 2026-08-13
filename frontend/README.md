# FastSchema Dashboard

The source for FastSchema's administration dashboard. It is a TanStack Start application running in SPA mode so the production output can be embedded by the Go server under `/dash`.

## Development

Install dependencies and start the API and dashboard together:

```bash
npm install
npm run dev:stack
```

Open <http://localhost:5000/dash/>. If the API is already running, use `npm run dev` instead. By default, Vite proxies `/api` and `/files`
to `http://127.0.0.1:8000`. To use another development backend, set
`VITE_API_PROXY_TARGET`; to bypass the proxy entirely, set
`VITE_API_BASE_URL`.

## Internationalization

The dashboard uses Paraglide JS with `zh-CN` and `en` message catalogs. The browser's preferred language is used on the first visit, and manual selections are stored in the `FASTSCHEMA_LOCALE` cookie.

- Edit translations in `messages/zh-CN.json` and `messages/en.json`.
- Run `npm run i18n:compile` to regenerate the type-safe message functions.
- Import messages with `import { m } from '../paraglide/messages.js'`.

Generated files under `src/paraglide/` are ignored because the Vite plugin and the typecheck script rebuild them automatically.

## Validation

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test:e2e:install
npm run test:e2e
```

The Playwright suite starts an isolated API on port `18080`, performs the first-admin setup flow, and removes its temporary database afterward.

## Embed the dashboard

```bash
npm run build:embed
```

This builds the SPA and atomically replaces the repository's `dash/` bundle. The Go embed directive in `init.go` serves that directory.

## Routes

- `/dash/login` and `/dash/setup`
- `/dash/` dashboard
- `/dash/content/:schemaName` dynamic content management
- `/dash/files` media library
- `/dash/schemas` schema management
- `/dash/users` user management
- `/dash/roles` role and permission management
