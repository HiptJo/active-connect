import {
  HttpServer,
  Outbound,
  Route,
  StandaloneRoute,
  SubscribeChanges,
} from "../../../src/active-connect";
import * as assert from "assert";
import { WebsocketClient } from "../websocket-client";

describe("server creation", () => {
  let server: HttpServer;

  beforeEach(() => {
    server = new HttpServer(9000, true);
  });
  afterEach(() => {
    server.stop();
  });
  it("should be possible to create a server with websocket support", async () => {
    assert.strictEqual(await server.awaitStart(), true);
  });
  it("should be possible to connect to websocket", async () => {
    assert.strictEqual(await server.awaitStart(), true);
    assert.strictEqual(await new WebsocketClient(9000).awaitConnection(), true);
  });

  it("should be possible to receive messages", async () => {
    assert.strictEqual(await server.awaitStart(), true);

    class Testing {
      @Outbound("await.message")
      message() {
        return "hellomsg";
      }
    }
    expect(Testing).toBeDefined();

    const client = new WebsocketClient(null);
    assert.strictEqual(await client.awaitConnection(), true);

    const msg = await client.awaitMessage("await.message");
    expect(msg).toBe("hellomsg");
  });

  it("should be possible to get false", async () => {
    assert.strictEqual(await server.awaitStart(), true);

    @Route("falseval")
    class Testing {
      @Route("awaitfalse")
      message() {
        return false;
      }
    }
    expect(Testing).toBeDefined();

    const client = new WebsocketClient(null);
    assert.strictEqual(await client.awaitConnection(), true);

    client.send("falseval.awaitfalse", null);
    const msg = await client.awaitMessage("m.falseval.awaitfalse");
    expect(msg).toBe(false);
  });

  it("should be possible to get false through a standalone route", async () => {
    assert.strictEqual(await server.awaitStart(), true);

    class Testing {
      @StandaloneRoute("standalone1.awaitfalse")
      message() {
        return false;
      }
    }
    expect(Testing).toBeDefined();

    const client = new WebsocketClient(null);
    assert.strictEqual(await client.awaitConnection(), true);

    client.send("standalone1.awaitfalse", null);
    const msg = await client.awaitMessage("m.standalone1.awaitfalse");
    expect(msg).toBe(false);
  });

  it("should be possible to close a websocket client", async () => {
    assert.strictEqual(await server.awaitStart(), true);
    class Testing {
      @Outbound("await.message1")
      @SubscribeChanges
      message() {
        return "hellomsg";
      }
    }
    expect(Testing).toBeDefined();

    const client = new WebsocketClient(null);
    assert.strictEqual(await client.awaitConnection(), true);

    const msg = await client.awaitMessage("await.message1");
    expect(msg).toBe("hellomsg");
    client.close();
  });
  it("should be possible to receive a large data-amount", async () => {
    assert.strictEqual(await server.awaitStart(), true);
    class Testing {
      @Outbound("await.message1")
      @SubscribeChanges
      message() {
        return "hellomsg".repeat(1000);
      }
    }
    expect(Testing).toBeDefined();

    const client = new WebsocketClient(null);
    assert.strictEqual(await client.awaitConnection(), true);

    const msg = await client.awaitMessage("await.message1");
    expect(msg).toBe("hellomsg".repeat(1000));
    client.close();
  });
});
