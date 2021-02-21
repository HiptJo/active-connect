import { HttpServer, Outbound } from "../../../src/active-connect";
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
});
