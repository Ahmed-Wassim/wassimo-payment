# Architecture review — wassimo-payment

Date: 2026-11-14. Written after a full tree read, module line counts, lint run,
and targeted checks of every claim below. Nothing in this document changes
runtime behavior; it is a record of the review + the agreed follow-up work.

---

## 1. The structure as it stands

Feature-module (vertical-slice) layout, one folder per business concept:

```
src/
  app.module.ts            wiring root, forRootAsync here
  main.ts                  bootstrap, global ValidationPipe + ApiErrorFilter
  common/                  shared kernel: ApiError, error codes, filter, FilterDto, is-uuid
  config/                  env.validation (Joi, once) → loadConfig → APP_CONFIG
  db/                      data-source.ts (migration CLI) + migrations/
  database/                seed.ts + seeders/
  health/                  /health + /ready
  <module>/                one folder per business concept:
    <thing>.entity.ts  dto/  service  controller  module  model
  providers/               adapter port + adapters/mock + adapters/paytabs + factory
  payments/                charge.service, resolution.service, return.controller, states
  auth/                    guards for BOTH planes + session auth
```

Module sizes (lines): providers 1587, payments 808, users 667, db(migrations) 605,
credentials 352, applications 341, organizations 306, auth 315, webhooks 296,
currencies 285, customers 217, idempotency 126, others small.

### Verdict

The structure is **right for this product**. Specifically good:

1. **Boundaries follow business concepts, not technical layers.** Tenancy rules
   live where the data lives; each module scopes its own queries.
2. **The two auth planes are physically separated** in code paths even though
   the guards share one folder — machine (`ApiKeyGuard` + `AuthContext`) and
   merchant (`JwtGuard` + `PermissionGuard` + `ActorContext`) never cross.
3. **payments is decomposed by lifecycle** (charge / resolution / return / states),
   not one god-service. This is the hardest module and it stays readable.
4. **providers is already half-hexagonal without being told to be**:
   `adapter.ts` behaves as a port, `adapters/paytabs` as an adapter,
   `payment-provider.factory` as the composition root that decrypts
   credentials and binds account config.
5. **common/ is a tight kernel** (114 lines) — error vocabulary, filter,
   shared FilterDto, is-uuid. No junk drawer.

The problems found are inconsistencies and small duplications — cheap to fix,
none require moving folders around at scale. Sections 5–7 are the full list.

---

## 2. Five candidate architectures (the discussion)

### 2.1 Feature modules / vertical slices — CURRENT

One folder per business concept; entity, DTOs, service, controller, mapper,
module inside it; genuinely shared code goes to `common/`.

```
src/
  app.module.ts
  main.ts
  common/                  api-error, error-codes, filter, FilterDto, is-uuid
  config/                  env.validation, configuration, APP_CONFIG
  db/                      data-source + migrations
  health/                  /health /ready
  payments/
    entities/  dto/  states.ts  charge.service  resolution.service
    payments.controller  return.controller  payments.module
  customers/
    entities/  dto/  mappers/  service  controller  module
  users/  organizations/  applications/  credentials/
  currencies/  providers/  options/  idempotency/  webhooks/  permissions/
  auth/                    guards for both planes + session auth
```

- **Fit:** excellent. The product is a set of tenanted resources plus one
  payment flow; the folders map 1:1 to that. Nest loads modules natively,
  no ceremony.
- **Tradeoffs:** dependency direction between modules must be watched by
  hand (`payments → customers` is fine; cycles need `forwardRef`, which
  organizations already does). Nothing enforces layer discipline *inside*
  a module — that is what the naming grammar (entities/, dto/, mappers/)
  is for.

### 2.2 Classic layered

Top-level `controllers/`, `services/`, `repositories/`, `entities/`.

```
src/
  app.module.ts
  main.ts
  controllers/             ALL controllers flat: payments, customers, roles...
  services/                ALL services flat
  repositories/            ALL repo access flat
  entities/                ALL entities flat
  dto/                     ALL DTOs flat
  guards/  filters/  config/  migrations/
```

- **Fit:** poor. Payment logic, adapter logic, and role CRUD would interleave
  in four giant technical folders. Touching one feature means crossing four
  folders; deleting a feature is never clean.
- **Verdict:** not recommended, at any stage of this project.

### 2.3 Hexagonal (ports and adapters)

Domain core depends only on `ports/` (interfaces); `adapters/` implement them
(paytabs, mock, and in principle the DB itself).

```
src/
  app.module.ts
  main.ts
  domain/                  pure business rules, no framework imports
    payment/               states.ts, transitions, money rules
    tenant/                organization, application rules
  ports/                   interfaces the core owns
    payment-provider.port.ts        (today's adapter.ts)
    webhook-verification.port.ts
    repository ports per aggregate
  adapters/
    http/                  controllers + DTOs + guards (the driving side)
    providers/             mock/  paytabs/  paymob/  payfort/
    persistence/           TypeORM entities + repositories (driven side)
    webhooks/              raw webhook intake implementing the port
  config/  common/  db/
```

Note the inversion vs layered: dependencies point INWARD — adapters know the
ports, the core knows nothing about adapters.

- **Fit:** the provider side *already is this*, de facto. Formalizing it
  means: declare `adapter.ts` the only seam through which external payment
  worlds are touched, forbid provider branching above adapters (already the
  rule), and put webhook verification behind the same port shape.
- **Tradeoffs:** applying it to plain tenanted CRUD (currencies, roles,
  organizations) is pure ceremony — an interface with exactly one
  implementation is a tax, not safety.
- **Verdict:** keep as the *provider-plane* pattern only; do not generalize
  to CRUD.

### 2.4 Clean Architecture / DDD-style

`domain/ application/ infrastructure/ presentation/`, use-case classes per
operation, entities free of framework imports.

```
src/
  app.module.ts
  main.ts
  domain/
    payments/              Payment entity, PaymentStatus, transition rules
    customers/             Customer entity, invariants
    tenancy/               Organization, Application, credential policies
  application/
    payments/              CreatePayment, ChargePayment, ResolvePayment (use-cases)
    customers/             SnapshotCustomer, ListCustomers
    webhooks/              ProcessProviderWebhook
  infrastructure/
    typeorm/               entities, repositories, data-source, migrations
    providers/             mock/ paytabs/ (implementing application interfaces)
    config/  auth/         guards, JWT, api keys
  presentation/
    http/                  controllers, DTOs, global pipes/filters
```

The use-case class per operation is the distinguishing cost: `CreatePayment`
class + interface + DTO just to do what `payments.service.createInTx` does in
one method today.

- **Fit:** low. Fights Nest's DI ergonomics, and the strongest benefit
  (framework-independent domain) buys nothing here — TypeORM entities ARE
  the domain rows, and the house convention keeps them simple.
- **Verdict:** overkill for a solo, micro-step workflow.

### 2.5 CQRS-lite (command/query split)

Separate write handlers (strict, transactional, guarded) from read models
(flat queries, possibly raw SQL, shape-driven).

```
src/
  modules/
    payments/
      domain/              entities, states, transitions
      commands/            create-payment.command.ts, charge.command.ts,
                           resolve.command.ts   (transactional writes)
      queries/             get-payment.query.ts, list-payments.query.ts
                           (flat reads, own SQL, own shapes)
      infrastructure/      repos, idempotency glue
    customers/
      commands/            snapshot-customer.command.ts
      queries/             list-customers.query.ts, get-customer.query.ts
    ...same shape per module
  common/  config/  db/
```

Reads may skip the entities entirely (a query returns exactly the response
shape, straight SQL). Writes keep the strict service/transaction path.

- **Fit:** matches the actual access pattern: writes are few, strict, and
  money-critical (`create/charge/resolve/webhook`); reads are the growing
  surface (list/show/filter with mappers). If list endpoints ever need
  speed or flat shapes, reads can fork without touching writes.
- **Tradeoffs:** two vocabularies for everything; pays off only when read
  and write shapes genuinely diverge. Premature today.
- **Verdict:** keep in the back pocket. The mapper layer being introduced
  (section 4) is exactly the seam CQRS-lite would later formalize.

### 2.6 Ahmed's variant — infra at root, business under `modules/` (PROPOSED 2026-11-14)

Same feature-module architecture inside; the top of the tree is reorganized
so infra and product are visually separate. `db/` + `database/` merge.

```
src/
  app.module.ts            stays at root (Nest convention)
  main.ts
  common/                  shared kernel
  config/                  env.validation, configuration, APP_CONFIG
  db/                      data-source.ts, migrations/, seeders/   (merged)
  health/                  infra probe, not product — stays at root
  modules/
    payments/
      entities/  dto/  mappers/  states.ts  charge.service
      resolution.service  payments.controller  return.controller
      payments.module
    customers/
      entities/  dto/  mappers/  service  controller  module
    auth/                  guards (both planes) + session auth
    users/  organizations/  applications/  credentials/
    currencies/  providers/  options/  idempotency/  webhooks/  permissions/
```

**What moves into `modules/`:** the 13 business modules (payments, customers,
auth, users, organizations, applications, credentials, currencies, providers,
options, idempotency, webhooks, permissions).
**What stays at root:** `app.module.ts`, `main.ts`, `common/`, `config/`,
`db/` (migrations + seeders merged), `health/`.

Tradeoffs:

- **For:** the root tells the story at a glance — infra vs product; adding
  module 14+ never clutters src root; matches the mental model
  "modules = the product, root = the engine".
- **Against:** one more `../` in cross-module imports
  (`../../modules/payments/...`) — cosmetic; and the move touches nearly
  every file, so it MUST be one pure-rename commit (moves only, zero logic
  edits) or the diff is unreviewable.
- **Technical risk: near zero.** Entity globs are recursive
  (`**/*.entity.js`) so deeper entity paths still match; `tsconfig`
  `rootDir: ./src` unaffected; `data-source.ts` migration glob stays
  `src/db/migrations/*.ts`.

### Recommendation

**Adopt 2.6** (Ahmed's variant): feature modules, re-rooted. Borrow hexagonal
vocabulary only in `providers/` (already true in behavior — make it true in
name when the Paymob/PayFort adapters land). Treat the `mappers/` layer as
the future CQRS-lite seam. No folder migration beyond the one `modules/`
move; nothing else from 2.2–2.5.

---

## 3. Mappers: `*.model.ts` → `mappers/` (decision + why)

Today every module has `<thing>.model.ts` mixing TWO concerns:

1. the **shape** sent to API consumers (class/interface)
2. the **mapping function** that converts an entity row into that shape

Agreed direction: split them, one mapper per file, in a `mappers/` folder —
same grammar as `entities/` and `dto/`:

```
src/customers/mappers/customer.mapper.ts
  → exports CustomerModel (shape) + toCustomerModel(row) (function)

src/payments/mappers/payment.mapper.ts
  → exports PaymentModel + toPaymentModel(...)

src/organizations/mappers/organization.mapper.ts
src/applications/mappers/application.mapper.ts
src/credentials/mappers/credential.mapper.ts
src/currencies/mappers/currency.mapper.ts
src/providers/mappers/provider.mapper.ts
src/providers/mappers/provider-account.mapper.ts
src/users/mappers/user.mapper.ts
src/users/mappers/permission.mapper.ts   (moves to permissions/ — see §6.3)
```

Tradeoffs, honestly:

- **For:** one obvious file answers "where is the payment response built";
  no mixed concerns; the folder grammar becomes uniform
  (`entities/`, `dto/`, `mappers/`); grep-friendly and rename-safe.
- **Against:** ~10 new files, import-path churn in every controller,
  zero behavior change.

Naming convention to settle while moving (Ahmed's vote needed):

- Type name: `CustomerModel` (current majority) vs `PaymentPublicModel`
  (payments' outlier). Recommend standardizing on **`<Thing>Model`** and
  renaming `PaymentPublicModel` → `PaymentModel` in the same commit as the
  mapper move (the React console consumes JSON field names, not TS type
  names, so this is a codebase-only rename).

---

## 4. The customer shape: one source, three copies today

The 8-field customer snapshot (`name, email, phone, street, city, state,
country, zip`) is currently written out in three places:

| place | file | role |
|---|---|---|
| input validation | `src/payments/dto/customer-details.dto.ts` | DTO class (class-validator) — must stay |
| adapter port | `src/providers/adapter.ts` `CheckoutCustomer` | machine-plane contract — must stay |
| response echo | `src/payments/payment.model.ts` inline anonymous type | **duplicate — should die** |

Plan: the customers module owns ONE plain type, `CustomerDetails`
(suggested home: `src/customers/customer-details.ts`, or exported from
`mappers/customer.mapper.ts`). The DTO keeps its validators but extends from
/ mirrors it; `CheckoutCustomer` becomes `import type { CustomerDetails }`;
the payment mapper's `customer_details` field is typed
`CustomerDetails | null` — the inline object literal is deleted.

After this, adding a field is a one-file change, not a three-file hunt.

---

## 5. `STATUS_DETAIL` / `PaymentStatusDetail`, explained in full

Plain-words version of the three pieces in `src/payments/payment.model.ts`:

### `PaymentStatus`

```ts
export type PaymentStatus = 'created' | 'processing' | 'succeeded' | 'failed' | 'expired';
```

A CLOSED LIST of the only five words the database may hold for a payment.
`states.ts` adds the legal-transition table (`ALLOWED`) and `transition()`
which throws on any illegal move — the state machine.

### `PaymentStatusDetail`

```ts
export type PaymentStatusDetail =
  | 'recorded, not charged'
  | 'with the provider; outcome pending'
  | 'money confirmed captured; terminal'
  | 'no money moved; terminal — create a NEW payment'
  | 'abandoned and never charged; create a NEW payment';
```

A SECOND closed list — but of human sentences instead of status words.
Why it exists: the word `failed` alone does not tell an integrator
"money did not move, make a NEW payment." Each status therefore carries
exactly one fixed explanation, and the explanation is itself a type, so a
typo in one controller would be caught at compile time.

### `STATUS_DETAIL`

```ts
const STATUS_DETAIL: Record<PaymentStatus, PaymentStatusDetail> = {
  created:    'recorded, not charged',
  processing: 'with the provider; outcome pending',
  succeeded:  'money confirmed captured; terminal',
  failed:     'no money moved; terminal — create a NEW payment',
  expired:    'abandoned and never charged; create a NEW payment',
};
```

A lookup table: status word in → sentence out.

The important trick is the annotation `Record<PaymentStatus, PaymentStatusDetail>`:
- the KEYS must cover every `PaymentStatus` — add a sixth status and
  `tsc` refuses to build until you write its sentence;
- the VALUES must be legal `PaymentStatusDetail` sentences — no free text.

So the compiler itself is the completeness check; no runtime validation
code is needed. `toPaymentModel()` then does one dict lookup:
`status_detail: STATUS_DETAIL[p.status]`.

### Contract warning (flagged, no action agreed yet)

These sentences are served on every payment response — the React console
and integrators may match on them. Rewording later is a breaking API
change. If we ever want freedom to reword, the safer shape is a
machine-readable detail code (`'terminal_no_money'`) plus the sentence as
presentation only. Decision deferred until the console shows this field.

---

## 6. Deep review findings (verified)

Severity legend: 🔴 fix now · 🟡 fix in this refactor pass · 🟢 noted, decide later.
Every finding was re-checked; earlier suspicion about `auth/permissions.ts`
was WRONG — it is alive (used by `permission.guard.ts`).

### 6.1 Dead code

| # | Finding | Evidence | Action |
|---|---|---|---|
| 1 | 🔴 `src/payments/uuid.ts` is dead — byte-twin of `src/common/is-uuid.ts` | `grep -rln "payments/uuid"` → zero importers | delete in its own micro-commit |
| 2 | 🟡 Unused imports (lint, `npx oxlint src`) | `InjectRepository` in paytabs.adapter; `Max` in create-application.dto; `HttpCode` in credentials.controller; `Inject` in customers.service | one cleanup commit |
| 3 | 🟢 lint nit: `/^4/.test(code)` → `code.startsWith('4')` in paytabs.adapter | oxlint | ride along with #2 |

### 6.2 Contract hole in the error vocabulary

| # | Finding | Evidence | Action |
|---|---|---|---|
| 4 | 🔴 `'unspecified_error'` is emitted by `api-error.filter.ts` (non-HttpException path) but is NOT in `ERROR_CODES` in `error-codes.ts` | filter line: `code: 'unspecified_error'`; union has 16 codes, this is not one | add `'unspecified_error'` to `ERROR_CODES` so the documented vocabulary and the wire match; tsc then guards every emitter |

This matters because step 10 made the error vocabulary a promise to
integrators. Today a 500 response carries a code that the type cannot name —
the exact bug class the `as const` union was built to prevent.

### 6.3 Ownership misplacement

| # | Finding | Evidence | Action |
|---|---|---|---|
| 5 | 🟡 `users/permission.model.ts` — permission mapper lives in the users module, but permissions are their own module | file location | move to `src/permissions/mappers/permission.mapper.ts` with the mapper pass |
| 6 | 🟡 `db/` and `database/` are two folders for one job (migrations vs seeders) | tree | DECIDED: merge under `db/` (seeders move in); update `seed` script path; one commit, `migration:run` drill after |
| 7 | 🟡 `webhooks/webhook-event.entity.ts` + `webhooks/raw-webhook-request.ts` sit at folder root, breaking the `entities/` grammar every other module obeys | tree | move into `webhooks/entities/`; the `**/*.entity.js` glob still catches them |

### 6.4 Duplication

| # | Finding | Evidence | Action |
|---|---|---|---|
| 8 | 🟡 customer shape in three places | §4 table | one `CustomerDetails` type owned by customers; DTO/port/mapper import it |
| 9 | 🟢 factory has two near-identical `switch` blocks (`forAccount` / `forProviderCode`) | `payment-provider.factory.ts` | acceptable while only mock+paytabs exist; revisit when Paymob/PayFort land |

### 6.5 Naming grammar (Ahmed's votes needed)

| # | Finding | Options |
|---|---|---|
| 10 | 🟡 `AuthContext` (machine plane) vs `ActorContext` (merchant plane) — nothing in the names says which plane is which | rename to `MachineContext` / `MerchantContext`, or keep and document; house rule "never mix the planes" deserves self-evident names |
| 11 | 🟡 `PaymentPublicModel` vs `CustomerModel` — two conventions for the same kind of type | standardize on `<Thing>Model` (rename in the mapper pass) |
| 12 | 🟢 `providers/providers-methods.constant.ts` vs `permissions/permissions.constant.ts` — same kind of file, two naming schemes | pick one (`<thing>.constant.ts` suggested) |
| 13 | 🟢 controllers re-type `@Req() req: { auth?: AuthContext }` / `{ actor: ActorContext }` inline everywhere | a small `@AuthReq()` decorator or just `CurrentAuth` param decorator would remove ~15 inline types; optional, low value |

### 6.6 Config / infra

| # | Finding | Evidence | Action |
|---|---|---|---|
| 14 | 🟡 entity glob written TWO ways: `app.module.ts` uses `import.meta.dirname + '/**/*.entity.js'`, `data-source.ts` uses `'dist/**/*.entity.js'` | both files | keep the deliberate two-file pair, but make the two strings equivalent-by-construction (same constant spelling) — this is the documented cache-trap family; drift here cost an afternoon once |
| 15 | 🟢 `main.ts` calls `app.enableCors()` with no options — wide-open CORS | main.ts | fine for dev; must be config-driven (`APP_CONFIG`) before step 27 prod image; add to the 27 checklist |

### 6.7 Things checked and found SOUND (no action)

- `auth/permissions.ts` is alive (`permission.guard.ts` imports it) — not dead.
- Both entity globs still catch `webhooks/webhook-event.entity.ts` even at
  folder root (glob is `**/*.entity.js`) — the move in #7 is grammar, not bug.
- `synchronize: false` in BOTH configs; `uuidExtension: 'pgcrypto'` in both.
- `states.ts` transition table is exhaustive (Record over all 5 statuses).
- No `.spec.ts`/`.test.ts` files exist (house rule: tests removed) while the
  vitest scripts remain in package.json — intentional, noted for the future.
- `return.controller.ts` is stateless/UX-only as contracted — no state change,
  no proof semantics.
- `options` controller correctly normalizes (`currency.toUpperCase()`,
  `method.toLowerCase()`) and is machine-plane-guarded.
- Migration files carry the `import type` header per house rule; the
  customers migration (1794655711271) matches the hand-trim style with
  named constraints.

---

## 7. Agreed naming votes (decisions recorded)

| topic | decision |
|---|---|
| permission `payments:read` | APPROVED by Ahmed (2026-11-14) — stays |
| mapper layout | `mappers/` folder, one file per mapper, `<thing>.mapper.ts` |
| customer shape | single `CustomerDetails` type owned by customers module |
| `db/` + `database/` | DECIDED (2026-11-14) — merge into `db/` (migrations + seeders) |
| src re-rooting | PROPOSED by Ahmed (2026-11-14) — business modules under `modules/`, infra stays at root (§2.6); confirmed workable, awaiting final go |
| model type suffix | `<Thing>Model` (drop the lone `Public`) — pending final go |
| context names | pending Ahmed's vote (§6.5 #10) |
| constant file naming | pending Ahmed's vote (§6.5 #12) |
| STATUS_DETAIL sentences | stay as-is until console depends on them |

---

## 8. Execution order (micro-steps, one edit per message)

Each step: edit → `npx tsc --noEmit` → drill where behavior could change →
named-path commit.

1. Delete `src/payments/uuid.ts` (+ lint cleanup ride-along #2/#3) — commit
2. Add `'unspecified_error'` to `ERROR_CODES` — commit (tsc proves nothing else breaks)
3. Introduce `CustomerDetails` single source; delete the inline type in
   `payment.model.ts`; `CheckoutCustomer` imports it — commit
4. `db/` + `database/` merge (migrations stay, `database/seeders` moves in,
   `seed` script path updated) — commit, `migration:run` + `npm run seed` drill
5. **The `modules/` move** (§2.6): `git mv` all 13 business modules under
   `src/modules/`, update app.module + data-source if touched, fix imports —
   ONE pure-move commit, zero logic edits; verify `tsc` + boot + `/ready` +
   one API regression drill
6. Mapper pass, one module per message: create `mappers/<thing>.mapper.ts`,
   move shape+function, update controller imports — commit per module
   (start with `payments` since `PaymentPublicModel` rename rides here,
   then `customers`, then the rest)
7. Move `permission.model.ts` → `permissions/mappers/` (rides with step 6's
   permissions module or its own micro-step)
8. `webhooks/entities/` move — commit, boot check
9. Entity-glob spelling unification (#14) — commit
10. Context renames + constant naming — after Ahmed's votes
11. THEN: PayTabs prefill verification (tunnel check first), step-24
    transcript, Paymob (Block C)

Steps 1–8 are mechanical and provable; none touch request semantics except
#2 (adds one error code) and #8 (no behavior change).
