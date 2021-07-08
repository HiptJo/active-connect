import * as assert from "assert";

import { HttpServer, Route } from "../../../../src/active-connect";
import { WebsocketConnection } from "../../../../src/server/websocket/connection/connection";
import { WebsocketClient } from "../../websocket-client";

let client: WebsocketClient;
let server: HttpServer;
beforeEach(async () => {
  server = new HttpServer(9000, true);
  assert.strictEqual(await server.awaitStart(), true);
  client = new WebsocketClient(9000);
  assert.strictEqual(await client.awaitConnection(), true);
});
afterEach(() => {
  server.stop();
});

describe("test connection event handling", () => {
  it("should be possible to send a message", async () => {
    @Route("connection")
    class Testing {
      @Route("create")
      onCreate(data: any, conn: WebsocketConnection) {
        return { value: "connection established successfully" };
      }
    }
    expect(Testing).toBeDefined();
    client.send("connection.create", null);
    const data = await client.awaitMessage("m.connection.create");
    expect(data).toStrictEqual({
      value: "connection established successfully",
    });
  });

  it("should be possible to close the connection", () => {
    client.close();
  });
});
