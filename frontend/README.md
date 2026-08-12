# FastSchema Dashboard

The source for FastSchema's administration dashboard. It is a TanStack Start application running in SPA mode so the production output can be embedded by the Go server under `/dash`.

## Development

Start a FastSchema backend on port `8000`, then run:

```bash
npm install
npm run dev
```

Open the URL printed by Vite. By default, Vite proxies `/api` and `/files`
to `http://127.0.0.1:8000`. To use another development backend, set
`VITE_API_PROXY_TARGET`; to bypass the proxy entirely, set
`VITE_API_BASE_URL`.

## Validation

```bash
npm run typecheck
npm run build
```

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
