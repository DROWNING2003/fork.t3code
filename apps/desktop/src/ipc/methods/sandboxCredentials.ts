import { SandboxCredentialsSchema } from "@t3tools/contracts/sandbox";
import * as Effect from "effect/Effect";
import * as Encoding from "effect/Encoding";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { fromLenientJson } from "@t3tools/shared/schemaJson";

const SandboxCredentialsJson = fromLenientJson(SandboxCredentialsSchema);

import * as DesktopEnvironment from "../../app/DesktopEnvironment.ts";
import * as ElectronSafeStorage from "../../electron/ElectronSafeStorage.ts";
import * as IpcChannels from "../channels.ts";
import * as DesktopIpc from "../DesktopIpc.ts";

export const getSandboxCredentials = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.GET_SANDBOX_CREDENTIALS_CHANNEL,
  payload: Schema.Void,
  result: Schema.NullOr(SandboxCredentialsSchema),
  handler: Effect.fn("desktop.ipc.sandboxCredentials.get")(function* () {
    const environment = yield* DesktopEnvironment.DesktopEnvironment;
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const safeStorage = yield* ElectronSafeStorage.ElectronSafeStorage;
    const credentialsPath = path.join(environment.stateDir, "sandbox-credentials.enc");

    const raw = yield* fileSystem
      .readFileString(credentialsPath)
      .pipe(Effect.catchTags({ PlatformError: () => Effect.succeed(null) }));
    if (raw === null) return null;

    const secretBytes = yield* Effect.fromResult(Encoding.decodeBase64(raw)).pipe(Effect.orDie);
    const decrypted = yield* safeStorage
      .decryptString(secretBytes)
      .pipe(Effect.mapError((cause) => cause));
    const decoded = yield* Schema.decodeEffect(SandboxCredentialsJson)(decrypted).pipe(
      Effect.orDie,
    );
    return decoded;
  }),
});

export const setSandboxCredentials = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.SET_SANDBOX_CREDENTIALS_CHANNEL,
  payload: SandboxCredentialsSchema,
  result: Schema.Void,
  handler: Effect.fn("desktop.ipc.sandboxCredentials.set")(function* (creds) {
    const environment = yield* DesktopEnvironment.DesktopEnvironment;
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const safeStorage = yield* ElectronSafeStorage.ElectronSafeStorage;
    const credentialsPath = path.join(environment.stateDir, "sandbox-credentials.enc");

    const encoded = yield* Schema.encodeEffect(SandboxCredentialsJson)(creds).pipe(Effect.orDie);
    const encrypted = yield* safeStorage
      .encryptString(encoded)
      .pipe(Effect.mapError((cause) => cause));
    const encryptedB64 = Encoding.encodeBase64(encrypted);

    yield* fileSystem
      .makeDirectory(path.dirname(credentialsPath), { recursive: true })
      .pipe(Effect.orDie);
    yield* fileSystem.writeFileString(credentialsPath, encryptedB64).pipe(Effect.orDie);
  }),
});

export const clearSandboxCredentials = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.CLEAR_SANDBOX_CREDENTIALS_CHANNEL,
  payload: Schema.Void,
  result: Schema.Void,
  handler: Effect.fn("desktop.ipc.sandboxCredentials.clear")(function* () {
    const environment = yield* DesktopEnvironment.DesktopEnvironment;
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const credentialsPath = path.join(environment.stateDir, "sandbox-credentials.enc");

    yield* fileSystem.remove(credentialsPath, { force: true }).pipe(Effect.orDie);
  }),
});
