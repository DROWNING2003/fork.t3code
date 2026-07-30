# Implementation Plan: Boundly Sandbox Web

## Objective

Create a separate public Boundly web deployment that reuses `apps/web` but exposes only the Qiniu Sandbox workflow: configure credentials, create or manage a sandbox, connect it, and use the existing chat UI for that connected sandbox. Desktop and locally hosted Web retain their existing local, remote, relay, and Connect behavior.

## Architecture Decisions

- Use a build-time surface mode, `VITE_BOUNDLY_WEB_SURFACE=sandbox`, rather than a second copied React application. A separate deployment project enables the mode; the default build remains unchanged.
- Sandbox-only mode bypasses the primary local-server authentication bootstrap. It owns no local server and connects only through sandbox-generated pairing URLs.
- Sandbox API and provider credentials remain in the current browser-local credential store. They are never put into the bundle, deployment configuration, or a server-side database.
- Sandbox-only mode permits sandbox list, creation, sandbox credentials, and chat routes for connected sandbox environments. Local-project, generic connection, relay/Connect, and general settings entry points are hidden and redirected away.
- The deploy target is a separate Vercel project (or equivalent) configured with the same `apps/web` root and `VITE_BOUNDLY_WEB_SURFACE=sandbox`. Domain and deployment credentials remain operator configuration, not source code.

## Commands

- Unit tests: `vp test run <target test files>`
- Typecheck: `vp run --filter @t3tools/web typecheck`
- Sandbox build: `VITE_BOUNDLY_WEB_SURFACE=sandbox vp run --filter @t3tools/web build`

## Success Criteria

- A sandbox-mode build opens at `/sandboxes`; a normal Web or Electron build retains its current start route and navigation.
- Sandbox-only mode provides configuration, create, lifecycle actions, and connection to the existing chat UI.
- Normal local/remote connection entry points and routes cannot be reached through the public sandbox deployment.
- A connected sandbox remains usable in chat, while non-sandbox saved environments are not exposed by the public deployment.
- The deployment receives no sandbox API key, provider key, pairing token, or user credential at build time.

## Boundaries

- Always: preserve desktop/local Web behavior, add focused tests before implementation, and retain existing sandbox connection orchestration.
- Ask first: create a deployment project, configure domains/secrets, or change the Sandbox API contract.
- Never: duplicate the Web app, hardcode deployment origins or credentials, or weaken the one-time pairing flow.

## Risks

| Risk                                                   | Mitigation                                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Direct URLs expose non-sandbox screens                 | Add route-level mode checks and tests, not only hidden navigation.                                   |
| Existing UI reads all saved environments               | Filter public-mode environment presentation and test the filter against sandbox URLs.                |
| Static hosted bootstrap tries to use a local T3 server | Add a dedicated sandbox-mode bootstrap state that bypasses primary authentication.                   |
| Credential leakage                                     | Keep keys in the existing local store and add no public build variables beyond the surface selector. |

## Open Questions

- Which Boundly domain and deployment provider project should receive the sandbox-only build? This only blocks the final deployment configuration; it does not block the application slice.
