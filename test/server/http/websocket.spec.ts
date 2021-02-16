import { HttpServer } from "../../../src/active-connect";
import * as assert from "assert";
import { WebsocketClient } from "../websocket-client";

describe("server creation", () => {
  it("should be possible to create a server with websocket support", async () => {
    const server = new HttpServer(9000, true);

    assert.strictEqual(await server.awaitStart(), true);

    server.stop();
  });
  it("should be possible to connect to websocket", async () => {
    const server = new HttpServer(9000, true);
    assert.strictEqual(await server.awaitStart(), true);
    assert.strictEqual(await new WebsocketClient(9000).awaitConnection(), true);
    server.stop();
  });
});
