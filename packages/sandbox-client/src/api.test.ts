import { describe, expect, it } from "vite-plus/test";

import { createSandboxApi } from "./api";

describe("sandbox API", () => {
  it("lists all sandbox states through the v2 endpoint", async () => {
    const requests: string[] = [];
    const api = createSandboxApi({
      apiKey: "test-key",
      apiUrl: "https://sandbox.example.com",
      fetchImpl: async (input) => {
        requests.push(String(input));
        return new Response("[]", { status: 200 });
      },
    });

    await api.list({ metadata: { app: "boundly" } });

    expect(requests).toEqual(["https://sandbox.example.com/v2/sandboxes?metadata=app%3Dboundly"]);
  });
});
