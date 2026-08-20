# Copilot instructions — ods-component-catalog-front

## Project overview
Angular 19 single-page application built on top of the internal **AppShell** framework (`@opendevstack/ngx-appshell`) and **Angular Material**. It is the front-end of the Component Catalog product: it lists catalog products/components, lets users trigger provisioning actions and displays project/component information coming from several backend services (catalog, provisioner, projects-info-service).

## Architecture & folder structure
- `src/app/screens/` — routed, page-level components (one folder per screen). Screens orchestrate services and compose smaller components; keep business logic out of screens when it can live in a service.
- `src/app/components/` — reusable, presentation-focused components (dialogs, cards, widgets). Prefer `@Input`/`@Output` for communication, no direct service calls unless the component is a self-contained widget.
- `src/app/services/` — singleton services (`providedIn: 'root'`) that hold state and talk to the generated OpenAPI clients. State is exposed as `BehaviorSubject`/`Observable`, never as a public `Subject`.
- `src/app/guards/` — route guards and access rules (see `catalog-activity-access-rule.ts`, `groups.guard.ts`).
- `src/app/models/` — hand-written app-level DTOs/view models. Do **not** duplicate types that already exist in the generated OpenAPI clients; import and reuse them instead.
- `src/app/openapi/` — **generated code, do not edit by hand** (see below).
- `appshell.configuration.ts` / `azure.config.ts` / `app.config.ts` / `app.routes.ts` — application-wide configuration (AppShell layout, MSAL/Azure auth, providers, routes).

## Components & style conventions
- All new components are **standalone** (`imports: [...]` in the `@Component` decorator), no `NgModule`s.
- Use `templateUrl`/`styleUrl` (single file), not inline templates/styles, unless the component is trivial.
- Constructor-based dependency injection with `private readonly` fields (see `CatalogService`, `AppComponent`).
- Prefer RxJS (`Observable`, `BehaviorSubject`, `firstValueFrom`, operators from `rxjs`/`rxjs/operators`) over manual subscriptions/promises; always unsubscribe in `ngOnDestroy` (`Subscription`/`Subject` + `takeUntil` pattern already used in `AppComponent`).
- Keep imports ordered by origin (Angular core → Angular common/material → third-party → app-relative), matching the existing files.
- Follow the [Angular style guide](https://angular.dev/style-guide) and the existing ESLint configuration (`@typescript-eslint`, `@angular-eslint`, template accessibility rules) — run `npm run lint` before committing.
- Formatting: 2-space indentation, single quotes for TypeScript, trailing whitespace trimmed, final newline (`.editorconfig` is the source of truth, respect it).

## HTTP clients: OpenAPI generator (important, repo-specific)
This project **never hand-writes HTTP clients**. All calls to the catalog, provisioner and projects-info-service backends go through clients generated with `@openapitools/openapi-generator-cli`, configured in `openapitools.json` (generator `typescript-angular`, kebab-case file naming, one generator entry per backend).

- Source of truth for each client is the OpenAPI spec under `openapi-specs/*.yaml`. To use a new/updated contract, update the corresponding spec file first (see `scripts/get-latest-api-contracts.sh` to pull the latest contracts) and then regenerate.
- Regenerate clients with the npm scripts, do not edit files under `src/app/openapi/` manually — they are wiped and regenerated on every run and are excluded from ESLint (`ignorePatterns` in `.eslintrc.json`):
  - `npm run generate-api-client` — cleans `src/app/openapi` and regenerates all three clients.
  - `npm run generate-api-client:catalog`, `npm run generate-api-client:provisioner`, `npm run generate-api-client:projects-info-service` — regenerate a single client.
  - `npm run build` already runs `generate-api-client` before `ng build`, so clients are always fresh in CI/CD.
- Import generated services/models from the barrel of the corresponding client folder (e.g. `../openapi/component-catalog`), never reach into internal generated files directly.
- If a generated client changes its public API (renamed method/model), update the callers in `services/` and their specs in the same change — do not patch the generated output.

## Testing
- Unit tests: Jasmine + Karma, spec files colocated with the source (`*.spec.ts`), excluded from ESLint linting.
- Run `npm run test` (headless, coverage + junit report) or `npm run test:quiet` for a faster local run without coverage.
- To run a single spec file use `npm run test:file -- <path-to-spec>` (or `test:file:coverage`).
- New services/components/screens/guards must ship with a matching `*.spec.ts`; mock generated OpenAPI services rather than hitting real HTTP endpoints.
- Mock dependencies with `jasmine.createSpyObj`, typed against the real class or the generated `*ServiceInterface` (e.g. `jasmine.SpyObj<CatalogItemsServiceInterface>`), not against `any`; this keeps mocks in sync with the real API surface and is already the dominant pattern in the suite (`catalog.service.spec.ts`, `catalog-resolver.service.spec.ts`).
- Configure `TestBed` with only the providers/spies a test actually needs (see any `*.spec.ts` under `services/` or `guards/`); avoid importing the real `HttpClientModule`/hitting the network — use `provideHttpClient()` together with spies instead.
- Reset any shared/global state the unit under test touches (e.g. `localStorage`) in `beforeEach`, as done in `catalog.service.spec.ts`, so tests stay independent of execution order.
- Prefer asserting observables with `firstValueFrom`/`async`-`await` (see `groups.guard.spec.ts`) over the `done()` callback style for new tests; it reads closer to the production code (which already favors `firstValueFrom`) and avoids forgetting to call `done()`. Existing `done()`-based specs don't need to be rewritten just for this.
- When a service/guard can error, add a test that exercises the error path (e.g. `catalog-resolver.service.spec.ts`'s error-handling test) instead of only covering the happy path.
- Keep test data (fixtures) close to the spec file as local `const`s, matching existing specs, rather than introducing a separate fixtures/mocking library.
- Give each `it`/`describe` a meaningful, behavior-oriented name (what is being tested and under which condition/expected outcome), not generic names like `it('works')` or `it('test 1')`.
- Cover cases of real relative importance for the unit under test (main happy path, meaningful edge cases, error/failure paths, access/permission branches in guards), not just trivial "should be created" checks.
- Global test coverage must always stay at **80% or above** (`npm run test` / `npm run test:quiet:coverage` report it); any new or modified code must keep the overall coverage at or above that threshold.

## Configuration & secrets
- `public/config/config.json` and `proxy.conf.json` are environment-specific (Azure app registration, backend host, catalog id). Do not commit real/production values or secrets; local overrides live under `overrides/`.
- Repository has a `gitleaks` pre-commit hook (`.pre-commit-config.yaml`) — never introduce API keys, tokens or credentials in source, config samples or specs.
- This is a submodule of `devstack-component-catalog-front`; keep changes self-contained to this module unless a task explicitly spans the parent repo.

## General guidance for Copilot
- Prefer editing/extending existing services and components over introducing new architectural patterns (state management libraries, alternative HTTP clients, CSS frameworks).
- Reuse AppShell (`@opendevstack/ngx-appshell`) and Angular Material components instead of building new UI primitives from scratch.
- When adding a new backend call, check first whether the generated OpenAPI client already exposes it; only touch `openapi-specs/*.yaml` + regenerate if the backend contract actually changed.
- Keep public APIs of services/components accessibility-friendly (the template linter enforces `@angular-eslint/template/accessibility`).
- Never run `git commit`, `git push`, or open/update a pull request automatically. Preparing/staging changes is fine; committing, pushing and PR creation are always a deliberate, manual action for the developer.
