# Admin Mission Control UI — Coding Guidelines

## Stack
- React 18 + TypeScript + Vite
- shadcn/ui + Tailwind CSS + Radix UI
- React Query for data fetching
- React Router v6 for routing

## TypeScript Rules
- Strict mode enabled — no `// @ts-ignore` or `// @ts-nocheck`
- Avoid `any` — use `unknown` and narrow, or define proper types
- All components must be functional (no class components)
- Use explicit return types on exported functions

## Architecture Rules
- **No hardcoded secrets** — no AWS account IDs, ARNs, pool IDs, or regions in source
- **No `import.meta.env` in components** — always import from `@/config`
- **No direct Cognito/OIDC imports outside `src/auth/adapters/`** — use `useAuth()` hook
- Runtime config via `window.__CONFIG__` (injected by Docker entrypoint)

## File Conventions
- Pages in `src/pages/`, one component per file
- Shared UI in `src/components/ui/` (shadcn)
- Business components in `src/components/`
- Auth layer in `src/auth/` — adapter pattern
- API client in `src/api/client.ts`

## Commands
- `npm run dev` — start dev server
- `npm run build` — typecheck + build
- `npm run typecheck` — TypeScript only
