import { Route, WebsocketConnection } from "../../../../src";
import { WebsocketRequest } from "../../../../src/server/websocket/message/request";
import { WebsocketRoute } from "../../../../src/server/websocket/routing/route";
import { WebsocketMocks } from "../../websocket-mocks";

const conn = new WebsocketConnection(null as any);

it("should be possible to create a route", () => {
  class target {
    constructor() {}
    f() {}
  }

  const route = new WebsocketRoute("testing", {
    target: target.prototype,
    propertyKey: "f",
  });
  expect(route).toBeTruthy();
});
it("should recect when creating a route containing a .", (d) => {
  class target {
    constructor() {}
    f() {}
  }

  try {
    expect(
      new WebsocketRoute("testing.fail", {
        target: target.prototype,
        propertyKey: "f",
      })
    ).toThrow();
  } catch (e) {
    d();
  }
});
it("should be possible to call the func method", (d) => {
  class target {
    constructor() {}
    f() {
      d();
    }
  }

  const route = new WebsocketRoute("testing", {
    target: target.prototype,
    propertyKey: "f",
  });
  expect(route).toBeTruthy();
  expect(route.Func).toBeTruthy();
  if (route.Func) route.Func(null, null as any);
});

describe("accessor testing", () => {
  class target {
    constructor() {}
    f() {}
  }
  const route = new WebsocketRoute("testing", {
    target: target.prototype,
    propertyKey: "f",
  });
  it("should be possible to get the method of a route", () => {
    expect(route.Method).toBe("testing");
    expect(route.Children).toHaveLength(0);
    expect(route.Func).toBeDefined();
    route.Method = "test1";
    expect(route.Method).toBe("test1");
  });
  it("should throw when a route method is modified and the new method contains the separator", (d) => {
    try {
      route.Method = "test.test";
    } catch (e) {
      d();
    }
  });
});
describe("children management", () => {
  class target {
    f1() {}
    f2(data: any) {
      expect(data).toEqual({ in: "here" });
      return { value: "anything" };
    }
  }

  const route = new WebsocketRoute("testing", {
    target: target.prototype,
    propertyKey: "f1",
  });
  const child = new WebsocketRoute("child", {
    target: target.prototype,
    propertyKey: "f2",
  });
  it("should be possible to add a child to a route", async () => {
    route.addChild(child);
    const conn = WebsocketMocks.getConnectionStub();

    const res = await route.route(
      new WebsocketRequest("testing.child", { in: "here" }, conn),
      ["testing", "child"]
    );
    expect(res).toBeTruthy();

    const data = await conn.awaitMessage("m.testing.child");
    expect(data).toStrictEqual({ value: "anything" });
  });
});

it("should be possible to access `this` inside methods", () => {
  class target {
    private data: string = "init";
    get() {
      return this.data;
    }
    set(data: any) {
      this.data = data;
      this.update();
    }
    private update() {
      this.data = this.data + this.data;
    }
  }

  const get = new WebsocketRoute("get", {
    target: target.prototype,
    propertyKey: "get",
  });
  const set = new WebsocketRoute("set", {
    target: target.prototype,
    propertyKey: "set",
  });

  expect(get.Func(null, conn)).toBe("init");
  expect(get.Func(null, conn)).toBe("init");
  set.Func("update", conn);
  expect(get.Func(null, conn)).toBe("updateupdate");
});
