import { Outbound } from "../../../src/active-connect";
import { WebsocketConnection } from "../../../src/server/websocket/connection/connection";
import { WebsocketOutbound } from "../../../src/server/websocket/routing/outbound";
import { WebsocketMocks } from "../../server/websocket-mocks";

it("should be possible to create a outbound", async () => {
  class Out {
    @Outbound("out.example")
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();
  const out = new WebsocketOutbound();
  const conn = WebsocketMocks.getConnectionStub();

  out.sendToConnection(conn);

  const data = await conn.awaitMessage("out.example");
  expect(data).toStrictEqual({ value: "anything" });
});

it("should be possible to create a requestable outbound", async () => {
  class Out {
    @Outbound("out.requesting", true)
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();
  const out = new WebsocketOutbound();
  const conn = WebsocketMocks.getConnectionStub();

  out.requestOutbound("out.requesting", conn);

  const data = await conn.awaitMessage("out.example");
  expect(data).toStrictEqual({ value: "anything" });
});
