# wassimo-payment — agent guide

Read this first in every session. Progress table + rules below are the
working contract with Ahmed; the roadmap lives in `steps/payment/`
(00-setup … 29-e2e-verify, one feature per step, every step has Goal /
Concepts / Build / Verify / Commit / Gotchas).

## Progress (update this table as steps complete — never skip ahead)

| step | status |
|------|--------|
| 00-setup, 01-docker, 02-typeorm, 03-organization | done and committed |
| 04-currency | done and committed (service helpers included as of the "Add currency service" commit) |
| 05-applications | NEXT |
| 06-api-credentials … 29-e2e-verify | not started |

A step is NOT done until its own doc's Verify section passes and the
commit is made. Never start the next step while the current one is
mid-flight.

## How Ahmed wants to work (micro-steps — non-negotiable)

- One edit per message: one file, ideally one function/block. Never
  multi-file dumps, never the whole task at once.
- Verify each piece immediately (`npx tsc --noEmit`, or the step drill)
  before showing the next piece.
- Reviews when AHMED wrote the code: real bugs first, then what was
  done well, then naming/message inconsistencies — even harmless ones —
  because agreed naming becomes a contract for later files.
- Ahmed decides bug-fixes and naming; ask, don't overwrite taste.
- Ahmed said: "do not complete a step until it is fully working."
- Explanations: simple words (the `caveman` skill exists for this —
  short sentences, everyday pictures, one code term per paragraph).
  Ahmed says "normal now" to exit that style.

## Repo contracts (established during steps 00-04 — keep or consciously change)

- ESM repo: `"type": "module"`, `moduleResolution: nodenext`,
  `rewriteRelativeImportExtensions: true`.
- Source imports use `.ts` specifiers (compiler rewrites to `.js` on
  emit) — EXCEPT runtime globs naming compiled output, which use `.js`
  (e.g. the entity glob in `app.module.ts`).
- Migration files MUST start `import type { MigrationInterface,
  QueryRunner } from 'typeorm';` — interfaces are compile-time only;
  Node's type-stripping CLI runtime rejects plain imports.
- No comments in application code. Names carry meaning. If a name
  needs a paragraph, rename instead of annotating.
- Only `src/config/configuration.ts` reads `process.env`; everything
  else gets injected `APP_CONFIG` (validated at boot, fail-loud).
- `synchronize: false` everywhere, both configs.
- Money is integer minor units, never floats. Column style so far:
  `VARCHAR(255)` for varchar-ish fields, `TIMESTAMPTZ` for time.
- Config data (the wassimo org seed, the wassimo-order application) is
  seeded INSIDE the migration — schema and required config travel
  together; revert+run always lands in a consistent world.
- Entity property names are camelCase; DB columns stay snake_case;
  the `@Column({ name: '...' })` line is the bridge.

## Migration workflow (entity-first, from step 05 on)

1. Scaffold: `nest g module <name>` + `nest g service <name>` (delete the
   auto-generated `*.service.spec.ts` — no tests for now)
2. Write the ENTITY first (`<name>/<thing>.entity.ts`)
3. `npx tsc` (builds `dist/`)
4. `npm run migration:generate -- src/db/migrations/<Name>` (entities read
   from compiled `dist/**/*.entity.js` — run `npx tsc` FIRST, see cache trap)
5. Hand-edit the generated file before running: change the import line to
   `import type { MigrationInterface, QueryRunner } from 'typeorm';`,
   then hand-add seed/config INSERTs (generate only produces DDL)
6. Review → `npm run migration:run` → psql check from the step doc
7. `npm run migration:revert && npm run migration:run` once to prove
   the seeds round-trip (the ProofOfRunner drill)
8. Wire module into `AppModule.imports`, boot the container, verify,
   commit (human-readable message, no `feat:` prefixes), stage named
   paths only, never `git add -A`, confirm `.env` is NOT staged

## Environment facts (all discovered the hard way — trust them)

- Plain `npx tsc` and `nest build` must share the emit layout: BOTH
  tsconfig.json and tsconfig.build.json carry `rootDir: ./src` and
  `include: ["src"]`. Without it, `tsc` writes `dist/src/...` while
  `nest build` writes `dist/...` — `migration:generate`'s
  `dist/**/*.entity.js` glob then reads a STALE file and diffs against
  the wrong schema (this cost an afternoon). Also: `incremental` cache
  (`*.tsbuildinfo`) can lie — if dist looks stale, delete the
  tsbuildinfo or `rm -rf dist` and rebuild before generate.
- vitest IS the scaffold's test runner (Nest 12 ships vitest configs;
  every `nest g service` generates a `*.service.spec.ts`). Ahmed runs
  NO tests for now — generated spec files are simply removed; if tests
  return, stub any injected repo with
  `{ provide: getRepositoryToken(SomeEntity), useValue: {} }`.

- `ts-node` is a PEER dependency of `typeorm-ts-node-commonjs`
  (installed already, dev-dep).
- typeorm CLI 1.1.2: `migration:create` takes a bare PATH (no
  extension, no `-d`, add `--esm`); the script in package.json is
  already correct.
- Postgres 18 images need the volume mounted at `/var/lib/postgresql`
  (NOT `.../data`) — all services follow this.
- Node's type-stripping (`node .ts`) chokes on TS *decorators* —
  entity files can't be executed raw. That is why the CLI
  `data-source.ts` points its entities glob at COMPILED
  `dist/**/*.entity.js` (decorators already transformed at emit).
- Windows bind mounts: the container's `nest start --watch` often goes
  deaf to host file changes. `docker compose restart payment` after
  edits; sometimes `docker compose run --rm payment npm install` after
  package.json changes (stale `payment-nodemodules` volume).
- `EADDRINUSE :8080` during `npm run start:dev` = the port is
  already bound (another instance running) — not a code bug.
- Service DBs: payment-db on 5444, `docker compose ps -q payment-db`
  + `docker exec ... psql -U payment -d payment_db` is the drill.
- `/health` = liveness, never gains dependency checks; `/ready` = real
  DB check, throws 503 honestly; compose healthcheck probes `/ready`.

## Definition of the "fully completed project"

Steps 00-29 all done: real payment flows end-to-end (API-key public
API, hosted checkout, PayTabs sandbox, RabbitMQ outbox → order
consumer, refunds, expiry, prod image, gateway wiring, full e2e
drill). "Data and tables" is not done — working endpoints and flows
are. Follow `steps/payment/README.md`'s map for the whole system.
