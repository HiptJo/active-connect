import {
  HttpServer,
  StandaloneWebsocketRoute,
  WebsocketOutbound,
  WebsocketOutbounds,
  WebsocketRouter,
} from "../../../src/active-connect";
import * as assert from "assert";
import { WebsocketClient } from "../../../src/integration-testing/connections/websocket-client";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

describe("server creation", () => {
  let server: HttpServer;

  beforeAll(() => {
    server = new HttpServer(9002, true);
  });
  afterAll(async () => {
    if (server) {
      await server.awaitStart();
      await server.stop();
    }
  });
  it("should be possible to create a server with websocket support", async () => {
    assert.strictEqual(await server.awaitStart(), true);
  });
  it("should be possible to connect to websocket", async () => {
    assert.strictEqual(await server.awaitStart(), true);
    const client = new WebsocketClient(9002);
    assert.strictEqual(await client.awaitConnection(), true);
    client.close();
  });

  it("should be possible to receive messages", async () => {
    assert.strictEqual(await server.awaitStart(), true);

    class Testing {
      message() {
        return "hellomsg";
      }
    }
    WebsocketOutbounds.addOutbound(
      new WebsocketOutbound("await.message", {
        target: Testing.prototype,
        propertyKey: "message",
      })
    );
    expect(Testing).toBeDefined();

    const client = new WebsocketClient(9002);
    assert.strictEqual(await client.awaitConnection(), true);

    const msg = await client.awaitMessage("await.message");
    expect(msg).toBe("hellomsg");
    client.close();
  });

  it("should be possible to get false", async () => {
    assert.strictEqual(await server.awaitStart(), true);

    class Testing {
      message() {
        return false;
      }
    }
    WebsocketRouter.registerStandaloneRoute(
      new StandaloneWebsocketRoute("falseval.awaitfalse", {
        target: Testing.prototype,
        propertyKey: "message",
      })
    );
    expect(Testing).toBeDefined();

    const client = new WebsocketClient(9002);
    assert.strictEqual(await client.awaitConnection(), true);

    client.send("falseval.awaitfalse", null);
    const msg = await client.awaitMessage("m.falseval.awaitfalse");
    expect(msg).toBe(false);
    client.close();
  });

  it("should be possible to close a websocket client", async () => {
    assert.strictEqual(await server.awaitStart(), true);
    class Testing {
      message() {
        return "hellomsg";
      }
    }
    const out = new WebsocketOutbound("await.message1", {
      target: Testing.prototype,
      propertyKey: "message",
    });
    out.subscribeChanges();
    WebsocketOutbounds.addOutbound(out);
    expect(Testing).toBeDefined();

    const client = new WebsocketClient(9002);
    assert.strictEqual(await client.awaitConnection(), true);

    const msg = await client.awaitMessage("await.message1");
    expect(msg).toBe("hellomsg");
    client.close();

    await delay(100);
    await WebsocketOutbounds.sendUpdates(["await.message1"]);
    client.awaitMessage("await.message1").then(() => {
      fail("The update should not be sent as the connection has been closed");
    });
  });
  it("should be possible to receive a large data-amount", async () => {
    assert.strictEqual(await server.awaitStart(), true);
    class Testing {
      message() {
        return "hellomsg".repeat(10000);
      }
    }
    const out = new WebsocketOutbound("await.message2", {
      target: Testing.prototype,
      propertyKey: "message",
    });
    out.subscribeChanges();
    WebsocketOutbounds.addOutbound(out);
    expect(Testing).toBeDefined();

    const client = new WebsocketClient(9002);
    assert.strictEqual(await client.awaitConnection(), true);

    const msg = await client.awaitMessage("await.message2");
    expect(msg).toBe("hellomsg".repeat(10000));
    client.close();
  });
});
