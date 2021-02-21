import {
  Modifies,
  Shared,
  SubscribeChanges,
  Outbound,
} from "../../../src/active-connect";
import {
  Route,
  StandaloneRoute,
} from "../../../src/decorators/websocket/route";
import { WebsocketConnection } from "../../../src/server/websocket/connection/connection";
import { WebsocketRequest } from "../../../src/server/websocket/message/request";
import { WebsocketOutbound } from "../../../src/server/websocket/routing/outbound";
import { WebsocketRouter } from "../../../src/server/websocket/routing/router";
import { WebsocketMocks } from "../../server/websocket-mocks";

it("should be possible to annotate a class", () => {
  @Route("annotationtesting1")
  class Testing {}

  expect(Testing).toBeDefined();
  expect(
    WebsocketRouter.Routes.filter((r) => r.Method == "annotationtesting1")
  ).toHaveLength(1);
});

it("should be possible to annotate a method", () => {
  @Route("annotesting2")
  class Testing {
    @Route("child")
    func(data: any, conn: WebsocketConnection) {}
  }

  expect(Testing).toBeDefined();
  const base = WebsocketRouter.Routes.filter((r) => r.Method == "annotesting2");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(1);
  expect(base[0].Children[0].Method).toBe("child");
});

it("should be possible to add a class to another base route", () => {
  @Route("testingbase1")
  class Base {}
  @Route("sub", "testingbase1")
  class Sub {
    @Route("child")
    func(data: any, conn: WebsocketConnection) {}
  }

  expect(Base).toBeDefined();
  expect(Sub).toBeDefined();

  const base = WebsocketRouter.Routes.filter((r) => r.Method == "testingbase1");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(1);
  expect(base[0].Children[0].Method).toBe("sub");
  expect(base[0].Children[0].Children).toHaveLength(1);
  expect(base[0].Children[0].Children[0].Method).toBe("child");
});

it("should be possible to add a method to another base route", () => {
  @Route("testingbase2")
  class Base {}
  @Route("another")
  class Sub {
    @Route("child", "testingbase2")
    func(data: any, conn: WebsocketConnection) {}
  }

  expect(Base).toBeDefined();
  expect(Sub).toBeDefined();

  const base = WebsocketRouter.Routes.filter((r) => r.Method == "testingbase2");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(1);
  expect(base[0].Children[0].Method).toBe("child");
  expect(base[0].Children[0].Children).toHaveLength(0);
});
it("should throw when creating a class to another base route when that route does not exist yet", (d) => {
  try {
    @Route("another", "testingbase3")
    class Sub {
      @Route("child")
      func(data: any, conn: WebsocketConnection) {}
    }
    expect(Sub).not.toBeUndefined();
  } catch (e) {
    d();
  }
});
it("should throw when creating a method to another base route when that route does not exist yet", (d) => {
  try {
    @Route("another")
    class Sub {
      @Route("child", "testingbase4")
      func(data: any, conn: WebsocketConnection) {}
    }
    expect(Sub).not.toBeDefined();
  } catch (e) {
    d();
  }
});

it("should be possible to decorate multiple methods within a route", () => {
  @Route("testingmultiple")
  class Testing {
    @Route("m1")
    method1(data: any, conn: WebsocketConnection) {}

    @Route("m2")
    method2(data: any, conn: WebsocketConnection) {}
  }
  expect(Testing).toBeDefined();

  const base = WebsocketRouter.Routes.filter(
    (r) => r.Method == "testingmultiple"
  );
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(2);
});

it("should be possible to call any method", async () => {
  @Route("testingmultiple1")
  class Testing {
    @Route("m1")
    method1(data: any, conn: WebsocketConnection) {
      return 1;
    }

    @Route("m2")
    method2(data: any, conn: WebsocketConnection) {
      return 2;
    }
  }
  expect(Testing).toBeDefined();

  const base = WebsocketRouter.Routes.filter(
    (r) => r.Method == "testingmultiple1"
  );
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(2);

  const conn = WebsocketMocks.getConnectionStub();
  const router = new WebsocketRouter();

  await router.route(new WebsocketRequest("testingmultiple1.m2", null, conn));
  await router.route(new WebsocketRequest("testingmultiple1.m1", null, conn));
  const data1 = await conn.awaitMessage("m.testingmultiple1.m1");
  const data2 = await conn.awaitMessage("m.testingmultiple1.m2");

  expect(data1).toBe(1);
  expect(data2).toBe(2);
});

it("should be possible to create a standalone routed method", () => {
  class Testing {
    @StandaloneRoute("standalone.route")
    async route(data: any, conn: WebsocketConnection) {
      return { value: "ok-standalone" };
    }
  }
  expect(Testing).toBeDefined();
  expect(
    WebsocketRouter.StandaloneRoutes.filter(
      (r) => r.Method == "standalone.route"
    )
  ).toHaveLength(1);
});

it("should be possible to call a standalone routed method", async () => {
  class Testing {
    @StandaloneRoute("standalone.call")
    async route(data: any, conn: WebsocketConnection) {
      return { value: "ok-standalone" };
    }
  }
  expect(Testing).toBeDefined();
  expect(
    WebsocketRouter.StandaloneRoutes.filter(
      (r) => r.Method == "standalone.route"
    )
  ).toHaveLength(1);
  const conn = WebsocketMocks.getConnectionStub();
  const router = new WebsocketRouter();

  router.route(new WebsocketRequest("standalone.route", null, conn));
  const data = await conn.awaitMessage("m.standalone.route");
  expect(data).toStrictEqual({ value: "ok-standalone" });
});

it("should be possible to access the `this` object within a route", async () => {
  const original = { value: "accessible data" };
  @Route("checkthis1")
  class Testing {
    @Shared(original)
    public data: any;

    @Route("child")
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(new WebsocketRequest("checkthis1.child", null, conn));
  const data = await conn.awaitMessage("m.checkthis1.child");
  expect(data).toStrictEqual(original);
});
it("should be possible to access the `this` object within a standalone route", async () => {
  const original = { value: "accessible data" };
  class Testing {
    @Shared(original)
    public data: any;

    @StandaloneRoute("check1.standalone")
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(new WebsocketRequest("check1.standalone", null, conn));
  const data = await conn.awaitMessage("m.check1.standalone");
  expect(data).toStrictEqual(original);
});

it.only("should be possible to modify a shared variable", async () => {
  @Route("modification")
  class SharedModificationTesting {
    @Shared(1)
    private value: number;

    @Modifies("d.modification")
    @Route("modify")
    modify(value: number) {
      this.value = value;
    }

    @Outbound("d.modification")
    @SubscribeChanges
    send() {
      return this.value;
    }
  }
  expect(SharedModificationTesting).toBeDefined();

  const out = new WebsocketOutbound();
  const conn = WebsocketMocks.getConnectionStub();

  out.sendToConnection(conn);

  const data = await conn.awaitMessage("d.modification");
  expect(data).toStrictEqual(1);
  const router = new WebsocketRouter();
  router.route(new WebsocketRequest("modification.modify", 5, conn));
  const res = await conn.awaitMessage("m.modification.modify");
  expect(res).toBeUndefined();
  const updated = await conn.awaitMessage("d.modification");
  expect(updated).toBe(5);
});
