import { Modifies, Outbound, Subscribe, WebsocketRequest } from "../../../src";
import {
  Route,
  StandaloneRoute,
} from "../../../src/decorators/websocket/route";
import { WebsocketRouter } from "../../../src/server/websocket/routing/router";
import { WebsocketMocks } from "../../server/websocket-mocks";

it("should be possible to annotate a class", () => {
  @Route("annotation1")
  class Testing {}

  expect(Testing).toBeDefined();
  expect(
    WebsocketRouter.Routes.filter((r) => r.Method == "annotation1")
  ).toHaveLength(1);
});

it("should be possible to annotate a method", () => {
  @Route("annotation2")
  class Testing {
    @Route("child")
    func() {}
  }

  expect(Testing).toBeDefined();
  const base = WebsocketRouter.Routes.filter((r) => r.Method == "annotation2");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(1);
  expect(base[0].Children[0].Method).toBe("child");
});

it("should be possible to add a class to another base route", () => {
  @Route("parent1")
  class Base {}
  @Route("sub", "parent1")
  class Sub {
    @Route("child")
    func() {}
  }

  expect(Base).toBeDefined();
  expect(Sub).toBeDefined();

  const base = WebsocketRouter.Routes.filter((r) => r.Method == "parent1");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(1);
  expect(base[0].Children[0].Method).toBe("sub");
  expect(base[0].Children[0].Children).toHaveLength(1);
  expect(base[0].Children[0].Children[0].Method).toBe("child");
});

it("should not be possible to set a base-route for methods", () => {
  expect(() => {
    @Route("parent2")
    class Base {}
    @Route("parent3")
    class Sub {
      @Route("child", "parent2")
      func() {}
    }
    expect(Base).toBeDefined();
    expect(Sub).toBeDefined();
  }).toThrow("Base-Route is not supported for method annotations");
});
it("should throw when creating a class to another base route when that route does not exist yet", () => {
  expect(() => {
    @Route("sub", "parent4")
    class Sub {
      @Route("child")
      func() {}
    }
    expect(Sub).not.toBeUndefined();
  }).toThrow('Websocket Routing: Could not find route by method "parent4"');
});

it("should be possible to decorate multiple methods within a route", () => {
  @Route("testingmultiple")
  class Testing {
    @Route("m1")
    method1() {}

    @Route("m2")
    method2() {}
  }
  expect(Testing).toBeDefined();

  const base = WebsocketRouter.Routes.filter(
    (r) => r.Method == "testingmultiple"
  );
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(2);
});

it("should be possible to call any method", async () => {
  @Route("parent5")
  class Testing {
    @Route("m1")
    method1() {
      return 1;
    }

    @Route("m2")
    method2() {
      return 2;
    }
  }
  expect(Testing).toBeDefined();

  const base = WebsocketRouter.Routes.filter((r) => r.Method == "parent5");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(2);

  const conn = WebsocketMocks.getConnectionStub();
  const router = new WebsocketRouter();

  router.route(new WebsocketRequest("parent5.m2", null, conn));
  const data2 = await conn.expectMethod("m.parent5.m2");
  router.route(new WebsocketRequest("parent5.m1", null, conn));
  const data1 = await conn.expectMethod("m.parent5.m1");

  expect(data1).toBe(1);
  expect(data2).toBe(2);
});

it("should be possible to return false", async () => {
  @Route("parent6")
  class Testing {
    @Route("m1")
    method1() {
      return false;
    }
  }
  expect(Testing).toBeDefined();

  const base = WebsocketRouter.Routes.filter((r) => r.Method == "parent6");
  expect(base).toHaveLength(1);
  expect(base[0].Children).toHaveLength(1);

  const conn = WebsocketMocks.getConnectionStub();
  const router = new WebsocketRouter();

  await router.route(new WebsocketRequest("parent6.m1", null, conn));
  const data1 = await conn.expectMethod("m.parent6.m1");
  expect(data1).toBe(false);
});

it("should be possible to create a standalone routed method", () => {
  class Testing {
    @StandaloneRoute("standalone.r1")
    async route() {
      return { value: "ok-standalone" };
    }
  }
  expect(Testing).toBeDefined();
  expect(
    WebsocketRouter.StandaloneRoutes.filter((r) => r.Method == "standalone.r1")
  ).toHaveLength(1);
});

it("should be possible to call a standalone routed method", async () => {
  class Testing {
    @StandaloneRoute("standalone.r2")
    async route() {
      return { value: "ok-standalone" };
    }
  }
  expect(Testing).toBeDefined();
  expect(
    WebsocketRouter.StandaloneRoutes.filter((r) => r.Method == "standalone.r2")
  ).toHaveLength(1);
  const conn = WebsocketMocks.getConnectionStub();
  const router = new WebsocketRouter();

  router.route(new WebsocketRequest("standalone.r2", null, conn));
  const data = await conn.expectMethod("m.standalone.r2");
  expect(data).toStrictEqual({ value: "ok-standalone" });
});

it("should be possible to access the `this` object within a route", async () => {
  @Route("parent7")
  class Testing {
    public data: any = { value: "accessible data" };

    @Route("child")
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(new WebsocketRequest("parent7.child", null, conn));
  const data = await conn.expectMethod("m.parent7.child");
  expect(data).toStrictEqual({ value: "accessible data" });
});
it("should be possible to access the `this` object within a standalone route", async () => {
  class Testing {
    public data: any = { value: "accessible data" };

    @StandaloneRoute("standalone.r3")
    child() {
      return this.data;
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  await router.route(new WebsocketRequest("standalone.r3", null, conn));
  const data = await conn.expectMethod("m.standalone.r3");
  expect(data).toStrictEqual({ value: "accessible data" });
});

it("should be possible to modify a shared variable", async () => {
  @Route("parent8")
  class SharedModificationTesting {
    private value: number = 1;

    private valueCopy: number = 2;

    @Route("modify")
    @Modifies("d.parent8")
    modify(value: number) {
      this.value = value;
      this.valueCopy = value + 1;
    }

    @Outbound("d.parent8")
    @Subscribe
    send() {
      expect(this.valueCopy).toBe(this.value + 1);
      return this.value;
    }
  }
  expect(SharedModificationTesting).toBeDefined();

  const conn = WebsocketMocks.getConnectionStub();

  const data = await conn.expectMethod("d.parent8");
  expect(data).toStrictEqual(1);
  const router = new WebsocketRouter();
  router.route(new WebsocketRequest("parent8.modify", 5, conn));
  const updated = await conn.expectMethod("d.parent8");
  expect(updated).toBe(5);
  const res = await conn.expectMethod("m.parent8.modify");
  expect(res).toBeUndefined();
});

it("should be possible to get a standalone route by method", () => {
  class Testing {
    @StandaloneRoute("standalone.route.by.method")
    async route() {
      return { value: "ok-standalone" };
    }
  }
  expect(Testing).toBeDefined();
  expect(
    WebsocketRouter.getRouteByMethod("standalone.route.by.method")
  ).toBeDefined();
});

describe("error management", () => {
  it("should send a m.error when a route throws an string", async () => {
    @Route("parent9")
    class Testing {
      @Route("m1")
      func() {
        throw new String("I am an error");
      }
    }
    expect(Testing).toBeDefined();
    const router = new WebsocketRouter();
    const conn = WebsocketMocks.getConnectionStub();
    try {
      await router.route(new WebsocketRequest("parent9.m1", null, conn));
      expect(await conn.expectMethod("m.error")).toBe("I am an error");
    } catch (e) {}
  });
  it("should send a m.error when a route throws an error", async () => {
    @Route("parent10")
    class Testing {
      @Route("m1")
      func() {
        throw Error("I am an error");
      }
    }
    expect(Testing).toBeDefined();
    const router = new WebsocketRouter();
    const conn = WebsocketMocks.getConnectionStub();
    try {
      await router.route(new WebsocketRequest("parent10.m1", null, conn));
      expect(await conn.expectMethod("m.error")).toBe("I am an error");
    } catch (e) {}
  });

  it("should send a m.error when a standalone route throws an string", async () => {
    class Testing {
      @StandaloneRoute("standalone.r4")
      func() {
        throw new Error("I am an error");
      }
    }
    expect(Testing).toBeDefined();
    const router = new WebsocketRouter();
    const conn = WebsocketMocks.getConnectionStub();
    try {
      await router.route(new WebsocketRequest("standalone.r4", null, conn));

      expect(await conn.expectMethod("m.error")).toBe("I am an error");
    } catch (e) {}
  });
  it("should send a m.error when a standalone route throws an error", async () => {
    class Testing {
      @StandaloneRoute("standalone.r5")
      func() {
        throw Error("I am an error");
      }
    }
    expect(Testing).toBeDefined();
    const router = new WebsocketRouter();
    const conn = WebsocketMocks.getConnectionStub();
    try {
      await router.route(new WebsocketRequest("standalone.r5", null, conn));
      expect(await conn.expectMethod("m.error")).toBe("I am an error");
    } catch (e) {}
  });
});

it("should be possible to access the `this.method()` object within a standalone route", async () => {
  class Testing {
    private method() {
      return "data";
    }

    @StandaloneRoute("standalone.r6")
    child() {
      return this.method();
    }
  }
  expect(Testing).toBeDefined();
  const router = new WebsocketRouter();
  const conn = WebsocketMocks.getConnectionStub();

  router.route(new WebsocketRequest("standalone.r6", null, conn));
  const data = await conn.expectMethod("m.standalone.r6");
  expect(data).toStrictEqual(data);
});

describe("route duplicate label checks", () => {
  it("should raise an error when a two routes with the same method are registered", () => {
    expect(() => {
      @Route("parent11")
      class Testing {
        @Route("route")
        route1() {}

        @Route("route")
        route2() {}
      }
      expect(Testing).toBeDefined();
    }).toThrow(
      "Two routes have been registered using the same method (parent11.route)"
    );

    expect(() => {
      @Route("parent12")
      class Testing1 {}
      expect(Testing1).toBeDefined();
      @Route("parent12")
      class Testing2 {}
      expect(Testing2).toBeDefined();
    }).toThrow(
      "Two routes have been registered using the same method (parent12)"
    );

    expect(() => {
      class Testing {
        @StandaloneRoute("standalone.r7")
        route1() {}
        @StandaloneRoute("standalone.r7")
        route2() {}
      }
      expect(Testing).toBeDefined();
    }).toThrow(
      "Two routes have been registered using the same method (standalone.r7)"
    );

    expect(() => {
      @Route("parent13")
      class Testing {
        @Route("route")
        route1() {}
        @StandaloneRoute("parent13.route")
        route2() {}
      }
      expect(Testing).toBeDefined();
    }).toThrow(
      "Two routes have been registered using the same method (parent13.route)"
    );

    expect(() => {
      class Testing1 {
        @StandaloneRoute("parent13.route")
        route2() {}
      }
      @Route("parent13")
      class Testing2 {
        @Route("route")
        route1() {}
      }
      expect(Testing1).toBeDefined();
      expect(Testing2).toBeDefined();
    }).toThrow(
      "Two routes have been registered using the same method (parent13.route)"
    );
  });
});
