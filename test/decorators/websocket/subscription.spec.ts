import {
  Modifies,
  Outbound,
  Route,
  StandaloneRoute,
  Subscribe,
} from "../../../src/active-connect";
import { testEach } from "../../../src/jest";
import { WebsocketConnection } from "../../../src/server/websocket/connection/connection";
import { WebsocketMocks } from "../../server/websocket-mocks";

beforeEach(() => {
  Testing.value.value = "oldvalue1";
});

@Route("modify")
class Testing {
  public static value: any = { value: "oldvalue1" };

  @Outbound("out1.subscribe1")
  @Subscribe
  public async sendData1(conn: WebsocketConnection) {
    return Testing.value;
  }

  @Subscribe
  @Outbound("out2.subscribe1")
  public async sendData2(conn: WebsocketConnection) {
    return Testing.value;
  }

  @StandaloneRoute("standalone.subscribe1")
  @Modifies("out1.subscribe1", "out2.subscribe1")
  public async standalone1(value: any, conn: WebsocketConnection) {
    Testing.value = value;
  }

  @Modifies("out2.subscribe1", "out1.subscribe1")
  @StandaloneRoute("standalone.subscribe2")
  public async standalone2(value: any, conn: WebsocketConnection) {
    Testing.value = value;
  }

  @Route("subscribe1")
  @Modifies("out1.subscribe1", "out2.subscribe1")
  public async subscribe1(value: any, conn: WebsocketConnection) {
    Testing.value = value;
  }

  @Modifies("out2.subscribe1", "out1.subscribe1")
  @Route("subscribe2")
  public async subscribe2(value: any, conn: WebsocketConnection) {
    Testing.value = value;
  }
}

const regularRoutes: string[] = [
  "out1.subscribe1",
  "out2.subscribe1",
  "modify.subscribe1",
  "modify.subscribe2",
];
const standaloneRoutes: string[] = [
  "out1.subscribe1",
  "out2.subscribe1",
  "standalone.subscribe1",
  "standalone.subscribe2",
];

testEach(
  [regularRoutes, standaloneRoutes],
  ["routes", "standalone-routes"],
  (routes: string[], label: string) => {
    it(label + ": should resend subscribed data", async () => {
      expect(Testing).toBeDefined();
      const conn = WebsocketMocks.getConnectionStub();
      const data = await conn.awaitMessage(routes[0]);
      expect(data).toStrictEqual({ value: "oldvalue1" });
      conn.runRequest(routes[3], { value: "updated" });
      expect(Testing.value).toStrictEqual({ value: "updated" });
      const resentData = await conn.awaitMessage(routes[0]);
      expect(resentData).toStrictEqual({ value: "updated" });
    });

    it(
      label + ": should resend subscribed data (multiple updated)",
      async () => {
        expect(Testing).toBeDefined();
        const conn = WebsocketMocks.getConnectionStub();
        const data = await Promise.all([
          conn.awaitMessage(routes[0]),
          conn.awaitMessage(routes[1]),
        ]);
        expect(data[0]).toStrictEqual({ value: "oldvalue1" });
        expect(data[1]).toStrictEqual({ value: "oldvalue1" });

        conn.runRequest(routes[3], { value: "updated" });
        expect(await conn.awaitMessage(routes[1])).toStrictEqual({
          value: "updated",
        });
        expect(await conn.awaitMessage(routes[0])).toStrictEqual({
          value: "updated",
        });
      }
    );
  }
);

it.todo("should be possible to use the deprecated decorator @SubscribeChanges");
