import { Outbound } from "../../../src/active-connect";
import { WebsocketConnection } from "../../../src/server/websocket/connection/connection";
import { WebsocketOutbound } from "../../../src/server/websocket/routing/outbound";
import { WebsocketMocks } from "../../server/websocket-mocks";

it("should be possible to create a outbound", (d) => {
  class Out {
    @Outbound("out.example")
    async send(conn: WebsocketConnection) {
      return { value: "anything" };
    }
  }
  expect(Out).toBeDefined();
  const out = new WebsocketOutbound();
  const conn = WebsocketMocks.getConnectionStub();
  conn.awaitMessage("out.example").then((data) => {
    expect(data).toStrictEqual({ value: "anything" });
    d();
  });
  out.sendToConnection(conn);
});
