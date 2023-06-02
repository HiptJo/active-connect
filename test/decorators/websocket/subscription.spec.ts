import {
  Modifies,
  Outbound,
  Route,
  Shared,
  StandaloneRoute,
  SubscribeChanges,
} from "../../../src/active-connect";
import { WebsocketConnection } from "../../../src/server/websocket/connection/connection";
import { WebsocketRequest } from "../../../src/server/websocket/message/request";
import { WebsocketOutbounds } from "../../../src/server/websocket/routing/outbound";
import { WebsocketRouter } from "../../../src/server/websocket/routing/router";
import { WebsocketMocks } from "../../server/websocket-mocks";

it("should resend subscribed data (sub first)", async () => {
  class Testing {
    public static value: any = { value: "oldvalue1" };

    @SubscribeChanges
    @Outbound("out.subscribe1")
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

  WebsocketOutbounds.sendToConnection(conn);
  const data = await conn.awaitMessage("out.subscribe1");
  expect(data).toStrictEqual({ value: "oldvalue1" });
  await router.route(
    new WebsocketRequest("modify.subscribe1", { value: "hereiam" }, conn)
  );
  expect(Testing.value).toStrictEqual({ value: "hereiam" });
  const resentData = await conn.awaitMessage("out.subscribe1");
  expect(resentData).toStrictEqual({ value: "hereiam" });
});

it("should resend subscribed data (out first)", async () => {
  class Testing {
    private static value: any = { value: "oldvalue" };
    @Outbound("out1.subscribe1")
    @SubscribeChanges
    public async sendData(conn: WebsocketConnection) {
      return Testing.value;
    }

    @StandaloneRoute("modify1.subscribe1")
    @Modifies("out1.subscribe1", "out.xyz")
    public async modify(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }

    @Modifies("out1.subscribe2", "out.xyz")
    @StandaloneRoute("modify1.subscribe2")
    public async modify1(value: any, conn: WebsocketConnection) {
      Testing.value = value;
    }
  }

  expect(Testing).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();
  const router = new WebsocketRouter();

  WebsocketOutbounds.sendToConnection(conn);
  const data = await conn.awaitMessage("out1.subscribe1");
  expect(data).toStrictEqual({ value: "oldvalue" });
  await router.route(
    new WebsocketRequest("modify1.subscribe1", { value: "hereiam" }, conn)
  );
  const resentData = await conn.awaitMessage("out1.subscribe1");
  expect(resentData).toStrictEqual({ value: "hereiam" });
});

it("should be possible to access the `this` object within a subscribing outbound (sub first)", async () => {
  class Testing {
    @Shared({ value: "accessible" })
    content: any;

    @SubscribeChanges
    @Outbound("d.subscribe1")
    send() {
      return this.content;
    }
  }

  expect(Testing).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  const data = await conn.awaitMessage("d.subscribe1");
  expect(data).toStrictEqual({ value: "accessible" });
});
it("should be possible to access the `this` object within a subscribing outbound (out first)", async () => {
  class Testing {
    @Shared({ value: "accessible" })
    content: any;

    @Outbound("d.subscribe2")
    @SubscribeChanges
    send() {
      return this.content;
    }
  }

  expect(Testing).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendToConnection(conn);

  const data = await conn.awaitMessage("d.subscribe2");
  expect(data).toStrictEqual({ value: "accessible" });
});
it("should be possible to access the `this` object within a modifying route (mod first)", async () => {
  const original = { value: "accessible data 1" };
  @Route("checkthis_b")
  class Testing {
    @Shared(original)
    public data: any;

    @Modifies("d.anything")
    @Route("child")
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(new WebsocketRequest("checkthis_b.child", null, conn));
  const data = await conn.awaitMessage("m.checkthis_b.child");
  expect(data).toStrictEqual(original);
});
it("should be possible to access the `this` object within a modifying route (route first)", async () => {
  const original = { value: "accessible data" };
  @Route("checkthis_a")
  class Testing {
    @Shared(original)
    public data: any;

    @Route("child")
    @Modifies("d.anything")
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(new WebsocketRequest("checkthis_a.child", null, conn));
  const data = await conn.awaitMessage("m.checkthis_a.child");
  expect(data).toStrictEqual(original);
});
it("should be possible to access the `this` object within a modifying standalone route (route first)", async () => {
  const original = { value: "accessible data" };
  class Testing {
    @Shared(original)
    public data: any;

    @StandaloneRoute("check_s_a")
    @Modifies("d.anything")
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(new WebsocketRequest("check_s_a", null, conn));
  const data = await conn.awaitMessage("m.check_s_a");
  expect(data).toStrictEqual(original);
});
it("should be possible to access the `this` object within a modifying standalone route (mod first)", async () => {
  const original = { value: "accessible data" };
  class Testing {
    @Shared(original)
    public data: any;

    @Modifies("d.anything")
    @StandaloneRoute("check_s_a")
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(new WebsocketRequest("check_s_a", null, conn));
  const data = await conn.awaitMessage("m.check_s_a");
  expect(data).toStrictEqual(original);
});

it("should be possible to access the `this` object within a requestable subscribing outbound (sub first)", async () => {
  class Testing {
    @Shared({ value: "accessible" })
    content: any;

    @SubscribeChanges
    @Outbound("r.subscribe1", true)
    send() {
      return this.content;
    }
  }

  expect(Testing).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendSingleOutboundByMethod("r.subscribe1", conn);

  const data = await conn.awaitMessage("r.subscribe1");
  expect(data).toStrictEqual({ value: "accessible" });
});
it("should be possible to access the `this` object within a requestable subscribing outbound (out first)", async () => {
  class Testing {
    @Shared({ value: "accessible" })
    content: any;

    @Outbound("r.subscribe2", true)
    @SubscribeChanges
    send() {
      return this.content;
    }
  }

  expect(Testing).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();

  WebsocketOutbounds.sendSingleOutboundByMethod("r.subscribe2", conn);

  const data = await conn.awaitMessage("r.subscribe2");
  expect(data).toStrictEqual({ value: "accessible" });
});

it("should be possible to create multiple @SubscribeChanges per class", async () => {
  class Testing {
    @SubscribeChanges
    @Outbound("subm.1")
    m1() {
      return 1;
    }
    @SubscribeChanges
    @Outbound("subm.2")
    m2() {
      return 2;
    }
  }
  expect(Testing).toBeDefined();
});
