import { HttpServer } from "../../../src/active-connect";
import * as assert from "assert";

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
