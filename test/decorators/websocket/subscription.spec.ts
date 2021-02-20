import {
  Modifies,
  Outbound,
  StandaloneRoute,
  SubscribeChanges,
} from "../../../src/active-connect";
import { WebsocketConnection } from "../../../src/server/websocket/connection/connection";
import { WebsocketRequest } from "../../../src/server/websocket/message/request";
import { WebsocketOutbound } from "../../../src/server/websocket/routing/outbound";
import { WebsocketRouter } from "../../../src/server/websocket/routing/router";
import { WebsocketMocks } from "../../server/websocket-mocks";

it("should resend subscribed data", (d) => {
  class Testing {
    private static value: any = { value: "oldvalue" };
    @Outbound("out.subscribe1")
    @SubscribeChanges
    public async sendData(conn: WebsocketConnection) {
      return Testing.value;
    }

    @StandaloneRoute("modify.subscribe1")
    @Modifies("out.subscribe1", "out.xyz")
    public async modify(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }

    @Modifies("out.subscribe2", "out.xyz")
    @StandaloneRoute("modify.subscribe2")
    public async modify1(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }
  }

  expect(Testing).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();
  const router = new WebsocketRouter();
  const outbound = new WebsocketOutbound();
  conn.awaitMessage("out.subscribe1").then((data) => {
    expect(data).toStrictEqual({ value: "oldvalue" });
    conn.awaitMessage("out.subscribe1").then((data) => {
      expect(data).toStrictEqual({ value: "hereiam" });
      d();
    });
    router.route(
      new WebsocketRequest("modify.subscribe1", { value: "hereiam" }, conn)
    );
  });
  outbound.sendToConnection(conn);
});
