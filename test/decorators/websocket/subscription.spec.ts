import {
  Modifies,
  Outbound,
  Route,
  StandaloneRoute,
  Subscribe,
  SubscribeChanges,
} from "../../../src";
import { testEach } from "../../../src/jest";
import { WebsocketConnection } from "../../../src/";
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
      const data = await conn.expectMethod(routes[0]);
      expect(data).toStrictEqual({ value: "oldvalue1" });
      conn.runRequest(routes[3], { value: "updated" });
      expect(Testing.value).toStrictEqual({ value: "updated" });
      const resentData = await conn.expectMethod(routes[0]);
      expect(resentData).toStrictEqual({ value: "updated" });
    });

    it(
      label + ": should resend subscribed data (multiple updated)",
      async () => {
        expect(Testing).toBeDefined();
        const conn = WebsocketMocks.getConnectionStub();
        const data = await Promise.all([
          conn.expectMethod(routes[0]),
          conn.expectMethod(routes[1]),
        ]);
        expect(data[0]).toStrictEqual({ value: "oldvalue1" });
        expect(data[1]).toStrictEqual({ value: "oldvalue1" });

        conn.runRequest(routes[3], { value: "updated" });
        expect(await conn.expectMethod(routes[1])).toStrictEqual({
          value: "updated",
        });
        expect(await conn.expectMethod(routes[0])).toStrictEqual({
          value: "updated",
        });
      }
    );
  }
);

describe("deprecated decorator testing: @SubscribeChanges", () => {
  beforeEach(() => {
    Testing.value.value = "oldvalue1";
  });

  @Route("modify1")
  class Testing {
    public static value: any = { value: "oldvalue1" };

    @Outbound("out3.subscribe1")
    @SubscribeChanges
    public async sendData1(conn: WebsocketConnection) {
      return Testing.value;
    }

    @SubscribeChanges
    @Outbound("out4.subscribe1")
    public async sendData2(conn: WebsocketConnection) {
      return Testing.value;
    }

    @StandaloneRoute("standalone.subscribe3")
    @Modifies("out3.subscribe1", "out4.subscribe1")
    public async standalone1(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }

    @Modifies("out4.subscribe1", "out3.subscribe1")
    @StandaloneRoute("standalone.subscribe4")
    public async standalone2(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }

    @Route("subscribe1")
    @Modifies("out3.subscribe1", "out4.subscribe1")
    public async subscribe1(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }

    @Modifies("out4.subscribe1", "out3.subscribe1")
    @Route("subscribe2")
    public async subscribe2(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }
  }

  const regularRoutes: string[] = [
    "out3.subscribe1",
    "out4.subscribe1",
    "modify1.subscribe1",
    "modify1.subscribe2",
  ];
  const standaloneRoutes: string[] = [
    "out3.subscribe1",
    "out4.subscribe1",
    "standalone.subscribe3",
    "standalone.subscribe4",
  ];

  testEach(
    [regularRoutes, standaloneRoutes],
    ["routes", "standalone-routes"],
    (routes: string[], label: string) => {
      it(label + ": should resend subscribed data", async () => {
        expect(Testing).toBeDefined();
        const conn = WebsocketMocks.getConnectionStub();
        const data = await conn.expectMethod(routes[0]);
        expect(data).toStrictEqual({ value: "oldvalue1" });
        conn.runRequest(routes[3], { value: "updated" });
        expect(Testing.value).toStrictEqual({ value: "updated" });
        const resentData = await conn.expectMethod(routes[0]);
        expect(resentData).toStrictEqual({ value: "updated" });
      });

      it(
        label + ": should resend subscribed data (multiple updated)",
        async () => {
          expect(Testing).toBeDefined();
          const conn = WebsocketMocks.getConnectionStub();
          const data = await Promise.all([
            conn.expectMethod(routes[0]),
            conn.expectMethod(routes[1]),
          ]);
          expect(data[0]).toStrictEqual({ value: "oldvalue1" });
          expect(data[1]).toStrictEqual({ value: "oldvalue1" });

          conn.runRequest(routes[3], { value: "updated" });
          expect(await conn.expectMethod(routes[1])).toStrictEqual({
            value: "updated",
          });
          expect(await conn.expectMethod(routes[0])).toStrictEqual({
            value: "updated",
          });
        }
      );
    }
  );
});
