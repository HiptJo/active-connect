import * as assert from "assert";

import { HttpServer, WebsocketRoute, WebsocketRouter } from "../../../../src";
import { WebsocketConnection } from "../../../../src/";
import { WebsocketClient } from "../../../../src/integration-testing/connections/websocket-client";

let client: WebsocketClient;
let server: HttpServer;
beforeEach(async () => {
  server = new HttpServer(9001, true);
  assert.strictEqual(await server.awaitStart(), true);
  client = new WebsocketClient(9001);
  assert.strictEqual(await client.awaitConnection(), true);
});
afterEach(async () => {
  if (server) await server.stop();
});

describe("test connection event handling", () => {
  it("should be possible to send a message", async () => {
    class Testing {
      onCreate(data: any, conn: WebsocketConnection) {
        return { value: "connection established successfully" };
      }
    }
    const route = new WebsocketRoute("connection", null);
    route.addChild(
      new WebsocketRoute("create", {
        target: Testing.prototype,
        propertyKey: "onCreate",
      })
    );
    WebsocketRouter.registerRoute(route);

    client.send("connection.create", null);
    const data = await client.awaitMessage("m.connection.create");
    expect(data).toStrictEqual({
      value: "connection established successfully",
    });
    client.close();
  });
});
