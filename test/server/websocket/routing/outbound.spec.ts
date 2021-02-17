import { WebsocketConnection } from "../../../../src/server/websocket/connection/connection";
import {
  Outbound,
  WebsocketOutbound,
} from "../../../../src/server/websocket/routing/outbound";
import * as assert from "assert";
import { WebsocketMocks } from "../../websocket-mocks";

it("should be possible to create a new outbound", () => {
  const outbound = new Outbound(
    "testing.delivery",
    async (conn: WebsocketConnection) => {
      return {
        value: "ok",
      };
    }
  );
  assert(outbound);
});
it("should be possible to send a outbound", (d) => {
  WebsocketOutbound.addOutbound(
    new Outbound("testing.delivery", async () => {
      return {
        value: "ok",
      };
    })
  );
  const conn = WebsocketMocks.getConnectionStub();
  conn.awaitMessage("testing.delivery").then((data: { value: string }) => {
    assert.strictEqual(data.value, "ok");
    d();
  });
  const outbound = new WebsocketOutbound();
  outbound.sendToConnection(conn);
});

it("should be possible to receive a requesting outbound", (d) => {
  WebsocketOutbound.addOutbound(
    new Outbound(
      "testing.delivery",
      async () => {
        return {
          value: "ok1",
        };
      },
      true
    )
  );
  const conn = WebsocketMocks.getConnectionStub();
  conn.awaitMessage("testing.delivery").then((data: { value: string }) => {
    assert.strictEqual(data.value, "ok1");
    d();
  });
  const outbound = new WebsocketOutbound();
  outbound.requestOutbound("testing.delivery", conn);
});
