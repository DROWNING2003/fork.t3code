# Boundly Sandbox Web Tasks

## Task 1: Define the Web surface mode

**Acceptance criteria:**

- [x] A tested, typed surface-mode helper reports `sandbox` only when `VITE_BOUNDLY_WEB_SURFACE=sandbox`.
- [x] The Vite build exposes this mode without changing existing URL configuration behavior.
- [x] Default and Electron builds remain on the full surface.

**Verification:** `vp test run apps/web/src/webSurface.test.ts` and `vp run --filter @t3tools/web typecheck`

**Dependencies:** None

## Task 2: Bootstrap the sandbox-only shell

**Acceptance criteria:**

- [x] Sandbox-mode root bypasses primary local-server authentication and starts at `/sandboxes`.
- [x] The full shell remains unchanged when the mode is absent.
- [x] Route behavior is covered by focused tests.

**Verification:** focused Web route/root tests and Web typecheck

**Dependencies:** Task 1

## Task 3: Restrict public navigation and saved environments

**Acceptance criteria:**

- [x] Public mode presents sandbox credentials and sandbox lifecycle actions only.
- [x] Local, generic remote, relay/Connect, and general settings paths redirect to `/sandboxes`.
- [x] Only sandbox-backed environments are visible to public chat navigation.

**Verification:** focused mode, routing, and environment-filter tests

**Dependencies:** Task 2

## Task 4: Preserve the connected-sandbox chat flow

**Acceptance criteria:**

- [x] Create and Connect continue to start T3 Server in the sandbox and enter its chat workspace.
- [x] Non-sandbox environment URLs are rejected in public mode.
- [ ] Existing desktop/local behavior remains covered.

**Verification:** sandbox hook tests, Web typecheck, and an integrated Web pass after user approval for browser use

**Dependencies:** Task 3

## Task 5: Prepare the separate deployment target

**Acceptance criteria:**

- [x] Deployment instructions identify a separate Vercel project with the sandbox surface variable.
- [x] No production URL, API key, or deployment token is committed.
- [ ] A later CI workflow can build and publish the selected project without impacting existing hosted Web.

**Verification:** build with the surface variable and configuration review

**Dependencies:** Task 4
