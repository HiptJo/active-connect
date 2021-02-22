import { HttpServer } from "../../../src/active-connect";
import * as assert from "assert";
import * as test from "supertest";

describe("server creation", () => {
  it("should be possible to create a server without websocket support", async () => {
    const server = new HttpServer(9000, false);

    assert.strictEqual(await server.awaitStart(), true);
    server.stop();
  });
  it("should return true once awaitStart() is awaited when the server is already running", async () => {
    const server = new HttpServer(9000, false);
    await server.awaitStart();
    assert.strictEqual(await server.awaitStart(), true);
    server.stop();
  });
});

describe("angular asset serving", () => {
  let server: HttpServer;
  afterEach(() => {
    server.stop();
  });
  it("should be possible to setup angular file serving", async () => {
    server = new HttpServer(9000, false);
    server.setupAngularFileServing("./test/data/angular");
    await server.awaitStart();
    assert.strictEqual(await server.awaitStart(), true);
    await test(server.App)
      .get("/iama404fallback")
      .then((response) => {
        expect(response.status).toBe(200);
        expect(response.text).toContain("TEMPLATE CONTENT");
      });
  });
  it("should be possible to setup angular file serving", async () => {
    server = new HttpServer(9000, false);
    server.setupAngularFileServing("./test/data/angular");
    await server.awaitStart();
    assert.strictEqual(await server.awaitStart(), true);
    await test(server.App)
      .get("/assets/sample.html")
      .then((response) => {
        expect(response.status).toBe(200);
        expect(response.text).toContain("SAMPLE_ASSET");
      });
  });
});

describe("basic auth", () => {
  let server: HttpServer;
  afterEach(() => {
    server.stop();
  });

  it("should be possible to authenticate http requests", async () => {
    server = new HttpServer(9000, false);
    server.enableBasicAuthentication();
    server.addBasicCredentials("admin", "password");
    server.setupAngularFileServing("./test/data/angular");
    await server.awaitStart();
    assert.strictEqual(await server.awaitStart(), true);
    await test(server.App)
      .get("/assets/sample.html")
      .then((response) => {
        expect(response.status).toBe(401);
      });
    await test(server.App)
      .get("/assets/sample.html")
      .set("authorization", "Basic YWRtaW46cGFzc3dvcmQ=")
      .then((response) => {
        expect(response.status).toBe(200);
      });
  });
});
