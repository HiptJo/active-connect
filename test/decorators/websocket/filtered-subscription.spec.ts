import {
  MessageFilter,
  ModifiesFor,
  ModifiesMatching,
  Outbound,
  Route,
  StandaloneRoute,
  SubscribeFor,
  SubscribeMatchingChanges,
  WebsocketConnection,
} from "../../../src/active-connect";
import { testEach } from "../../../src/jest";
import { WebsocketMocks } from "../../server/websocket-mocks";

class F implements MessageFilter {
  filter(
    response: any,
    connection: WebsocketConnection
  ): number | Promise<number> {
    return 1;
  }
}

beforeEach(() => {
  Testing.value.value = "oldvalue1";
});

@Route("modify")
class Testing {
  public static value: any = { value: "oldvalue1" };

  @Outbound("out1.subscribe1")
  @SubscribeFor(new F())
  public async sendData1(conn: WebsocketConnection) {
    return Testing.value;
  }

  @SubscribeFor(new F())
  @Outbound("out2.subscribe1")
  public async sendData2(conn: WebsocketConnection) {
    return Testing.value;
  }

  @StandaloneRoute("standalone.subscribe1")
  @ModifiesFor(new F(), "out1.subscribe1", "out2.subscribe1")
  public async standalone1(value: any, conn: WebsocketConnection) {
    Testing.value = value;
  }

  @ModifiesFor(new F(), "out2.subscribe1", "out1.subscribe1")
  @StandaloneRoute("standalone.subscribe2")
  public async standalone2(value: any, conn: WebsocketConnection) {
    Testing.value = value;
  }

  @Route("subscribe1")
  @ModifiesFor(new F(), "out1.subscribe1", "out2.subscribe1")
  public async subscribe1(value: any, conn: WebsocketConnection) {
    Testing.value = value;
  }

  @ModifiesFor(new F(), "out2.subscribe1", "out1.subscribe1")
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
    it(label + ": should resend subscribed data (filtered)", async () => {
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
      label + ": should resend subscribed data (filtered, multiple updated)",
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

describe("deprecated decorator testing: @SubscribeMatchingChanges", () => {
  beforeEach(() => {
    Testing.value = { value: "oldvalue1" };
  });
  @Route("modify1")
  class Testing {
    public static value: any = { value: "oldvalue1" };

    @Outbound("out3.subscribe1")
    @SubscribeMatchingChanges(new F())
    public async sendData1(conn: WebsocketConnection) {
      return Testing.value;
    }

    @SubscribeMatchingChanges(new F())
    @Outbound("out4.subscribe1")
    public async sendData2(conn: WebsocketConnection) {
      return Testing.value;
    }

    @StandaloneRoute("standalone.subscribe3")
    @ModifiesFor(new F(), "out3.subscribe1", "out4.subscribe1")
    public async standalone1(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }

    @ModifiesFor(new F(), "out4.subscribe1", "out3.subscribe1")
    @StandaloneRoute("standalone.subscribe4")
    public async standalone2(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }

    @Route("subscribe1")
    @ModifiesFor(new F(), "out3.subscribe1", "out4.subscribe1")
    public async subscribe1(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }

    @ModifiesFor(new F(), "out4.subscribe1", "out3.subscribe1")
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
      it(label + ": should resend subscribed data (filtered)", async () => {
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
        label + ": should resend subscribed data (filtered, multiple updated)",
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
});
describe("deprecated decorator testing: @ModifiesMatching", () => {
  beforeEach(() => {
    Testing.value = { value: "oldvalue1" };
  });
  @Route("modify2")
  class Testing {
    public static value: any = { value: "oldvalue1" };

    @Outbound("out5.subscribe1")
    @SubscribeFor(new F())
    public async sendData1(conn: WebsocketConnection) {
      return Testing.value;
    }

    @SubscribeFor(new F())
    @Outbound("out6.subscribe1")
    public async sendData2(conn: WebsocketConnection) {
      return Testing.value;
    }

    @StandaloneRoute("standalone.subscribe5")
    @ModifiesMatching(new F(), "out5.subscribe1", "out6.subscribe1")
    public async standalone1(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }

    @ModifiesMatching(new F(), "out6.subscribe1", "out5.subscribe1")
    @StandaloneRoute("standalone.subscribe6")
    public async standalone2(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }

    @Route("subscribe1")
    @ModifiesMatching(new F(), "out5.subscribe1", "out6.subscribe1")
    public async subscribe1(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }

    @ModifiesMatching(new F(), "out6.subscribe1", "out5.subscribe1")
    @Route("subscribe2")
    public async subscribe2(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }
  }

  const regularRoutes: string[] = [
    "out5.subscribe1",
    "out6.subscribe1",
    "modify2.subscribe1",
    "modify2.subscribe2",
  ];
  const standaloneRoutes: string[] = [
    "out5.subscribe1",
    "out6.subscribe1",
    "standalone.subscribe5",
    "standalone.subscribe6",
  ];

  testEach(
    [regularRoutes, standaloneRoutes],
    ["routes", "standalone-routes"],
    (routes: string[], label: string) => {
      it(label + ": should resend subscribed data (filtered)", async () => {
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
        label + ": should resend subscribed data (filtered, multiple updated)",
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
});
