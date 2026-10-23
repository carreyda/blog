# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal full-stack blog and admin CMS: Nuxt 4 / Vue 3 / TypeScript frontend, Nitro server API, PostgreSQL + Prisma, Nuxt UI. The public site covers home, articles, tags, projects, bookmarks, and about pages; the admin area manages all of that content plus site settings. User-facing copy and API error messages are Chinese; identifiers and comments are English. Production is <https://carreyda.com>, deployed to Tencent Cloud by GitHub Actions.

## Commands

Requires Node.js 22+, pnpm 11.19.0, and PostgreSQL 16.

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start dev server (predev copies Vditor assets). Public: `:3000`, admin: `/admin`, health: `/api/health` |
| `pnpm build` | `prisma generate` + `nuxt build`; prebuild copies Vditor assets |
| `pnpm preview` | Preview the production build locally |
| `pnpm typecheck` | Nuxt/Vue TypeScript check — the only automated quality gate |
| `pnpm db:generate` | Regenerate Prisma Client |
| `pnpm db:migrate` | Create/apply a migration in development (`prisma migrate dev`) |
| `pnpm exec prisma migrate deploy` | Apply migrations in production |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm admin:init` | Create/update the admin account interactively (requires a TTY) |
| `node scripts/copy-vditor-assets.mjs` | Manually refresh `public/vendor/vditor` if the editor 404s |

There is no test suite and no linter configured. Run `pnpm typecheck` after changes; run `pnpm build` when touching Prisma schema, Nitro route wiring, or server auto-imports.

### Environment setup

Copy `.env.example` to `.env` (or run `.\scripts\configure-local-env.ps1` on Windows, which generates the secret). Required:

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — at least 32 bytes; auth fails with 503 if shorter
- `NUXT_PUBLIC_SITE_URL` — site origin; also drives cookie `secure` flag, CSRF origin checks, sitemap/robots

Then `pnpm db:generate && pnpm db:migrate && pnpm admin:init`.

## Architecture

### Layers

- `app/` — Nuxt 4 client app: pages, layouts, components, composables, plugins. Public pages use `layouts/default.vue`; `/admin` uses `layouts/admin.vue` (Nuxt UI dashboard shell) and `/admin/login` uses `layouts/admin-auth.vue`.
- `server/api/` — Nitro file-routed API. `server/api/admin/**` is the admin surface, everything else is public.
- `server/utils/` — auto-imported Nitro helpers: Prisma singleton, auth/session, markdown rendering, post serializers, settings, validation, rate limiting, `apiError`.
- `shared/schemas/` — Zod schemas shared by client forms and server validation; import as `#shared/schemas/<name>`.
- `prisma/` — schema and migrations. Prisma 7 uses the `@prisma/adapter-pg` driver adapter; the datasource URL is supplied by `prisma.config.ts`, not `schema.prisma`.
- `server/routes/` — non-API Nitro routes: `sitemap.xml`, `robots.txt`.

### Auth and the admin boundary

- Client-side: `app/middleware/admin.global.ts` guards `/admin/**`. It calls `/api/auth/session`, then caches `{ user, csrfToken }` in `useState('admin-session')` and redirects to `/admin/login` on failure.
- Server-side: `server/middleware/admin-auth.ts` requires a valid session for every `/api/admin/**` request, and for POST/PUT/PATCH/DELETE additionally enforces same-origin plus an `X-CSRF-Token` header.
- The admin client must send `X-CSRF-Token` from `useState('admin-session')` on every mutation (see `AdminPostForm.vue`, admin pages).
- Sessions live in the DB: the `blog_session` cookie holds a random token, only `sha256(token)` is stored, and the CSRF token is `HMAC-SHA256(SESSION_SECRET, "csrf:" + token)`. TTL is 7 days; expired/invalid sessions are deleted and the cookie cleared.
- Login protects itself with `requireSameOrigin` and an in-process failure limiter (10 failures / 15 min per IP and per username). The limiter is per-process and resets on restart — acceptable because PM2 runs a single instance.
- `event.context.auth` is populated by `requireAdmin` (typed in `server/types/h3.d.ts`).

### API contract and data access

- Success responses are `{ data: ... }`. Errors are `{ error: { code, message, fields? } }`, produced by `apiError(event, status, code, message, fields?)`. Use 201 on create and 204 for `/api/views`.
- Every request body is validated with `safeParse` against a `.strict()` Zod schema from `shared/schemas`; map issues with `zodFields(error)` into the `fields` object.
- Read projections and serializers are centralized so public and admin shapes don't leak into each other:
  - `publicPostListSelect` + `serializePublicPost` — strips `contentMarkdown`, flattens tags, adds `readingMinutes`; only `status: 'PUBLISHED'` rows are ever public.
  - `adminPostSelect` + `serializeAdminPost` — includes `contentMarkdown` and SEO fields.
- List endpoints return `{ data: { items, total, page, pageSize } }`; page size is clamped (10 public, 20 admin, max 50).
- Singleton rows: `SiteSetting` (id 1, JSON `SiteSettingValue`) with `defaultSettings` fallback, and `SiteStats` (id 1, `totalViews`). Settings updates replace the whole JSON value after Zod validation.
- `BookmarkCategory` is a self-referencing tree (two intended levels). The public endpoint builds the tree from flat rows and prunes empty branches; admin endpoints enforce parent existence and sibling-name uniqueness.
- `Tag.slug` is explicit user input (lowercase letters/digits/hyphens), not auto-derived.
- View counting is client-driven: `app/plugins/views.client.ts` POSTs `/api/views` on `page:finish` for every non-admin page, including a `postId` on `/blog/:id`. The endpoint transactionally increments `SiteStats.totalViews` and `Post.viewCount`.

### Markdown and the editor

- `server/utils/markdown.ts` is the single renderer: markdown-it → Shiki (`github-dark`) → `sanitize-html` allowlist. It injects stable heading IDs, builds the `toc` returned to article/about pages, and emits Mermaid fences as `<pre class="language-mermaid">`.
- Client-side `app/plugins/markdown-enhancements.client.ts` adds copy buttons and loads Mermaid from `/vendor/vditor/...`, re-rendering diagrams when color mode changes.
- The admin editor is `MarkdownEditor.client.vue` (Vditor, lazily imported by the admin layout) and is served from `public/vendor/vditor`, which is copied out of `node_modules` by `scripts/copy-vditor-assets.mjs` via the `predev`/`prebuild` hooks. That directory is gitignored — a fresh clone without a dev/build run will 404 the editor assets.

### Styling

- `app/assets/css/main.css` imports Tailwind v4 and Nuxt UI, defines the brand palette in `@theme`, and exposes the public site's CSS variables (`--color-*`, `--radius-*`). Public pages use scoped CSS and a monospace aesthetic.
- Admin styling is scoped in `app/layouts/admin.vue` using `--admin-*` variables with explicit `html.dark` overrides.
- Color mode is the three-state `system | light | dark` switcher (`ColorModeSwitcher.vue`); public pages and admin both react to it.

### Deployment

- Pushing `main` triggers `.github/workflows/deploy.yml`: rsync source → `pnpm install --frozen-lockfile` → `prisma migrate deploy` → `pnpm build` → PM2 reload → `/api/health` check. Do not push a change that fails the build.
- `ecosystem.config.cjs` runs `.output/server/index.mjs` on `127.0.0.1:3000` with `--env-file=.env`, single fork instance.
- Nginx terminates public HTTP(S); `deploy/nginx-blog.conf.example` is the reference. Full server setup is in `docs/DEPLOYMENT.md`.
- `docs/优化待办清单.md` tracks known issues (e.g. the Prisma singleton behavior in production, deployment lacking a typecheck gate). Check it before large refactors.

## Conventions

- Keep API handlers thin: parse/validate, delegate to a `server/utils` helper or a select/serializer pair, return the `{ data }` envelope.
- User-facing strings and validation messages are Chinese; identifiers, file names, and technical comments are English.
- Reuse `useAdminFeedback` for admin toasts and `useAdminConfirm` for destructive-action confirmation instead of ad-hoc alerts.
- Do not commit `.env`, `public/vendor/vditor`, `.nuxt`, `.output`, or `node_modules`.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **blog** (1053 symbols, 1648 relationships, 12 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/blog/context` | Codebase overview, check index freshness |
| `gitnexus://repo/blog/clusters` | All functional areas |
| `gitnexus://repo/blog/processes` | All execution flows |
| `gitnexus://repo/blog/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
