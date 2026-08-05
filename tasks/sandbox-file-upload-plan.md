# Implementation Plan: Sandbox File Upload

## Overview

Add a Web/Desktop sandbox file upload workflow backed by envd's authenticated `POST /files` endpoint. Users can select one or more local files, choose a destination directory inside a running sandbox, and upload them without exposing sandbox credentials to the public `8080` endpoint.

## Architecture Decisions

- Reuse the existing `@t3tools/sandbox-client` envd transport and access-token headers.
- Use `multipart/form-data` with one `file` field per request, matching the sandbox filesystem contract.
- Keep the UI in the active project's Files panel; desktop inherits it because Electron wraps the Web renderer.
- Treat paused sandboxes as non-uploadable and keep the action hidden/disabled until resumed.

## Task List

### Phase 1: Transport

- [x] Add a typed SDK helper for authenticated envd file uploads.
- [x] Add focused tests for URL construction, multipart headers, and access-token forwarding.

### Checkpoint: Transport

- [x] Sandbox-client tests and typecheck pass.

### Phase 2: Web/Desktop Workflow

- [x] Expose upload through the Web sandbox hook.
- [x] Add a compact upload action to the active sandbox Files panel.
- [x] Add a dialog for destination directory, multi-file selection, loading, success, and error states.

### Checkpoint: Core Flow

- [x] Web typecheck, lint, focused tests, and build pass.
- [x] Paused sandboxes cannot start upload requests.

## Acceptance Criteria

- A user can select multiple files and upload them to a chosen absolute directory in a running sandbox.
- Every upload uses envd authentication and correct multipart boundaries.
- Upload failures are visible and do not leave the card permanently busy.
- Paused sandboxes do not show an upload action.

## Risks and Mitigations

| Risk                                                        | Impact | Mitigation                                                          |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| Setting `Content-Type` manually breaks multipart boundaries | High   | Remove the JSON content type before passing `FormData` to `fetch`.  |
| Uploading while a sandbox is paused returns noisy 502s      | Medium | Hide the upload action unless `state === "running"`.                |
| Large files make the UI look stuck                          | Medium | Show an explicit uploading state and disable duplicate submissions. |

## Scope Boundary

Mobile UI is not changed in this slice; the shared SDK transport remains reusable for a later native picker integration.
