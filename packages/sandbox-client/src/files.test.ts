import { describe, expect, it } from "vite-plus/test";

import { uploadSandboxFile } from "./files";

describe("sandbox file upload", () => {
  it("uploads multipart content through the authenticated envd files endpoint", async () => {
    let request: Request | undefined;
    const file = new Blob(["hello sandbox"], { type: "text/plain" });

    await uploadSandboxFile({
      sandboxID: "sandbox-1",
      domain: "sandbox.example.com",
      fallbackDomain: null,
      path: "/home/user/project/hello.txt",
      file,
      fileName: "hello.txt",
      envdAccessToken: "envd-token",
      trafficAccessToken: "traffic-token",
      fetchImpl: async (input, init) => {
        request = new Request(input, init);
        return new Response("[]", { status: 200 });
      },
    });

    expect(request).toBeInstanceOf(Request);
    const captured = request!;
    expect(captured.url).toBe(
      "https://49983-sandbox-1.sandbox.example.com/files?path=%2Fhome%2Fuser%2Fproject%2Fhello.txt&username=user",
    );
    expect(captured.method).toBe("POST");
    expect(captured.headers.get("X-Access-Token")).toBe("envd-token");
    expect(captured.headers.get("e2b-traffic-access-token")).toBe("traffic-token");
    expect(captured.headers.get("Content-Type")).toMatch(/^multipart\/form-data; boundary=/);

    const form = await captured.formData();
    const uploaded = form.get("file");
    expect(uploaded).toBeInstanceOf(File);
    expect((uploaded as File).name).toBe("hello.txt");
    expect(await (uploaded as File).text()).toBe("hello sandbox");
  });

  it("surfaces a failed envd upload response", async () => {
    await expect(
      uploadSandboxFile({
        sandboxID: "sandbox-1",
        domain: "sandbox.example.com",
        path: "/home/user/project/hello.txt",
        file: new Blob(["hello"]),
        fileName: "hello.txt",
        fetchImpl: async () => new Response("permission denied", { status: 403 }),
      }),
    ).rejects.toThrow("403 permission denied");
  });
});
