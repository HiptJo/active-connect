import {
  MessageFilter,
  ModifiesMatching,
  Outbound,
  StandaloneRoute,
  SubscribeMatchingChanges,
  WebsocketConnection,
  WebsocketRequest,
} from "../../../src/active-connect";
import { WebsocketOutbound } from "../../../src/server/websocket/routing/outbound";
import { WebsocketRouter } from "../../../src/server/websocket/routing/router";
import { WebsocketMocks } from "../../server/websocket-mocks";

class F implements MessageFilter {
  filter(
    response: any,
    connection: WebsocketConnection
  ): number | Promise<number> {
    return 1;
  }
}

it("should resend subscribed data (sub first)", async () => {
  class Testing {
    public static value: any = { value: "oldvalue1" };

    @Outbound("out.subscribe1")
    @SubscribeMatchingChanges(new F())
    public async sendData(conn: WebsocketConnection) {
      return Testing.value;
    }

    @StandaloneRoute("modify.subscribe1")
    @ModifiesMatching(new F(), "out.subscribe1", "out.xyz")
    public async modify(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }
  }

  expect(Testing).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();
  const router = new WebsocketRouter();

  WebsocketOutbound.sendToConnection(conn);
  const data = await conn.awaitMessage("out.subscribe1");
  expect(data).toStrictEqual({ value: "oldvalue1" });
  await router
    .route(
      new WebsocketRequest("modify.subscribe1", { value: "hereiam" }, conn)
    )
    .then();
  expect(Testing.value).toStrictEqual({ value: "hereiam" });
  const resentData = await conn.awaitMessage("out.subscribe1");
  expect(resentData).toStrictEqual({ value: "hereiam" });
});
it("should resend subscribed data (out first)", async () => {
  class Testing1 {
    public static value: any = { value: "oldvalue1" };

    @Outbound("out1.subscribe1")
    @SubscribeMatchingChanges(new F())
    public async sendData(conn: WebsocketConnection) {
      return Testing1.value;
    }

    @StandaloneRoute("modify1.subscribe1")
    @ModifiesMatching(new F(), "out1.subscribe1", "out.xyz")
    public async modify(value: any, conn: WebsocketConnection) {
      Testing1.value = value;
    }
  }

  expect(Testing1).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();
  const router = new WebsocketRouter();

  WebsocketOutbound.sendToConnection(conn);
  const data = await conn.awaitMessage("out1.subscribe1");
  expect(data).toStrictEqual({ value: "oldvalue1" });
  await router
    .route(
      new WebsocketRequest("modify1.subscribe1", { value: "hereiam" }, conn)
    )
    .then();
  expect(Testing1.value).toStrictEqual({ value: "hereiam" });
  const resentData = await conn.awaitMessage("out1.subscribe1");
  expect(resentData).toStrictEqual({ value: "hereiam" });
});
