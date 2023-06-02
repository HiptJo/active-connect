import { WebsocketConnection } from "../../../../src";
import { testEach } from "../../../../src/jest";
import { WebsocketRequest } from "../../../../src/server/websocket/message/request";
import {
  WebsocketRoute,
  StandaloneWebsocketRoute,
} from "../../../../src/server/websocket/routing/route";
import { WebsocketMocks } from "../../websocket-mocks";

const conn = new WebsocketConnection(null as any);

describe("default route", () => {
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
  it("should recect when creating a route containing a .", async () => {
    class target {
      f() {}
    }

    await expect(async () => {
      new WebsocketRoute("testing.fail", {
        target: target.prototype,
        propertyKey: "f",
      });
    }).rejects.toThrow(
      'Websocket Routing: method must not contain a separator "." in method "testing.fail"'
    );
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

  it("should return null when accessing func if no target is defined", async () => {
    const conn = WebsocketMocks.getConnectionStub();

    const f1 = new WebsocketRoute("testing", {
      target: null,
      propertyKey: "",
    });
    const f2 = new WebsocketRoute("testing", null as any);
    expect(f1.Func).toBeNull();
    expect(f2.Func).toBeNull();

    await expect(
      f2.route(new WebsocketRequest("testing", null, conn), ["testing"])
    ).rejects.toThrow('Websocket: Function not defined for route "testing"');
  });

  describe("request routing", () => {
    class target {
      f1() {
        return -1;
      }
      child() {
        return -2;
      }
    }
    const route = new WebsocketRoute("f1", {
      target: target.prototype,
      propertyKey: "f1",
    });
    const child = new WebsocketRoute("child", {
      target: target.prototype,
      propertyKey: "child",
    });
    route.addChild(child);

    it("should be possible to route the request", async () => {
      const conn = WebsocketMocks.getConnectionStub();

      await route.route(new WebsocketRequest("f1", {}, conn), ["f1"]);
      expect(await conn.awaitMessage("m.f1")).toBeTruthy();
      expect(
        await route.route(new WebsocketRequest("f1.child", {}, conn), [
          "f1",
          "child",
        ])
      ).toBeTruthy();
      expect(await conn.awaitMessage("m.f1.child")).toBe(-2);

      // this route is not defined, should return false
      expect(
        await route.route(new WebsocketRequest("f1.404", {}, conn), [
          "f1",
          "404",
        ])
      ).toBeFalsy();
    });
  });

  describe("error handling", () => {
    const conn = WebsocketMocks.getConnectionStub();

    class target {
      async f1() {
        throw Error("...");
      }
      async f2() {
        throw "...";
      }
    }
    const route1 = new WebsocketRoute("f1", {
      target: target.prototype,
      propertyKey: "f1",
    });
    const route2 = new WebsocketRoute("f2", {
      target: target.prototype,
      propertyKey: "f2",
    });

    testEach<WebsocketRoute>(
      [route1, route2],
      ["f1", "f2"],
      (route: WebsocketRoute, label: string) => {
        it(
          "should not resolve the promise when " + label + " failed",
          async () => {
            route.route(
              new WebsocketRequest(label, null, conn),
              label.split(".")
            );
            expect(await conn.awaitMessage("m.error")).toBe("...");

            conn.awaitMessage("m." + label).then(() => {
              fail(
                "Message response has been sent even though a exception has been thrown"
              );
            });
          }
        );
      }
    );
  });

  it.todo(
    "should not return a response if the request does not have sufficcient permissions"
  );
});

describe("standalone route", () => {
  it("should be possible to create a route", () => {
    class target {
      constructor() {}
      f() {}
    }

    const route = new StandaloneWebsocketRoute("testing.t", {
      target: target.prototype,
      propertyKey: "f",
    });
    expect(route).toBeTruthy();
  });
  it("should be possible to call the func method", (d) => {
    class target {
      constructor() {}
      f() {
        d();
      }
    }

    const route = new StandaloneWebsocketRoute("testing.t", {
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
    const route = new StandaloneWebsocketRoute("testing.t", {
      target: target.prototype,
      propertyKey: "f",
    });
    it("should be possible to get the method of a route", () => {
      expect(route.Method).toBe("testing.t");
      expect(route.Children).toHaveLength(0);
      expect(route.Func).toBeDefined();
      route.Method = "test1";
      expect(route.Method).toBe("test1");
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

    const route = new StandaloneWebsocketRoute("testing.t", {
      target: target.prototype,
      propertyKey: "f1",
    });
    const child = new WebsocketRoute("child", {
      target: target.prototype,
      propertyKey: "f2",
    });
    it("should not be possible to add a child to a route", async () => {
      await expect(async () => {
        route.addChild(child);
      }).rejects.toThrow("child");
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

    const get = new StandaloneWebsocketRoute("get", {
      target: target.prototype,
      propertyKey: "get",
    });
    const set = new StandaloneWebsocketRoute("set", {
      target: target.prototype,
      propertyKey: "set",
    });

    expect(get.Func(null, conn)).toBe("init");
    expect(get.Func(null, conn)).toBe("init");
    set.Func("update", conn);
    expect(get.Func(null, conn)).toBe("updateupdate");
  });

  it("should return null when accessing func if no target is defined", async () => {
    const conn = WebsocketMocks.getConnectionStub();

    const f1 = new StandaloneWebsocketRoute("testing", {
      target: null,
      propertyKey: "",
    });
    const f2 = new StandaloneWebsocketRoute("testing", null as any);
    expect(f1.Func).toBeNull();
    expect(f2.Func).toBeNull();

    await expect(
      f2.route(new WebsocketRequest("testing", null, conn), ["testing"])
    ).rejects.toThrow('Websocket: Function not defined for route "testing"');
  });

  describe("request routing", () => {
    class target {
      f1() {
        return -1;
      }
      child() {
        return -2;
      }
    }
    const route = new StandaloneWebsocketRoute("f1.t", {
      target: target.prototype,
      propertyKey: "f1",
    });

    it("should be possible to route the request", async () => {
      const conn = WebsocketMocks.getConnectionStub();

      await route.route(new WebsocketRequest("f1.t", {}, conn), ["f1"]);
      expect(await conn.awaitMessage("m.f1.t")).toBeTruthy();

      // this route is not defined, should return false
      expect(
        await route.route(new WebsocketRequest("f1", {}, conn), ["f1"])
      ).toBeFalsy();
    });
  });

  describe("error handling", () => {
    const conn = WebsocketMocks.getConnectionStub();

    class target {
      async f1() {
        throw Error("...");
      }
      async f2() {
        throw "...";
      }
    }
    const route1 = new StandaloneWebsocketRoute("f1.t", {
      target: target.prototype,
      propertyKey: "f1",
    });
    const route2 = new StandaloneWebsocketRoute("f2.t", {
      target: target.prototype,
      propertyKey: "f2",
    });

    testEach<WebsocketRoute>(
      [route1, route2],
      ["f1.t", "f2.t"],
      (route: WebsocketRoute, label: string) => {
        it(
          "should not resolve the promise when " + label + " failed",
          async () => {
            route.route(
              new WebsocketRequest(label, null, conn),
              label.split(".")
            );
            expect(await conn.awaitMessage("m.error")).toBe("...");

            conn.awaitMessage("m." + label).then(() => {
              fail(
                "Message response has been sent even though a exception has been thrown"
              );
            });
          }
        );
      }
    );
  });

  it.todo(
    "should not return a response if the request does not have sufficcient permissions"
  );
});
