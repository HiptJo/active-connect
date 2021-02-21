import { WebsocketConnection } from "../../../../src/server/websocket/connection/connection";
import {
  Outbound,
  WebsocketOutbound,
} from "../../../../src/server/websocket/routing/outbound";
import * as assert from "assert";
import { WebsocketMocks } from "../../websocket-mocks";
beforeEach(() => {
  WebsocketOutbound.clear();
});
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
it("should be possible to send a outbound", async () => {
  WebsocketOutbound.addOutbound(
    new Outbound("testing.delivery", async () => {
      return {
        value: "ok",
      };
    })
  );

  const conn = WebsocketMocks.getConnectionStub();

  const outbound = new WebsocketOutbound();
  outbound.sendToConnection(conn);

  const data: any = await conn.awaitMessage("testing.delivery");
  assert.strictEqual(data.value, "ok");
});

it("should be possible to receive a requesting outbound", async () => {
  WebsocketOutbound.addOutbound(
    new Outbound(
      "testing.requested",
      async () => {
        return {
          value: "ok1",
        };
      },
      true
    )
  );
  const conn = WebsocketMocks.getConnectionStub();
  const outbound = new WebsocketOutbound();
  outbound.requestOutbound("testing.requested", conn);

  const data: any = await conn.awaitMessage("testing.requested");
  assert.strictEqual(data.value, "ok1");
});

it("should not be any outbound defined at the beginning", () => {
  expect(WebsocketOutbound.count).toBe(0);
});

it("should throw when requesting a non-existing outbound", (d) => {
  WebsocketOutbound.clear();
  const conn = WebsocketMocks.getConnectionStub();
  const outbound = new WebsocketOutbound();
  outbound.requestOutbound("testing1.notfound", conn).catch(() => {
    d();
  });
});
it("should return false when fetching a non-existing outbound by method", () => {
  expect(WebsocketOutbound.getOutbound("idonotexist")).toBeFalsy();
});
